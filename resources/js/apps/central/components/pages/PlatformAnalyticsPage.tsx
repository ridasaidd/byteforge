/**
 * Central (Platform) Analytics Dashboard — Sub-phase 9.5
 *
 * Two data sources:
 *   1. GET /api/superadmin/analytics/tenants/overview — cross-tenant aggregate
 *      (all tenant events combined; shows page views, active tenants, etc.)
 *   2. GET /api/superadmin/analytics/overview — platform-level events only
 *      (tenant.created, subscription.*, platform.error, etc.)
 *
 * Date range: 7d / 30d / 90d tabs.
 * Required permission: view platform analytics
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Activity, Building2, DollarSign, TrendingUp } from 'lucide-react';

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

// ─── Chart config ─────────────────────────────────────────────────────────────

const eventChartConfig: ChartConfig = {
  count: {
    label: 'Events',
    color: 'hsl(var(--primary))',
  },
};

const platformChartConfig: ChartConfig = {
  count: {
    label: 'Events',
    color: 'hsl(var(--muted-foreground))',
  },
};

// ─── Sub-components ──────────────────────────────────────────────────────────

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
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        )}
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export function PlatformAnalyticsPage() {
  const [preset, setPreset] = useState<AnalyticsRangePreset>('30d');
  const { from, to } = rangeFromPreset(preset);

  // Aggregate across ALL tenants combined
  const { data: tenantData, isLoading: tenantLoading, isError: tenantError } = useQuery({
    queryKey: ['analytics', 'cross-tenant', 'overview', preset],
    queryFn:  () => analyticsApi.getCrossTenantOverview(from, to),
    staleTime: 5 * 60 * 1000,
  });

  // Platform-level only (tenant.created, subscription.*, etc.)
  const { data: platformData, isLoading: platformLoading } = useQuery({
    queryKey: ['analytics', 'platform', 'overview', preset],
    queryFn:  () => analyticsApi.getPlatformOverview(from, to),
    staleTime: 5 * 60 * 1000,
  });

  const tenantByTypeData = tenantData
    ? Object.entries(tenantData.data.by_type)
        .map(([type, count]: [string, number]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
    : [];

  const platformByTypeData = platformData
    ? Object.entries(platformData.data.by_type)
        .map(([type, count]: [string, number]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Platform Analytics"
          description="Aggregated view across all tenants and platform operations"
        />
        <RangeSelector value={preset} onChange={setPreset} />
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Tenant Events"
          value={tenantData?.data.total_events ?? 0}
          description={`All events across all tenants — last ${preset}`}
          icon={Activity}
          loading={tenantLoading}
        />
        <StatCard
          title="Active Tenants"
          value={tenantData?.data.tenant_count ?? 0}
          description="Tenants with at least one event in this period"
          icon={Building2}
          loading={tenantLoading}
        />
        <StatCard
          title="Platform Operations"
          value={platformData?.data.total_events ?? 0}
          description={`tenant.created, subscription.* and similar — last ${preset}`}
          icon={TrendingUp}
          loading={platformLoading}
        />
      </div>

      {/* Cross-tenant events by type */}
      <Card>
        <CardHeader>
          <CardTitle>Tenant events by type</CardTitle>
          <CardDescription>
            {tenantData
              ? `${tenantData.period.from} → ${tenantData.period.to} · ${tenantData.data.tenant_count} active tenant${tenantData.data.tenant_count !== 1 ? 's' : ''}`
              : 'Loading…'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tenantLoading && <Skeleton className="h-48 w-full" />}

          {tenantError && (
            <p className="text-sm text-destructive py-8 text-center">
              Failed to load analytics. Check your permissions.
            </p>
          )}

          {!tenantLoading && !tenantError && tenantByTypeData.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Activity className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">No tenant events in the selected period.</p>
            </div>
          )}

          {!tenantLoading && !tenantError && tenantByTypeData.length > 0 && (
            <ChartContainer config={eventChartConfig} className="h-64">
              <BarChart
                data={tenantByTypeData}
                layout="vertical"
                accessibilityLayer
                margin={{ left: 8, right: 24, top: 4, bottom: 4 }}
              >
                <CartesianGrid horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="type"
                  tickLine={false}
                  axisLine={false}
                  width={160}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Platform-level operations */}
      <Card>
        <CardHeader>
          <CardTitle>Platform operations</CardTitle>
          <CardDescription>
            {platformData
              ? `${platformData.period.from} → ${platformData.period.to} · platform-level events only`
              : 'Loading…'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {platformLoading && <Skeleton className="h-24 w-full" />}

          {!platformLoading && platformByTypeData.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No platform operations in this period.
            </p>
          )}

          {!platformLoading && platformByTypeData.length > 0 && (
            <ChartContainer config={platformChartConfig} className="h-48">
              <BarChart
                data={platformByTypeData}
                layout="vertical"
                accessibilityLayer
                margin={{ left: 8, right: 24, top: 4, bottom: 4 }}
              >
                <CartesianGrid horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="type"
                  tickLine={false}
                  axisLine={false}
                  width={200}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Phase 10 placeholder */}
      <Card className="opacity-60">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-muted-foreground">—</div>
          <p className="text-xs text-muted-foreground mt-1">Available in Phase 10 (Payments)</p>
        </CardContent>
      </Card>
    </div>
  );
}
