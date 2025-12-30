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
import { FileUpload } from '@/components/campaigns/FileUpload';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { DashboardCharts } from '@/components/dashboard/DashboardCharts';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SkeletonTabs, SkeletonCard } from '@/components/ui/loading-skeletons';
import { FileSpreadsheet, Link } from 'lucide-react';

export default function Campaigns() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [lists, setLists] = useState<List[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
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
    refreshStats();
  };

  const handleRefresh = () => {
    fetchData();
    refreshStats();
  };

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
              />
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
