import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseCampaignControlResult {
  pause: () => Promise<boolean>;
  resume: () => Promise<boolean>;
  isLoading: boolean;
}

export function useCampaignControl(campaignId: string | null): UseCampaignControlResult {
  const [isLoading, setIsLoading] = useState(false);

  const pause = useCallback(async () => {
    if (!campaignId) return false;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-queue', {
        body: { campaignId, action: 'pause' },
      });

      if (error) throw error;

      if (data.success) {
        toast.warning('Campanha pausada', {
          description: 'Os envios foram interrompidos temporariamente.',
        });
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error pausing campaign:', error);
      toast.error('Erro ao pausar campanha', {
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [campaignId]);

  const resume = useCallback(async () => {
    if (!campaignId) return false;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-queue', {
        body: { campaignId, action: 'resume' },
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Campanha retomada', {
          description: 'Os envios continuarão a partir de agora.',
        });
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error resuming campaign:', error);
      toast.error('Erro ao retomar campanha', {
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [campaignId]);

  return { pause, resume, isLoading };
}
