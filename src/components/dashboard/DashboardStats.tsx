import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, MessageSquare, TrendingUp, Zap, Calendar, CalendarDays } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import type { DashboardStats as DashboardStatsType } from '@/hooks/useDashboardStats';

interface StatsCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  colorClass: string;
  tooltip?: string;
}

function StatsCard({ title, value, subtitle, icon, colorClass, tooltip }: StatsCardProps) {
  const content = (
    <Card className="transition-all duration-200 hover:shadow-lg hover:-translate-y-1 cursor-default">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className={`p-3 rounded-xl ${colorClass}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

function StatsCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-12 w-12 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  );
}

interface DashboardStatsProps {
  stats: DashboardStatsType;
  isLoading: boolean;
}

export function DashboardStats({ stats, isLoading }: DashboardStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
        {[...Array(4)].map((_, i) => (
          <StatsCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
        <StatsCard
          title="Total de Campanhas"
          value={stats.totalCampaigns}
          subtitle={`${stats.activeCampaigns} ativas agora`}
          icon={<BarChart3 className="h-6 w-6 text-primary-foreground" />}
          colorClass="bg-primary"
          tooltip="Número total de campanhas criadas"
        />
        <StatsCard
          title="Enviadas Hoje"
          value={stats.messagesToday}
          subtitle={`${stats.messagesThisWeek} esta semana`}
          icon={<MessageSquare className="h-6 w-6 text-primary-foreground" />}
          colorClass="bg-primary"
          tooltip="Mensagens enviadas com sucesso hoje"
        />
        <StatsCard
          title="Taxa de Sucesso"
          value={`${stats.successRate}%`}
          subtitle={`${stats.totalSent} enviados / ${stats.totalFailed} falhas`}
          icon={<TrendingUp className="h-6 w-6 text-primary-foreground" />}
          colorClass="bg-primary"
          tooltip="Porcentagem de mensagens enviadas com sucesso"
        />
        <StatsCard
          title="Campanhas Ativas"
          value={stats.activeCampaigns}
          subtitle={stats.activeCampaigns > 0 ? "Em andamento" : "Nenhuma ativa"}
          icon={<Zap className="h-6 w-6 text-primary-foreground" />}
          colorClass="bg-primary"
          tooltip="Campanhas sendo enviadas agora"
        />
      </div>
    </TooltipProvider>
  );
}
