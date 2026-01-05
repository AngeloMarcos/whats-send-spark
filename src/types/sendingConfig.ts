export interface SendingConfig {
  send_interval_seconds: number;
  randomize_interval: boolean;
  max_messages_per_hour: number;
  max_messages_per_day: number;
  allowed_start_time: string;
  allowed_end_time: string;
  allowed_days: string[];
  auto_pause_on_limit: boolean;
  send_profile: SendProfile;
}

export type SendProfile = 'conservative' | 'moderate' | 'aggressive' | 'test';

export interface SendProfileConfig {
  interval: number;
  hourly: number;
  daily: number;
  emoji: string;
  label: string;
  description: string;
}

export const SEND_PROFILES: Record<SendProfile, SendProfileConfig> = {
  conservative: { 
    interval: 60, 
    hourly: 20, 
    daily: 100, 
    emoji: '🐢', 
    label: 'Conservador',
    description: 'Mais seguro, menor risco de bloqueio'
  },
  moderate: { 
    interval: 30, 
    hourly: 40, 
    daily: 200, 
    emoji: '⚡', 
    label: 'Moderado',
    description: 'Equilíbrio entre velocidade e segurança'
  },
  aggressive: { 
    interval: 15, 
    hourly: 60, 
    daily: 300, 
    emoji: '🚀', 
    label: 'Agressivo',
    description: 'Mais rápido, maior risco de bloqueio'
  },
  test: { 
    interval: 10, 
    hourly: 5, 
    daily: 10, 
    emoji: '🧪', 
    label: 'Teste',
    description: 'Para testar o sistema'
  },
};

export const DEFAULT_SENDING_CONFIG: SendingConfig = {
  send_interval_seconds: 30,
  randomize_interval: true,
  max_messages_per_hour: 30,
  max_messages_per_day: 200,
  allowed_start_time: '08:00',
  allowed_end_time: '20:00',
  allowed_days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
  auto_pause_on_limit: true,
  send_profile: 'moderate',
};

export const WEEKDAYS = [
  { value: 'mon', label: 'Seg' },
  { value: 'tue', label: 'Ter' },
  { value: 'wed', label: 'Qua' },
  { value: 'thu', label: 'Qui' },
  { value: 'fri', label: 'Sex' },
  { value: 'sat', label: 'Sáb' },
  { value: 'sun', label: 'Dom' },
];

export interface RateLimitStatus {
  hourlyCount: number;
  dailyCount: number;
  hourlyLimit: number;
  dailyLimit: number;
  hourlyRemaining: number;
  dailyRemaining: number;
  isHourlyLimitReached: boolean;
  isDailyLimitReached: boolean;
}

export interface QueueSchedulePreview {
  totalMessages: number;
  intervalSeconds: number;
  isRandomized: boolean;
  estimatedDurationMinutes: number;
  estimatedEndTime: Date;
  msgsPerHour: number;
  estimatedDays: number;
  allowedStartTime: string;
  allowedEndTime: string;
}
