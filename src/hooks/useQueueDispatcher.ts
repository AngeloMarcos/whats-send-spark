import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
export interface QueueItem {
  id: string;
  contact_name: string | null;
  contact_phone: string;
  status: 'pending' | 'sent' | 'error' | 'excluded';
  error_message?: string;
  sent_at?: string;
}

export interface DispatcherState {
  campaignId: string | null;
  queue: QueueItem[];
  currentContact: QueueItem | null;
  sentCount: number;
  failedCount: number;
  excludedCount: number;
  skippedCount: number;
  totalContacts: number;
  isRunning: boolean;
  isPaused: boolean;
  nextSendTime: number | null;
  intervalSeconds: number;
  recentlySent: QueueItem[];
  recentErrors: { contact: QueueItem; error: string }[];
  recentSkipped: QueueItem[];
}

const INITIAL_STATE: DispatcherState = {
  campaignId: null,
  queue: [],
  currentContact: null,
  sentCount: 0,
  failedCount: 0,
  excludedCount: 0,
  skippedCount: 0,
  totalContacts: 0,
  isRunning: false,
  isPaused: false,
  nextSendTime: null,
  intervalSeconds: 30,
  recentlySent: [],
  recentErrors: [],
  recentSkipped: [],
};

export const useQueueDispatcher = () => {
  const [state, setState] = useState<DispatcherState>(INITIAL_STATE);
  const { toast } = useToast();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Safe setState that checks if component is still mounted
  const safeSetState = useCallback((updater: React.SetStateAction<DispatcherState>) => {
    if (isMountedRef.current) {
      setState(updater);
    }
  }, []);

  // Cleanup on unmount - clear all timers and refs
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      
      // Clear all timers
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  // Check for duplicate contacts already sent in previous campaigns
  const checkDuplicates = useCallback(async (phones: string[]): Promise<Set<string>> => {
    try {
      const { data } = await supabase
        .from('campaign_queue')
        .select('contact_phone')
        .in('contact_phone', phones)
        .eq('status', 'sent');
      
      return new Set(data?.map(d => d.contact_phone) || []);
    } catch (error) {
      console.error('Error checking duplicates:', error);
      return new Set();
    }
  }, []);

  // Initialize queue for a campaign
  const initializeQueue = useCallback(async (
    campaignId: string,
    contacts: Array<{ name?: string; phone: string; [key: string]: unknown }>,
    intervalSeconds: number,
    skipDuplicates: boolean = true,
    scheduledAt?: string | null
  ) => {
    try {
      let contactsToSend = contacts;
      let excludedCount = 0;

      // Check for duplicates if enabled
      if (skipDuplicates) {
        const phones = contacts.map(c => c.phone);
        const alreadySent = await checkDuplicates(phones);
        
        if (alreadySent.size > 0) {
          contactsToSend = contacts.filter(c => !alreadySent.has(c.phone));
          excludedCount = contacts.length - contactsToSend.length;
          
          if (excludedCount > 0) {
            toast({
              title: 'Duplicatas encontradas',
              description: `${excludedCount} contatos já foram enviados anteriormente e serão ignorados.`,
            });
          }
        }
      }

      if (contactsToSend.length === 0) {
        toast({
          title: 'Nenhum contato para enviar',
          description: 'Todos os contatos já foram enviados em campanhas anteriores.',
          variant: 'destructive',
        });
        return false;
      }

      // Insert contacts into campaign_queue
      const queueItems = contactsToSend.map((contact) => ({
        campaign_id: campaignId,
        contact_name: contact.name || null,
        contact_phone: contact.phone,
        contact_data: JSON.parse(JSON.stringify(contact)),
        status: 'pending',
      }));

      // Insert in chunks
      const chunkSize = 100;
      for (let i = 0; i < queueItems.length; i += chunkSize) {
        const chunk = queueItems.slice(i, i + chunkSize);
        const { error } = await supabase
          .from('campaign_queue')
          .insert(chunk);
        
        if (error) throw error;
      }

      // Fetch inserted items to get real IDs
      const { data: insertedItems } = await supabase
        .from('campaign_queue')
        .select('id, contact_name, contact_phone')
        .eq('campaign_id', campaignId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      const queueWithRealIds: QueueItem[] = insertedItems?.map(item => ({
        id: item.id,
        contact_name: item.contact_name,
        contact_phone: item.contact_phone,
        status: 'pending' as const,
      })) || [];

      // Determine initial status based on scheduling
      const initialStatus = scheduledAt ? 'scheduled' : 'sending';

      // Update campaign with interval and schedule
      await supabase
        .from('campaigns')
        .update({ 
          send_interval_minutes: Math.ceil(intervalSeconds / 60),
          status: initialStatus,
          contacts_total: contactsToSend.length,
          scheduled_at: scheduledAt || null,
        })
        .eq('id', campaignId);

      // If scheduled, don't start processing yet
      if (scheduledAt) {
        setState({
          ...INITIAL_STATE,
          campaignId,
          totalContacts: contactsToSend.length,
          excludedCount,
          intervalSeconds,
          isRunning: false,
          queue: queueWithRealIds,
        });

        sonnerToast.success('Campanha agendada!', {
          description: `Disparo programado para ${new Date(scheduledAt).toLocaleString('pt-BR')}`,
        });

        return true;
      }

      setState({
        ...INITIAL_STATE,
        campaignId,
        totalContacts: contactsToSend.length,
        excludedCount,
        intervalSeconds,
        isRunning: true,
        queue: queueWithRealIds,
      });

      // Notification: Campaign started
      sonnerToast.info('Campanha iniciada', {
        description: `Enviando para ${contactsToSend.length} contatos`,
      });

      return true;
    } catch (error) {
      console.error('Error initializing queue:', error);
      toast({
        title: 'Erro ao iniciar fila',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast, checkDuplicates]);

  // Process next contact in queue
  const processNext = useCallback(async () => {
    if (!state.campaignId || state.isPaused) return;

    try {
      const { data, error } = await supabase.functions.invoke('process-queue', {
        body: {
          campaignId: state.campaignId,
          action: 'process_next',
        },
      });

      if (error) throw error;

      // Handle paused response from edge function
      if (data.paused) {
        setState(prev => ({ 
          ...prev, 
          isPaused: true,
          nextSendTime: null,
        }));
        sonnerToast.info('Campanha pausada', {
          description: 'A campanha foi pausada. Clique em Retomar para continuar.',
        });
        return;
      }

      if (data.done) {
        // Queue is complete
        setState(prev => ({
          ...prev,
          isRunning: false,
          currentContact: null,
          nextSendTime: null,
        }));

        // Notification: Campaign completed
        sonnerToast.success('Campanha concluída!', {
          description: `Todos os ${state.totalContacts} contatos foram processados.`,
        });

        return;
      }

      if (data.skipped) {
        // Contact was skipped (duplicate)
        const skippedContact: QueueItem = {
          id: data.skipped.id || 'unknown',
          contact_name: data.skipped.name || null,
          contact_phone: data.skipped.phone || 'unknown',
          status: 'excluded',
        };

        setState(prev => ({
          ...prev,
          skippedCount: prev.skippedCount + 1,
          currentContact: null,
          queue: prev.queue.slice(1),
          recentSkipped: [skippedContact, ...prev.recentSkipped].slice(0, 5),
          nextSendTime: data.remainingCount > 0 
            ? Date.now() + prev.intervalSeconds * 1000 
            : null,
        }));

      } else if (data.sent) {
        // Contact was sent successfully
        const sentContact: QueueItem = {
          id: data.sent.id,
          contact_name: data.sent.name,
          contact_phone: data.sent.phone,
          status: 'sent',
          sent_at: new Date().toISOString(),
        };

        setState(prev => ({
          ...prev,
          sentCount: data.sentCount,
          currentContact: null,
          queue: prev.queue.slice(1),
          recentlySent: [sentContact, ...prev.recentlySent].slice(0, 5),
          nextSendTime: data.remainingCount > 0 
            ? Date.now() + prev.intervalSeconds * 1000 
            : null,
        }));

      } else if (data.error) {
        // Contact had an error
        const errorContact: QueueItem = {
          id: data.error.id,
          contact_name: data.error.name,
          contact_phone: data.error.phone,
          status: 'error',
          error_message: data.error.message,
        };

        setState(prev => ({
          ...prev,
          failedCount: data.failedCount,
          currentContact: null,
          queue: prev.queue.slice(1),
          recentErrors: [{ contact: errorContact, error: data.error.message }, ...prev.recentErrors].slice(0, 5),
          nextSendTime: data.remainingCount > 0 
            ? Date.now() + prev.intervalSeconds * 1000 
            : null,
        }));
      }

    } catch (error) {
      console.error('Error processing queue:', error);
      toast({
        title: 'Erro ao processar fila',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  }, [state.campaignId, state.isPaused, state.totalContacts, state.intervalSeconds, toast]);

  // Timer effect
  useEffect(() => {
    if (!state.isRunning || state.isPaused || !state.campaignId) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Process immediately if no next send time (first contact)
    if (state.nextSendTime === null && state.queue.length > 0) {
      setState(prev => ({
        ...prev,
        currentContact: prev.queue[0] || null,
        nextSendTime: Date.now(),
      }));
      processNext();
      return;
    }

    // Set up interval to check if it's time to send
    timerRef.current = setInterval(() => {
      if (state.nextSendTime && Date.now() >= state.nextSendTime) {
        setState(prev => ({
          ...prev,
          currentContact: prev.queue[0] || null,
        }));
        processNext();
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [state.isRunning, state.isPaused, state.campaignId, state.nextSendTime, state.queue.length, processNext]);

  // Subscribe to realtime updates with proper cleanup
  useEffect(() => {
    if (!state.campaignId) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    try {
      channel = supabase
        .channel(`campaign-queue-${state.campaignId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'campaign_queue',
            filter: `campaign_id=eq.${state.campaignId}`,
          },
          (payload) => {
            // Check if still mounted before updating state
            if (!isMountedRef.current) return;
            
            const updatedItem = payload.new as QueueItem;
            if (updatedItem.status === 'sent') {
              safeSetState(prev => ({
                ...prev,
                queue: prev.queue.filter(q => q.id !== updatedItem.id),
              }));
            }
          }
        )
        .subscribe();
    } catch (error) {
      console.error('Error subscribing to realtime:', error);
    }

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (error) {
          console.error('Error removing channel:', error);
        }
      }
    };
  }, [state.campaignId, safeSetState]);

  // Pause
  const pause = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      isPaused: true,
      nextSendTime: null,
    }));

    // Notification: Campaign paused
    sonnerToast.warning('Campanha pausada', {
      description: 'Clique em Retomar para continuar',
    });

    if (state.campaignId) {
      supabase
        .from('campaigns')
        .update({ status: 'paused' })
        .eq('id', state.campaignId);
    }
  }, [state.campaignId]);

  // Resume
  const resume = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      isPaused: false,
      nextSendTime: Date.now(), // Process immediately on resume
    }));

    if (state.campaignId) {
      supabase
        .from('campaigns')
        .update({ status: 'sending' })
        .eq('id', state.campaignId);
    }
  }, [state.campaignId]);

  // Cancel
  const cancel = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (state.campaignId) {
      // Update campaign status
      await supabase
        .from('campaigns')
        .update({ status: 'paused' })
        .eq('id', state.campaignId);

      // Delete pending items from queue
      await supabase
        .from('campaign_queue')
        .delete()
        .eq('campaign_id', state.campaignId)
        .eq('status', 'pending');
    }

    setState(INITIAL_STATE);
  }, [state.campaignId]);

  // Reset
  const reset = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setState(INITIAL_STATE);
  }, []);

  // Exclude contact from queue
  const excludeContact = useCallback(async (queueItemId: string) => {
    try {
      // Update status in database
      const { error } = await supabase
        .from('campaign_queue')
        .update({ status: 'excluded' })
        .eq('id', queueItemId);

      if (error) throw error;

      // Update local state
      setState(prev => ({
        ...prev,
        queue: prev.queue.filter(q => q.id !== queueItemId),
        excludedCount: prev.excludedCount + 1,
      }));

      toast({
        title: 'Contato excluído',
        description: 'O contato foi removido da fila de envio.',
      });
    } catch (error) {
      console.error('Error excluding contact:', error);
      toast({
        title: 'Erro ao excluir contato',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Retry failed contacts
  const retryFailed = useCallback(async () => {
    if (!state.campaignId) return;

    try {
      // Fetch contacts with error status
      const { data: failedItems, error } = await supabase
        .from('campaign_queue')
        .select('*')
        .eq('campaign_id', state.campaignId)
        .eq('status', 'error');

      if (error) throw error;

      if (!failedItems || failedItems.length === 0) {
        toast({
          title: 'Nenhum contato com erro',
          description: 'Não há contatos para retentar.',
        });
        return;
      }

      // Update status back to 'pending'
      const { error: updateError } = await supabase
        .from('campaign_queue')
        .update({ 
          status: 'pending', 
          error_message: null 
        })
        .eq('campaign_id', state.campaignId)
        .eq('status', 'error');

      if (updateError) throw updateError;

      // Update local state
      const queueItems: QueueItem[] = failedItems.map(item => ({
        id: item.id,
        contact_name: item.contact_name,
        contact_phone: item.contact_phone,
        status: 'pending' as const,
      }));

      setState(prev => ({
        ...prev,
        queue: [...prev.queue, ...queueItems],
        failedCount: 0,
        recentErrors: [],
        isRunning: true,
        isPaused: false,
        nextSendTime: Date.now(),
      }));

      // Update campaign status
      await supabase
        .from('campaigns')
        .update({ status: 'sending' })
        .eq('id', state.campaignId);

      toast({
        title: 'Retentando envios',
        description: `${failedItems.length} contato${failedItems.length > 1 ? 's' : ''} reinserido${failedItems.length > 1 ? 's' : ''} na fila.`,
      });

    } catch (error) {
      console.error('Error retrying failed contacts:', error);
      toast({
        title: 'Erro ao retentar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  }, [state.campaignId, toast]);

  // Calculate progress
  const progress = state.totalContacts > 0
    ? Math.round(((state.sentCount + state.failedCount) / state.totalContacts) * 100)
    : 0;

  // Time remaining until next send
  const secondsUntilNext = state.nextSendTime 
    ? Math.max(0, Math.ceil((state.nextSendTime - Date.now()) / 1000))
    : 0;

  return {
    ...state,
    progress,
    secondsUntilNext,
    initializeQueue,
    pause,
    resume,
    cancel,
    reset,
    excludeContact,
    retryFailed,
    remainingCount: state.queue.length,
  };
};
