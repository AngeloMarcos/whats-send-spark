import { Card, CardContent } from '@/components/ui/card';
import { Users, Clock, CheckCircle, XCircle, TrendingUp, Calendar } from 'lucide-react';
import type { LeadsStats as LeadsStatsType } from '@/hooks/useLeadsAdmin';

interface LeadsStatsProps {
  stats: LeadsStatsType;
  loading?: boolean;
}

export function LeadsStats({ stats, loading }: LeadsStatsProps) {
  const statCards = [
    {
      title: 'Total de Leads',
      value: stats.total,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      title: 'Pendentes',
      value: stats.byStatus['pending'] || 0,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      title: 'Novos',
      value: stats.byStatus['novo'] || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Contatados',
      value: stats.byStatus['contacted'] || 0,
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Hoje',
      value: stats.todayCount,
      icon: Calendar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Últimos 7 dias',
      value: stats.weekCount,
      icon: TrendingUp,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100'
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-20 mb-2" />
              <div className="h-8 bg-muted rounded w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {statCards.map((stat) => (
        <Card key={stat.title} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-md ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                {stat.title}
              </span>
            </div>
            <p className="text-2xl font-bold">{stat.value.toLocaleString('pt-BR')}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
