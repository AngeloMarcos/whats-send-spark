import { useState, useEffect, useCallback } from 'react';

const MAX_SEARCHES = 3;
const TIME_WINDOW_MS = 60 * 1000; // 1 minute

export function useSearchRateLimit() {
  const [searchTimestamps, setSearchTimestamps] = useState<number[]>([]);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  // Clean up old timestamps and calculate remaining time
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const validTimestamps = searchTimestamps.filter(
        (ts) => now - ts < TIME_WINDOW_MS
      );
      
      if (validTimestamps.length !== searchTimestamps.length) {
        setSearchTimestamps(validTimestamps);
      }

      // Calculate remaining seconds until oldest timestamp expires
      if (validTimestamps.length >= MAX_SEARCHES) {
        const oldestTimestamp = Math.min(...validTimestamps);
        const timeUntilExpiry = TIME_WINDOW_MS - (now - oldestTimestamp);
        setRemainingSeconds(Math.ceil(timeUntilExpiry / 1000));
      } else {
        setRemainingSeconds(0);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [searchTimestamps]);

  const canSearch = searchTimestamps.length < MAX_SEARCHES;

  const recordSearch = useCallback(() => {
    setSearchTimestamps((prev) => [...prev, Date.now()]);
  }, []);

  const searchesRemaining = MAX_SEARCHES - searchTimestamps.length;

  return {
    canSearch,
    remainingSeconds,
    searchesRemaining,
    recordSearch,
  };
}
