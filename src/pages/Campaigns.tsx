import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { List, Template, Campaign } from '@/types/database';
import { AppLayout } from '@/components/layout/AppLayout';
import { AppHeader } from '@/components/layout/AppHeader';
import { CampaignForm } from '@/components/campaigns/CampaignForm';
import { MessagePreview } from '@/components/campaigns/MessagePreview';
import { CampaignStatus } from '@/components/campaigns/CampaignStatus';
import { CampaignHistory } from '@/components/campaigns/CampaignHistory';
import { useToast } from '@/hooks/use-toast';

export default function Campaigns() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [lists, setLists] = useState<List[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [listsRes, templatesRes, campaignsRes] = await Promise.all([
        supabase.from('lists').select('*').order('created_at', { ascending: false }),
        supabase.from('templates').select('*').order('created_at', { ascending: false }),
        supabase.from('campaigns').select('*, list:lists(*), template:templates(*)').order('created_at', { ascending: false }),
      ]);

      if (listsRes.data) setLists(listsRes.data as List[]);
      if (templatesRes.data) setTemplates(templatesRes.data as Template[]);
      if (campaignsRes.data) setCampaigns(campaignsRes.data as Campaign[]);
    } catch (error) {
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar os dados. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCampaignCreated = (campaign: Campaign) => {
    setCampaigns(prev => [campaign, ...prev]);
    setActiveCampaign(campaign);
  };

  return (
    <AppLayout>
      <AppHeader 
        title="Campanhas" 
        description="Gerencie e envie campanhas de mensagens para seus contatos via WhatsApp"
      />
      
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Campaign Form */}
          <div className="lg:col-span-2">
            <CampaignForm
              lists={lists}
              templates={templates}
              onMessageChange={setCurrentMessage}
              onCampaignCreated={handleCampaignCreated}
            />
          </div>

          {/* Preview and Status */}
          <div className="space-y-6">
            <MessagePreview message={currentMessage} />
            <CampaignStatus campaign={activeCampaign} />
          </div>
        </div>

        {/* Campaign History */}
        <div className="mt-8">
          <CampaignHistory 
            campaigns={campaigns} 
            onRefresh={fetchData}
            isLoading={isLoading}
          />
        </div>
      </div>
    </AppLayout>
  );
}