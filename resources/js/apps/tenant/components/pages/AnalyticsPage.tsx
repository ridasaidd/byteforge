import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Activity, BookOpen, DollarSign, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { analyticsApi, rangeFromPreset } from '@/shared/services/api/analytics';
import type { AnalyticsRangePreset } from '@/shared/services/api/types';
import { PageHeader } from '@/shared/components/molecules/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/shared/components/ui/chart';

function RangeSelector({
  value,
  onChange,
}: {
  value: AnalyticsRangePreset;
  onChange: (v: AnalyticsRangePreset) => void;
}) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as AnalyticsRangePreset)}>
      <TabsList>
        <TabsTrigger value="7d">7d</TabsTrigger>
        <TabsTrigger value="30d">30d</TabsTrigger>
        <TabsTrigger value="90d">90d</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  loading,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-bold">{value.toLocaleString()}</div>}
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

function ComingSoonCard({ title, description, icon: Icon }: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="opacity-60">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-muted-foreground">—</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

export function AnalyticsPage() {
  const [preset, setPreset] = useState<AnalyticsRangePreset>('30d');
  const { t } = useTranslation('analytics');

  const { from, to } = rangeFromPreset(preset);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['analytics', 'tenant', 'overview', preset],
    queryFn: () => analyticsApi.getTenantOverview(from, to),
    staleTime: 5 * 60 * 1000,
  });

  const byTypeData = data
    ? Object.entries(data.data.by_type)
        .map(([type, count]: [string, number]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
    : [];

  const eventChartConfig: ChartConfig = {
    count: { label: t('events_label'), color: 'hsl(var(--primary))' },
  };

  const isEmpty = !isLoading && byTypeData.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title={t('title')} description={t('description')} />
        <RangeSelector value={preset} onChange={setPreset} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t('total_events')}
          value={data?.data.total_events ?? 0}
          description={t('total_events_desc', { preset })}
          icon={Activity}
          loading={isLoading}
        />
        <StatCard
          title={t('page_views')}
          value={data?.data.by_type['page.viewed'] ?? 0}
          description={t('page_views_desc')}
          icon={Eye}
          loading={isLoading}
        />
        <ComingSoonCard title={t('bookings')} description={t('bookings_coming')} icon={BookOpen} />
        <ComingSoonCard title={t('revenue')} description={t('revenue_coming')} icon={DollarSign} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('events_by_type')}</CardTitle>
          <CardDescription>{data ? `${data.period.from} → ${data.period.to}` : t('loading')}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && <Skeleton className="h-48 w-full" />}

          {isError && (
            <p className="text-sm text-destructive py-8 text-center">{t('failed_load')}</p>
          )}

          {isEmpty && !isError && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Activity className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">{t('no_events')}</p>
              <p className="text-xs mt-1">{t('no_events_hint')}</p>
            </div>
          )}

          {!isLoading && !isError && byTypeData.length > 0 && (
            <ChartContainer config={eventChartConfig} className="h-64">
              <BarChart
                data={byTypeData}
                layout="vertical"
                accessibilityLayer
                margin={{ left: 8, right: 24, top: 4, bottom: 4 }}
              >
                <CartesianGrid horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="type" tickLine={false} axisLine={false} width={140} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
