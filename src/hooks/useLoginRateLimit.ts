import { useCallback } from 'react';

interface UseLoginRateLimitReturn {
  isBlocked: boolean;
  remainingTime: number;
  attemptsRemaining: number;
  recordAttempt: (success: boolean) => void;
  reset: () => void;
}

// Rate limiting desabilitado - sempre permite login
export function useLoginRateLimit(): UseLoginRateLimitReturn {
  const recordAttempt = useCallback((_success: boolean) => {
    // Não faz nada - rate limiting desabilitado
  }, []);

  const reset = useCallback(() => {
    // Não faz nada - rate limiting desabilitado
  }, []);

  return {
    isBlocked: false,        // Nunca bloqueia
    remainingTime: 0,        // Sem tempo restante
    attemptsRemaining: 999,  // Tentativas "infinitas"
    recordAttempt,
    reset,
  };
}

// Mantido para compatibilidade
export function formatRemainingTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}
