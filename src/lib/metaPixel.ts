// Meta Pixel (Facebook Pixel) type declarations and utilities

declare global {
  interface Window {
    fbq: (...args: unknown[]) => void;
    _fbq: unknown;
  }
}

export type MetaPixelEvent = 
  | 'PageView'
  | 'ViewContent'
  | 'Lead'
  | 'CompleteRegistration'
  | 'InitiateCheckout'
  | 'Purchase';

export type MetaPixelCustomEvent = 
  | 'StellaOnboardingStart'
  | 'StellaOnboardingComplete'
  | 'StellaOnboardingProgress';

export interface MetaPixelEventData {
  content_name?: string;
  content_category?: string;
  content_type?: string;
  value?: number;
  currency?: string;
  [key: string]: unknown;
}

/**
 * Track a standard Meta Pixel event
 */
export function trackEvent(event: MetaPixelEvent, data?: MetaPixelEventData): void {
  if (typeof window !== 'undefined' && window.fbq) {
    if (data) {
      window.fbq('track', event, data);
    } else {
      window.fbq('track', event);
    }
    console.log(`[MetaPixel] Tracked: ${event}`, data || '');
  }
}

/**
 * Track a custom Meta Pixel event
 */
export function trackCustomEvent(event: MetaPixelCustomEvent, data?: MetaPixelEventData): void {
  if (typeof window !== 'undefined' && window.fbq) {
    if (data) {
      window.fbq('trackCustom', event, data);
    } else {
      window.fbq('trackCustom', event);
    }
    console.log(`[MetaPixel] Tracked Custom: ${event}`, data || '');
  }
}

/**
 * Initialize Meta Pixel with a Pixel ID
 */
export function initMetaPixel(pixelId: string): void {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('init', pixelId);
    console.log(`[MetaPixel] Initialized with ID: ${pixelId}`);
  }
}
