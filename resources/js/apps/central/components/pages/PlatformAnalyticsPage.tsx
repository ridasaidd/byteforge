/**
 * Central (Platform) Analytics Dashboard — Sub-phase 9.5
 *
 * Shows platform-wide analytics for superadmin / admin:
 *   • Total platform events KPI card
 *   • Events by type — BarChart (shadcn + recharts)
 *   • Revenue placeholder (Phase 10)
 *
 * Date range: 7d / 30d / 90d tabs.
 * Data source: GET /api/superadmin/analytics/overview
 * Required permission: view platform analytics
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Activity, DollarSign, TrendingUp } from 'lucide-react';

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

  const { data, isLoading, isError } = useQuery({
    queryKey: ['analytics', 'platform', 'overview', preset],
    queryFn:  () => analyticsApi.getPlatformOverview(from, to),
    staleTime: 5 * 60 * 1000,
  });

  const byTypeData = data
    ? Object.entries(data.data.by_type)
        .map(([type, count]: [string, number]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
    : [];

  const isEmpty = !isLoading && byTypeData.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Platform Analytics"
          description="Platform-wide event overview across all tenants"
        />
        <RangeSelector value={preset} onChange={setPreset} />
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Platform Events"
          value={data?.data.total_events ?? 0}
          description={`Last ${preset} — platform-level only`}
          icon={Activity}
          loading={isLoading}
        />
        <StatCard
          title="Tenant Events"
          value={data?.data.by_type['tenant.created'] ?? 0}
          description="New tenants created"
          icon={TrendingUp}
          loading={isLoading}
        />
        {/* Phase 10 placeholder */}
        <Card className="opacity-60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">—</div>
            <p className="text-xs text-muted-foreground mt-1">Available in Phase 10</p>
          </CardContent>
        </Card>
      </div>

      {/* Platform events by type */}
      <Card>
        <CardHeader>
          <CardTitle>Platform events by type</CardTitle>
          <CardDescription>
            {data
              ? `${data.period.from} → ${data.period.to} · tenant_id = null events only`
              : 'Loading…'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && <Skeleton className="h-48 w-full" />}

          {isError && (
            <p className="text-sm text-destructive py-8 text-center">
              Failed to load platform analytics. Check your permissions.
            </p>
          )}

          {isEmpty && !isError && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Activity className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">No platform events in the selected period.</p>
              <p className="text-xs mt-1">Try selecting a wider date range or create some tenants.</p>
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
                <YAxis
                  type="category"
                  dataKey="type"
                  tickLine={false}
                  axisLine={false}
                  width={160}
                  tickFormatter={(v: string) => v}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="count"
                  fill="var(--color-count)"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
