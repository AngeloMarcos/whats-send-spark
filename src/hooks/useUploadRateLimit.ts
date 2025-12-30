import { useState, useEffect, useCallback } from 'react';

const MAX_UPLOADS_PER_MINUTE = 3;
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_CONTACTS_PER_FILE = 10000;
const STORAGE_KEY = 'upload_rate_limit';

interface UploadRecord {
  timestamps: number[];
}

interface UseUploadRateLimitReturn {
  canUpload: boolean;
  remainingUploads: number;
  cooldownSeconds: number;
  maxContactsPerFile: number;
  recordUpload: () => void;
  validateContactCount: (count: number) => { valid: boolean; error?: string };
}

function getStoredData(): UploadRecord {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Invalid data, reset
  }
  return { timestamps: [] };
}

function setStoredData(data: UploadRecord) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useUploadRateLimit(): UseUploadRateLimitReturn {
  const [data, setData] = useState<UploadRecord>(getStoredData);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Clean expired timestamps and calculate state
  const cleanAndCalculate = useCallback(() => {
    const now = Date.now();
    const validTimestamps = data.timestamps.filter(ts => now - ts < WINDOW_MS);
    
    // Update if different
    if (validTimestamps.length !== data.timestamps.length) {
      const newData = { timestamps: validTimestamps };
      setData(newData);
      setStoredData(newData);
    }

    const remaining = Math.max(0, MAX_UPLOADS_PER_MINUTE - validTimestamps.length);
    const canUpload = remaining > 0;

    // Calculate cooldown (time until oldest timestamp expires)
    if (!canUpload && validTimestamps.length > 0) {
      const oldestTimestamp = Math.min(...validTimestamps);
      const cooldown = Math.max(0, Math.ceil((oldestTimestamp + WINDOW_MS - now) / 1000));
      return { canUpload, remaining, cooldown };
    }

    return { canUpload, remaining, cooldown: 0 };
  }, [data.timestamps]);

  // Update cooldown timer
  useEffect(() => {
    const update = () => {
      const { cooldown } = cleanAndCalculate();
      setCooldownSeconds(cooldown);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [cleanAndCalculate]);

  const { canUpload, remaining } = cleanAndCalculate();

  const recordUpload = useCallback(() => {
    setData(prev => {
      const now = Date.now();
      const validTimestamps = prev.timestamps.filter(ts => now - ts < WINDOW_MS);
      const newData = { timestamps: [...validTimestamps, now] };
      setStoredData(newData);
      return newData;
    });
  }, []);

  const validateContactCount = useCallback((count: number) => {
    if (count > MAX_CONTACTS_PER_FILE) {
      return {
        valid: false,
        error: `Máximo de ${MAX_CONTACTS_PER_FILE.toLocaleString()} contatos por arquivo. Seu arquivo tem ${count.toLocaleString()}.`,
      };
    }
    return { valid: true };
  }, []);

  return {
    canUpload,
    remainingUploads: remaining,
    cooldownSeconds,
    maxContactsPerFile: MAX_CONTACTS_PER_FILE,
    recordUpload,
    validateContactCount,
  };
}
