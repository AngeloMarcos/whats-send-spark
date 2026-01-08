import { supabase } from '@/integrations/supabase/client';

interface ErrorPayload {
  message: string;
  stack?: string;
  componentStack?: string;
  source: 'ErrorBoundary' | 'window.error' | 'unhandledrejection' | 'manual';
  metadata?: Record<string, unknown>;
}

// Deduplication: track recent errors to avoid spam
const recentErrors = new Map<string, number>();
const DEDUPE_WINDOW_MS = 30000; // 30 seconds
const MAX_ERRORS_PER_MINUTE = 10;
let errorsThisMinute = 0;
let lastMinuteReset = Date.now();

function getErrorKey(message: string, stack?: string): string {
  return `${message}::${(stack ?? '').slice(0, 200)}`;
}

function shouldReport(message: string, stack?: string): boolean {
  const now = Date.now();
  
  // Reset rate limit every minute
  if (now - lastMinuteReset > 60000) {
    errorsThisMinute = 0;
    lastMinuteReset = now;
  }
  
  // Check rate limit
  if (errorsThisMinute >= MAX_ERRORS_PER_MINUTE) {
    console.warn('[ErrorReporting] Rate limit reached, skipping report');
    return false;
  }
  
  // Check deduplication
  const key = getErrorKey(message, stack);
  const lastReported = recentErrors.get(key);
  if (lastReported && now - lastReported < DEDUPE_WINDOW_MS) {
    console.warn('[ErrorReporting] Duplicate error, skipping report');
    return false;
  }
  
  // Clean old entries
  for (const [k, time] of recentErrors.entries()) {
    if (now - time > DEDUPE_WINDOW_MS) {
      recentErrors.delete(k);
    }
  }
  
  recentErrors.set(key, now);
  errorsThisMinute++;
  return true;
}

export async function reportError(payload: ErrorPayload): Promise<void> {
  const { message, stack, componentStack, source, metadata = {} } = payload;
  
  if (!shouldReport(message, stack)) {
    return;
  }
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // Not logged in, just log to console
      console.error('[ErrorReporting] User not authenticated, error not saved:', message);
      return;
    }
    
    const route = typeof window !== 'undefined' ? window.location.pathname : '/';
    
    const { error } = await supabase.from('app_error_reports').insert({
      user_id: user.id,
      route,
      message: message.slice(0, 2000), // Limit message size
      stack: stack?.slice(0, 5000) ?? null,
      component_stack: componentStack?.slice(0, 5000) ?? null,
      source,
      metadata: {
        ...metadata,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        url: window.location.href,
      },
    });
    
    if (error) {
      console.error('[ErrorReporting] Failed to save error:', error);
    } else {
      console.log('[ErrorReporting] Error reported successfully');
    }
  } catch (e) {
    console.error('[ErrorReporting] Exception while reporting:', e);
  }
}

export function serializeUnknownError(e: unknown): { message: string; stack?: string } {
  if (e instanceof Error) {
    return { message: e.message, stack: e.stack };
  }
  if (typeof e === 'string') {
    return { message: e };
  }
  if (e && typeof e === 'object' && 'message' in e) {
    return { 
      message: String((e as { message: unknown }).message),
      stack: 'stack' in e ? String((e as { stack: unknown }).stack) : undefined
    };
  }
  return { message: String(e) };
}

// Install global error handlers (call once at app init)
export function installGlobalErrorHandlers(): void {
  if (typeof window === 'undefined') return;
  if ((window as unknown as { __errorHandlersInstalled?: boolean }).__errorHandlersInstalled) return;
  
  window.addEventListener('error', (event) => {
    console.error('[Global Error]', event.error);
    const { message, stack } = serializeUnknownError(event.error);
    reportError({
      message: message || event.message || 'Unknown error',
      stack,
      source: 'window.error',
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
    
    // Also save to localStorage for immediate access
    try {
      localStorage.setItem('last_runtime_error', JSON.stringify({
        message: message || 'Unknown error',
        stack: stack || '',
        timestamp: new Date().toISOString(),
      }));
    } catch {}
  });
  
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[Unhandled Rejection]', event.reason);
    const { message, stack } = serializeUnknownError(event.reason);
    reportError({
      message: message || 'Promise rejection',
      stack,
      source: 'unhandledrejection',
    });
    
    // Also save to localStorage
    try {
      localStorage.setItem('last_runtime_error', JSON.stringify({
        message: message || 'Promise rejection',
        stack: stack || '',
        timestamp: new Date().toISOString(),
      }));
    } catch {}
  });
  
  (window as unknown as { __errorHandlersInstalled: boolean }).__errorHandlersInstalled = true;
  console.log('[ErrorReporting] Global error handlers installed');
}
