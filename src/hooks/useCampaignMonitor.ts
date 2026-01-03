import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { CampaignLog } from '@/types/database';

interface ChartDataPoint {
  time: string;
  sent: number;
  errors: number;
  cumulative: number;
}

interface MonitorStats {
  totalSent: number;
  totalPending: number;
  totalErrors: number;
  successRate: number;
}

interface MonitorState {
  logs: CampaignLog[];
  chartData: ChartDataPoint[];
  stats: MonitorStats;
  isLive: boolean;
  campaign: {
    id: string;
    name: string;
    status: string;
    contacts_total: number;
    send_interval_minutes: number;
    is_test_mode: boolean;
  } | null;
}

export function useCampaignMonitor(campaignId: string | null) {
  const [state, setState] = useState<MonitorState>({
    logs: [],
    chartData: [],
    stats: {
      totalSent: 0,
      totalPending: 0,
      totalErrors: 0,
      successRate: 0,
    },
    isLive: true,
    campaign: null,
  });

  const logsRef = useRef<CampaignLog[]>([]);

  // Aggregate logs into chart data by minute
  const aggregateChartData = useCallback((logs: CampaignLog[]): ChartDataPoint[] => {
    if (logs.length === 0) return [];

    const byMinute: Record<string, { sent: number; errors: number }> = {};
    
    logs.forEach((log) => {
      if (!log.sent_at) return;
      const date = new Date(log.sent_at);
      const minute = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      
      if (!byMinute[minute]) {
        byMinute[minute] = { sent: 0, errors: 0 };
      }
      
      if (log.status === 'sent') {
        byMinute[minute].sent++;
      } else if (log.status === 'error') {
        byMinute[minute].errors++;
      }
    });

    let cumulative = 0;
    return Object.entries(byMinute)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([time, data]) => {
        cumulative += data.sent;
        return {
          time,
          sent: data.sent,
          errors: data.errors,
          cumulative,
        };
      });
  }, []);

  // Calculate stats from logs
  const calculateStats = useCallback((logs: CampaignLog[], totalContacts: number): MonitorStats => {
    const totalSent = logs.filter((l) => l.status === 'sent').length;
    const totalErrors = logs.filter((l) => l.status === 'error').length;
    const totalPending = totalContacts - totalSent - totalErrors;
    const successRate = totalSent + totalErrors > 0 
      ? Math.round((totalSent / (totalSent + totalErrors)) * 100) 
      : 0;

    return {
      totalSent,
      totalPending: Math.max(0, totalPending),
      totalErrors,
      successRate,
    };
  }, []);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    if (!campaignId) return;

    try {
      // Fetch campaign details
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('id, name, status, contacts_total, send_interval_minutes, is_test_mode')
        .eq('id', campaignId)
        .single();

      if (campaignError) throw campaignError;

      // Fetch existing logs
      const { data: logs, error: logsError } = await supabase
        .from('campaign_logs')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      if (logsError) throw logsError;

      const typedLogs = (logs || []) as CampaignLog[];
      logsRef.current = typedLogs;

      setState((prev) => ({
        ...prev,
        campaign,
        logs: typedLogs,
        chartData: aggregateChartData(typedLogs),
        stats: calculateStats(typedLogs, campaign?.contacts_total || 0),
      }));
    } catch (error) {
      console.error('Error fetching campaign monitor data:', error);
    }
  }, [campaignId, aggregateChartData, calculateStats]);

  // Set up realtime subscription
  useEffect(() => {
    if (!campaignId || !state.isLive) return;

    fetchData();

    const channel = supabase
      .channel(`campaign-logs-${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'campaign_logs',
          filter: `campaign_id=eq.${campaignId}`,
        },
        (payload) => {
          const newLog = payload.new as CampaignLog;
          console.log('New log received:', newLog);

          logsRef.current = [newLog, ...logsRef.current];

          setState((prev) => {
            const newLogs = [newLog, ...prev.logs];
            return {
              ...prev,
              logs: newLogs,
              chartData: aggregateChartData(newLogs),
              stats: calculateStats(newLogs, prev.campaign?.contacts_total || 0),
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId, state.isLive, fetchData, aggregateChartData, calculateStats]);

  // Also subscribe to campaign status changes
  useEffect(() => {
    if (!campaignId) return;

    const channel = supabase
      .channel(`campaign-status-${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'campaigns',
          filter: `id=eq.${campaignId}`,
        },
        (payload) => {
          const updated = payload.new;
          setState((prev) => ({
            ...prev,
            campaign: prev.campaign
              ? {
                  ...prev.campaign,
                  status: updated.status,
                  contacts_total: updated.contacts_total,
                }
              : null,
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId]);

  const toggleLive = useCallback(() => {
    setState((prev) => ({ ...prev, isLive: !prev.isLive }));
  }, []);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...state,
    toggleLive,
    refresh,
  };
}
