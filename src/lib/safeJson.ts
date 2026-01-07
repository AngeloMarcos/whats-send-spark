import { Json } from '@/integrations/supabase/types';

/**
 * Safe JSON utilities to prevent crashes from malformed data
 */

/**
 * Safely deep clone a value, handling non-serializable data
 * Never throws - returns null on failure
 */
export function safeJsonClone(value: unknown): Json | null {
  if (value === null || value === undefined) {
    return null;
  }

  try {
    // Handle primitives
    if (typeof value !== 'object') {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return value;
      }
      return null;
    }

    // Filter out non-serializable values
    const sanitized = JSON.stringify(value, (_, v) => {
      if (typeof v === 'function' || typeof v === 'symbol' || typeof v === 'bigint') {
        return undefined;
      }
      if (v instanceof Date) {
        return v.toISOString();
      }
      return v;
    });

    return JSON.parse(sanitized) as Json;
  } catch {
    console.warn('safeJsonClone: Failed to clone value, returning null');
    return null;
  }
}

/**
 * Safely stringify a value for logging/display
 * Never throws - returns fallback on failure
 */
export function safeStringify(value: unknown, fallback: string = '{}'): string {
  try {
    return JSON.stringify(value, null, 2) || fallback;
  } catch {
    return fallback;
  }
}

/**
 * Safely parse JSON string
 * Never throws - returns fallback on failure
 */
export function safeParse<T = unknown>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}
