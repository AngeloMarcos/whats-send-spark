import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { TrendingUp, PieChartIcon, BarChart3 } from 'lucide-react';
import type { DailyStats, TopCampaign, DashboardStats } from '@/hooks/useDashboardStats';

interface DashboardChartsProps {
  dailyStats: DailyStats[];
  topCampaigns: TopCampaign[];
  stats: DashboardStats;
  isLoading: boolean;
}

const COLORS = {
  success: 'hsl(var(--primary))',
  error: 'hsl(var(--destructive))',
  bar: 'hsl(var(--primary))',
};

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[200px] w-full" />
      </CardContent>
    </Card>
  );
}

export function DashboardCharts({ dailyStats, topCampaigns, stats, isLoading }: DashboardChartsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-fade-in">
        <ChartSkeleton />
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    );
  }

  const pieData = [
    { name: 'Sucesso', value: stats.totalSent, color: COLORS.success },
    { name: 'Falhas', value: stats.totalFailed, color: COLORS.error },
  ].filter(d => d.value > 0);

  const hasData = stats.totalSent > 0 || stats.totalFailed > 0;
  const hasDailyData = dailyStats.some(d => d.sent > 0 || d.failed > 0);
  const hasTopCampaigns = topCampaigns.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-fade-in">
      {/* Line Chart - Last 7 days */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Últimos 7 dias
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasDailyData ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="sent" 
                  stroke={COLORS.success}
                  strokeWidth={2}
                  dot={{ fill: COLORS.success, strokeWidth: 2, r: 3 }}
                  name="Enviados"
                />
                <Line 
                  type="monotone" 
                  dataKey="failed" 
                  stroke={COLORS.error}
                  strokeWidth={2}
                  dot={{ fill: COLORS.error, strokeWidth: 2, r: 3 }}
                  name="Falhas"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
              Nenhum dado nos últimos 7 dias
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pie Chart - Success Rate */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <PieChartIcon className="h-4 w-4 text-primary" />
            Taxa de Sucesso
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasData ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [value, '']}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value) => <span className="text-xs text-foreground">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
              Nenhum envio registrado
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bar Chart - Top Campaigns */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Top Campanhas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasTopCampaigns ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topCampaigns} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  tick={{ fontSize: 10 }}
                  width={80}
                  tickFormatter={(value) => value.length > 12 ? `${value.slice(0, 12)}...` : value}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [value, 'Enviados']}
                />
                <Bar 
                  dataKey="contacts_sent" 
                  fill={COLORS.bar}
                  radius={[0, 4, 4, 0]}
                  name="Enviados"
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
              Nenhuma campanha com envios
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
