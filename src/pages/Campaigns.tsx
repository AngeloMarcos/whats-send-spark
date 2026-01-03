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
import { CampaignMonitor } from '@/components/campaigns/CampaignMonitor';
import { FileUpload } from '@/components/campaigns/FileUpload';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { DashboardCharts } from '@/components/dashboard/DashboardCharts';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SkeletonTabs, SkeletonCard } from '@/components/ui/loading-skeletons';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileSpreadsheet, Link, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function Campaigns() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [lists, setLists] = useState<List[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [monitorCampaignId, setMonitorCampaignId] = useState<string | null>(null);
  
  const { stats, dailyStats, topCampaigns, isLoading: statsLoading, refresh: refreshStats } = useDashboardStats();

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
    // Open monitor for the new campaign if it's actively sending
    if (campaign.status === 'sending') {
      setMonitorCampaignId(campaign.id);
    }
    refreshStats();
  };

  const handleRefresh = () => {
    fetchData();
    refreshStats();
  };

  // Get running campaigns
  const runningCampaigns = campaigns.filter(c => c.status === 'sending');

  return (
    <AppLayout>
      <AppHeader 
        title="Campanhas" 
        description="Gerencie e envie campanhas de mensagens para seus contatos via WhatsApp"
      />
      
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Dashboard Stats */}
        <DashboardStats stats={stats} isLoading={statsLoading} />
        
        {/* Dashboard Charts */}
        <DashboardCharts 
          dailyStats={dailyStats} 
          topCampaigns={topCampaigns} 
          stats={stats}
          isLoading={statsLoading} 
        />

        {isLoading ? (
          <div className="space-y-6">
            <SkeletonTabs />
            <div className="mt-8">
              <SkeletonCard />
            </div>
          </div>
        ) : (
          <>
            <Tabs defaultValue="sheets" className="space-y-6">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="sheets" className="flex items-center gap-2">
                  <Link className="h-4 w-4" />
                  Via Google Sheets
                </TabsTrigger>
                <TabsTrigger value="upload" className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Upload de Arquivo
                </TabsTrigger>
              </TabsList>

              <TabsContent value="sheets">
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
              </TabsContent>

              <TabsContent value="upload">
                <FileUpload onCampaignCreated={handleCampaignCreated} />
              </TabsContent>
            </Tabs>

            {/* Campaign History */}
            <div className="mt-8">
              <CampaignHistory 
                campaigns={campaigns} 
                onRefresh={handleRefresh}
                isLoading={isLoading}
                onOpenMonitor={(campaignId) => setMonitorCampaignId(campaignId)}
              />
            </div>
          </>
        )}

        {/* Campaign Monitor Dialog */}
        <Dialog open={!!monitorCampaignId} onOpenChange={(open) => !open && setMonitorCampaignId(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Monitor em Tempo Real
              </DialogTitle>
            </DialogHeader>
            {monitorCampaignId && (
              <CampaignMonitor 
                campaignId={monitorCampaignId}
                onPause={() => {
                  // TODO: Implement pause via edge function
                  toast({ title: 'Pausar campanha disponível em breve' });
                }}
                onResume={() => {
                  // TODO: Implement resume via edge function
                  toast({ title: 'Retomar campanha disponível em breve' });
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Floating indicator for running campaigns */}
        {runningCampaigns.length > 0 && !monitorCampaignId && (
          <div className="fixed bottom-6 right-6 z-50">
            <button
              onClick={() => setMonitorCampaignId(runningCampaigns[0].id)}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-3 rounded-full shadow-lg hover:bg-primary/90 transition-all"
            >
              <Activity className="h-5 w-5 animate-pulse" />
              <span className="font-medium">
                {runningCampaigns.length} campanha{runningCampaigns.length > 1 ? 's' : ''} em andamento
              </span>
              <Badge variant="secondary" className="bg-white/20">
                Ver Monitor
              </Badge>
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
