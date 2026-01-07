import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface DashboardStats {
  totalCampaigns: number;
  activeCampaigns: number;
  messagesToday: number;
  messagesThisWeek: number;
  messagesThisMonth: number;
  successRate: number;
  totalSent: number;
  totalFailed: number;
}

export interface DailyStats {
  date: string;
  sent: number;
  failed: number;
}

export interface TopCampaign {
  id: string;
  name: string;
  contacts_sent: number;
}

export const useDashboardStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalCampaigns: 0,
    activeCampaigns: 0,
    messagesToday: 0,
    messagesThisWeek: 0,
    messagesThisMonth: 0,
    successRate: 0,
    totalSent: 0,
    totalFailed: 0,
  });
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [topCampaigns, setTopCampaigns] = useState<TopCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Get campaign counts
      const { data: campaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select('id, status, contacts_sent, contacts_failed, name, created_at')
        .eq('user_id', user.id);

      if (campaignsError) {
        console.error('[useDashboardStats] Error fetching campaigns:', campaignsError);
        throw campaignsError;
      }

      // Validate and normalize campaign data
      const validCampaigns = (campaigns || []).map(c => ({
        ...c,
        contacts_sent: c.contacts_sent ?? 0,
        contacts_failed: c.contacts_failed ?? 0,
        name: c.name || 'Sem nome',
      }));

      if (validCampaigns.length >= 0) {
        const totalCampaigns = validCampaigns.length;
        const activeCampaigns = validCampaigns.filter(c => c.status === 'sending').length;
        const totalSent = validCampaigns.reduce((sum, c) => sum + c.contacts_sent, 0);
        const totalFailed = validCampaigns.reduce((sum, c) => sum + c.contacts_failed, 0);
        const successRate = totalSent + totalFailed > 0 
          ? Math.round((totalSent / (totalSent + totalFailed)) * 100) 
          : 0;

        // Get top 5 campaigns by sent count
        const sortedCampaigns = [...validCampaigns]
          .sort((a, b) => b.contacts_sent - a.contacts_sent)
          .slice(0, 5)
          .filter(c => c.contacts_sent > 0);

        setTopCampaigns(sortedCampaigns.map(c => ({
          id: c.id,
          name: c.name,
          contacts_sent: c.contacts_sent,
        })));

        // Get messages by time period from campaign_queue
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        const { data: todayData } = await supabase
          .from('campaign_queue')
          .select('id', { count: 'exact' })
          .eq('status', 'sent')
          .gte('sent_at', todayStart);

        const { data: weekData } = await supabase
          .from('campaign_queue')
          .select('id', { count: 'exact' })
          .eq('status', 'sent')
          .gte('sent_at', weekStart);

        const { data: monthData } = await supabase
          .from('campaign_queue')
          .select('id', { count: 'exact' })
          .eq('status', 'sent')
          .gte('sent_at', monthStart);

        setStats({
          totalCampaigns,
          activeCampaigns,
          messagesToday: todayData?.length || 0,
          messagesThisWeek: weekData?.length || 0,
          messagesThisMonth: monthData?.length || 0,
          successRate,
          totalSent,
          totalFailed,
        });

        // Get daily stats for last 7 days
        const dailyData: DailyStats[] = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
          const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).toISOString();

          const { data: sentData } = await supabase
            .from('campaign_queue')
            .select('id', { count: 'exact' })
            .eq('status', 'sent')
            .gte('sent_at', dayStart)
            .lt('sent_at', dayEnd);

          const { data: failedData } = await supabase
            .from('campaign_queue')
            .select('id', { count: 'exact' })
            .eq('status', 'error')
            .gte('created_at', dayStart)
            .lt('created_at', dayEnd);

          dailyData.push({
            date: date.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' }),
            sent: sentData?.length || 0,
            failed: failedData?.length || 0,
          });
        }
        setDailyStats(dailyData);
      }
    } catch (error) {
      console.error('[useDashboardStats] Error fetching dashboard stats:', error);
      // Set default values on error to prevent UI crash
      setStats({
        totalCampaigns: 0,
        activeCampaigns: 0,
        messagesToday: 0,
        messagesThisWeek: 0,
        messagesThisMonth: 0,
        successRate: 0,
        totalSent: 0,
        totalFailed: 0,
      });
      setDailyStats([]);
      setTopCampaigns([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    dailyStats,
    topCampaigns,
    isLoading,
    refresh: fetchStats,
  };
};
