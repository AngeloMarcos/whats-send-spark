import { useCallback, useEffect, useRef } from 'react';
import { 
  trackEvent, 
  trackCustomEvent, 
  type MetaPixelEvent, 
  type MetaPixelCustomEvent,
  type MetaPixelEventData 
} from '@/lib/metaPixel';

interface UseMetaPixelOptions {
  trackPageViewOnMount?: boolean;
}

export function useMetaPixel(options: UseMetaPixelOptions = {}) {
  const { trackPageViewOnMount = false } = options;
  const hasTrackedPageView = useRef(false);

  useEffect(() => {
    if (trackPageViewOnMount && !hasTrackedPageView.current) {
      trackEvent('PageView');
      hasTrackedPageView.current = true;
    }
  }, [trackPageViewOnMount]);

  const trackPixelEvent = useCallback((event: MetaPixelEvent, data?: MetaPixelEventData) => {
    trackEvent(event, data);
  }, []);

  const trackPixelCustomEvent = useCallback((event: MetaPixelCustomEvent, data?: MetaPixelEventData) => {
    trackCustomEvent(event, data);
  }, []);

  // Stella IA specific tracking functions
  const trackOnboardingStart = useCallback((segment?: string) => {
    trackCustomEvent('StellaOnboardingStart', {
      content_name: 'Stella IA Onboarding',
      content_category: segment || 'Unknown',
    });
  }, []);

  const trackOnboardingProgress = useCallback((step: string, completionPercent: number) => {
    trackCustomEvent('StellaOnboardingProgress', {
      content_name: step,
      value: completionPercent,
    });
  }, []);

  const trackOnboardingComplete = useCallback((data: {
    segment: string;
    businessName: string;
  }) => {
    // Track standard Lead event
    trackEvent('Lead', {
      content_name: 'Stella IA Configuration',
      content_category: data.segment,
    });

    // Track standard CompleteRegistration
    trackEvent('CompleteRegistration', {
      content_name: data.businessName,
      content_category: data.segment,
    });

    // Track custom completion event
    trackCustomEvent('StellaOnboardingComplete', {
      content_name: data.businessName,
      content_category: data.segment,
    });
  }, []);

  return {
    trackPixelEvent,
    trackPixelCustomEvent,
    trackOnboardingStart,
    trackOnboardingProgress,
    trackOnboardingComplete,
  };
}
