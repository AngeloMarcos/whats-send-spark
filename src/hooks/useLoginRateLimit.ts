import { useState, useEffect, useCallback } from 'react';

const MAX_ATTEMPTS = 30;
const WINDOW_MS = 30 * 60 * 1000; // 30 minutes window
const BLOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutes block
const STORAGE_KEY = 'login_rate_limit';

interface RateLimitData {
  attempts: number;
  firstAttemptAt: number;
  blockedUntil: number | null;
}

interface UseLoginRateLimitReturn {
  isBlocked: boolean;
  remainingTime: number; // seconds
  attemptsRemaining: number;
  recordAttempt: (success: boolean) => void;
  reset: () => void;
}

function getStoredData(): RateLimitData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Invalid data, reset
  }
  return { attempts: 0, firstAttemptAt: 0, blockedUntil: null };
}

function setStoredData(data: RateLimitData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useLoginRateLimit(): UseLoginRateLimitReturn {
  const [data, setData] = useState<RateLimitData>(getStoredData);
  const [remainingTime, setRemainingTime] = useState(0);

  // Calculate if currently blocked
  const isBlocked = data.blockedUntil !== null && Date.now() < data.blockedUntil;
  
  // Calculate attempts remaining
  const attemptsRemaining = Math.max(0, MAX_ATTEMPTS - data.attempts);

  // Update remaining time every second when blocked
  useEffect(() => {
    if (!isBlocked) {
      setRemainingTime(0);
      return;
    }

    const updateTime = () => {
      const remaining = Math.max(0, Math.ceil((data.blockedUntil! - Date.now()) / 1000));
      setRemainingTime(remaining);
      
      // Auto-unblock when time expires
      if (remaining <= 0) {
        const newData = { attempts: 0, firstAttemptAt: 0, blockedUntil: null };
        setData(newData);
        setStoredData(newData);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [isBlocked, data.blockedUntil]);

  // Check if window has expired and reset
  useEffect(() => {
    if (data.firstAttemptAt && Date.now() - data.firstAttemptAt > WINDOW_MS && !isBlocked) {
      const newData = { attempts: 0, firstAttemptAt: 0, blockedUntil: null };
      setData(newData);
      setStoredData(newData);
    }
  }, [data.firstAttemptAt, isBlocked]);

  const recordAttempt = useCallback((success: boolean) => {
    if (success) {
      // Success - reset everything
      const newData = { attempts: 0, firstAttemptAt: 0, blockedUntil: null };
      setData(newData);
      setStoredData(newData);
      return;
    }

    // Failed attempt
    setData(prev => {
      const now = Date.now();
      
      // Check if previous window expired
      if (prev.firstAttemptAt && now - prev.firstAttemptAt > WINDOW_MS) {
        // Start new window
        const newData: RateLimitData = {
          attempts: 1,
          firstAttemptAt: now,
          blockedUntil: null,
        };
        setStoredData(newData);
        return newData;
      }

      const newAttempts = prev.attempts + 1;
      const newData: RateLimitData = {
        attempts: newAttempts,
        firstAttemptAt: prev.firstAttemptAt || now,
        blockedUntil: newAttempts >= MAX_ATTEMPTS ? now + BLOCK_DURATION_MS : null,
      };
      setStoredData(newData);
      return newData;
    });
  }, []);

  const reset = useCallback(() => {
    const newData = { attempts: 0, firstAttemptAt: 0, blockedUntil: null };
    setData(newData);
    setStoredData(newData);
  }, []);

  return {
    isBlocked,
    remainingTime,
    attemptsRemaining,
    recordAttempt,
    reset,
  };
}

// Format remaining time as "Xm Ys"
export function formatRemainingTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}
