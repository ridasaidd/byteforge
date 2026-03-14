import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Activity, Building2, DollarSign, TrendingUp } from 'lucide-react';
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

export function PlatformAnalyticsPage() {
  const [preset, setPreset] = useState<AnalyticsRangePreset>('30d');
  const { t } = useTranslation('analytics');
  const { from, to } = rangeFromPreset(preset);

  const eventChartConfig: ChartConfig = { count: { label: t('events_label'), color: 'hsl(var(--primary))' } };
  const platformChartConfig: ChartConfig = { count: { label: t('events_label'), color: 'hsl(var(--muted-foreground))' } };

  const { data: tenantData, isLoading: tenantLoading, isError: tenantError } = useQuery({
    queryKey: ['analytics', 'cross-tenant', 'overview', preset],
    queryFn: () => analyticsApi.getCrossTenantOverview(from, to),
    staleTime: 5 * 60 * 1000,
  });

  const { data: platformData, isLoading: platformLoading } = useQuery({
    queryKey: ['analytics', 'platform', 'overview', preset],
    queryFn: () => analyticsApi.getPlatformOverview(from, to),
    staleTime: 5 * 60 * 1000,
  });

  const tenantByTypeData = tenantData
    ? Object.entries(tenantData.data.by_type).map(([type, count]: [string, number]) => ({ type, count })).sort((a, b) => b.count - a.count)
    : [];

  const platformByTypeData = platformData
    ? Object.entries(platformData.data.by_type).map(([type, count]: [string, number]) => ({ type, count })).sort((a, b) => b.count - a.count)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title={t('platform_title')} description={t('platform_description')} />
        <RangeSelector value={preset} onChange={setPreset} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title={t('total_tenant_events')}
          value={tenantData?.data.total_events ?? 0}
          description={t('total_tenant_events_desc', { preset })}
          icon={Activity}
          loading={tenantLoading}
        />
        <StatCard
          title={t('active_tenants')}
          value={tenantData?.data.tenant_count ?? 0}
          description={t('active_tenants_desc')}
          icon={Building2}
          loading={tenantLoading}
        />
        <StatCard
          title={t('platform_operations')}
          value={platformData?.data.total_events ?? 0}
          description={t('platform_operations_desc', { preset })}
          icon={TrendingUp}
          loading={platformLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('tenant_events_by_type')}</CardTitle>
          <CardDescription>
            {tenantData
              ? t('tenant_events_range_other', { from: tenantData.period.from, to: tenantData.period.to, count: tenantData.data.tenant_count })
              : t('loading')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tenantLoading && <Skeleton className="h-48 w-full" />}

          {tenantError && (
            <p className="text-sm text-destructive py-8 text-center">{t('failed_load_platform')}</p>
          )}

          {!tenantLoading && !tenantError && tenantByTypeData.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Activity className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">{t('no_tenant_events')}</p>
            </div>
          )}

          {!tenantLoading && !tenantError && tenantByTypeData.length > 0 && (
            <ChartContainer config={eventChartConfig} className="h-64">
              <BarChart data={tenantByTypeData} layout="vertical" accessibilityLayer margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="type" tickLine={false} axisLine={false} width={160} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('platform_ops_title')}</CardTitle>
          <CardDescription>
            {platformData
              ? t('platform_ops_range', { from: platformData.period.from, to: platformData.period.to })
              : t('loading')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {platformLoading && <Skeleton className="h-24 w-full" />}

          {!platformLoading && platformByTypeData.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">{t('no_platform_ops')}</p>
          )}

          {!platformLoading && platformByTypeData.length > 0 && (
            <ChartContainer config={platformChartConfig} className="h-48">
              <BarChart data={platformByTypeData} layout="vertical" accessibilityLayer margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="type" tickLine={false} axisLine={false} width={200} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card className="opacity-60">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('platform_revenue')}</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-muted-foreground">—</div>
          <p className="text-xs text-muted-foreground mt-1">{t('platform_revenue_coming')}</p>
        </CardContent>
      </Card>
    </div>
  );
}
