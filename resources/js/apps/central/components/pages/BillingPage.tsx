import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, RefreshCcw } from 'lucide-react';

import { useToast } from '@/shared/hooks';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { billingApi } from '@/shared/services/api';
import { tenants } from '@/shared/services/api/tenants';
import { PageHeader } from '@/shared/components/molecules/PageHeader';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';

function getErrorMessage(error: unknown, fallback: string): string {
  const apiError = error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
  const firstFieldError = apiError.response?.data?.errors
    ? Object.values(apiError.response.data.errors)[0]?.[0]
    : null;

  return firstFieldError || apiError.response?.data?.message || fallback;
}

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function getRedirectUrl(field: string, payload: Record<string, unknown>): string | null {
  const value = payload[field];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function getStringField(field: string, payload: Record<string, unknown>): string | null {
  const value = payload[field];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function BillingPage() {
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();
  const canManageBilling = hasPermission('manage billing');

  const [tenantId, setTenantId] = useState('');
  const syncAttempted = useRef(false);

  // After returning from Stripe checkout (?checkout=success), sync subscription
  // to ensure the local DB has the subscription row even if webhook is delayed.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success' && tenantId && !syncAttempted.current) {
      syncAttempted.current = true;
      billingApi.syncSubscription(tenantId).then(() => {
        queryClient.invalidateQueries({ queryKey: ['billing-subscription', tenantId] });
        queryClient.invalidateQueries({ queryKey: ['billing-addons', tenantId] });
        toast({ title: 'Subscription synced', description: 'Plan status refreshed from Stripe.' });
        // Clean up the URL param
        const url = new URL(window.location.href);
        url.searchParams.delete('checkout');
        window.history.replaceState({}, '', url.toString());
      });
    }
  }, [tenantId, queryClient, toast]);

  const tenantsQuery = useQuery({
    queryKey: ['billing-tenant-list'],
    queryFn: async () => {
      const response = await tenants.list({ per_page: 200, page: 1 });
      return response.data;
    },
  });

  const plansQuery = useQuery({
    queryKey: ['billing-plans'],
    queryFn: async () => {
      const response = await billingApi.plans();
      return response.data;
    },
  });

  const addonsQuery = useQuery({
    queryKey: ['billing-addons', tenantId],
    queryFn: async () => {
      const response = await billingApi.addons(tenantId);
      return response.data;
    },
    enabled: tenantId.length > 0,
  });

  const subscriptionQuery = useQuery({
    queryKey: ['billing-subscription', tenantId],
    queryFn: async () => {
      const response = await billingApi.subscription(tenantId);
      return response.data;
    },
    enabled: tenantId.length > 0,
  });

  const checkoutMutation = useMutation({
    mutationFn: (planSlug: string) =>
      billingApi.checkout({
        tenant_id: tenantId,
        plan_slug: planSlug,
        success_url: `${window.location.origin}/dashboard/billing?checkout=success`,
        cancel_url: `${window.location.origin}/dashboard/billing?checkout=cancel`,
      }),
    onSuccess: (payload) => {
      const url = getRedirectUrl('checkout_url', payload);
      const mode = getStringField('mode', payload);
      const message = getStringField('message', payload);

      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }

      if (mode === 'free') {
        queryClient.invalidateQueries({ queryKey: ['billing-subscription', tenantId] });
        toast({
          title: 'Free plan selected',
          description: message || 'No Stripe checkout is required for the free plan.',
        });

        return;
      }

      toast({
        title: 'Checkout created',
        description: url ? 'Stripe Checkout opened in a new tab.' : 'Checkout session created.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Checkout failed',
        description: getErrorMessage(error, 'Could not create checkout session.'),
        variant: 'destructive',
      });
    },
  });

  const portalMutation = useMutation({
    mutationFn: () =>
      billingApi.portal({
        tenant_id: tenantId,
        return_url: `${window.location.origin}/dashboard/billing`,
      }),
    onSuccess: (payload) => {
      const url = getRedirectUrl('portal_url', payload);
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      toast({
        title: 'Billing portal ready',
        description: url ? 'Billing portal opened in a new tab.' : 'Portal URL returned by API.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Portal request failed',
        description: getErrorMessage(error, 'Could not open billing portal.'),
        variant: 'destructive',
      });
    },
  });

  const addonToggleMutation = useMutation({
    mutationFn: ({ addon, active }: { addon: string; active: boolean }) =>
      active
        ? billingApi.deactivateAddon(addon, tenantId)
        : billingApi.activateAddon(addon, tenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-addons', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['billing-subscription', tenantId] });
      toast({
        title: 'Add-on updated',
        description: 'Add-on state changed successfully.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Add-on update failed',
        description: getErrorMessage(error, 'Could not update add-on.'),
        variant: 'destructive',
      });
    },
  });

  const canActivateAddons = subscriptionQuery.data?.status === 'active';
  const currentPlanSlug = subscriptionQuery.data?.plan?.slug ?? null;

  return (
    <div className="space-y-6">
      <PageHeader title="Billing" description="Manage plans, add-ons, and Stripe portal access" />

      <Card>
        <CardHeader>
          <CardTitle>Tenant Context</CardTitle>
          <CardDescription>Select the tenant ID to manage billing data.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[1fr_auto]">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tenant_picker">Tenant</Label>
              <Select value={tenantId} onValueChange={setTenantId}>
                <SelectTrigger id="tenant_picker" className="w-full">
                  <SelectValue placeholder="Select a tenant" />
                </SelectTrigger>
                <SelectContent>
                  {(tenantsQuery.data || []).map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.name} ({tenant.domain})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenant_id">Tenant ID (manual override)</Label>
              <Input
                id="tenant_id"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                placeholder="tenant-uuid"
              />
            </div>
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => {
                if (!tenantId) return;
                queryClient.invalidateQueries({ queryKey: ['billing-addons', tenantId] });
                queryClient.invalidateQueries({ queryKey: ['billing-subscription', tenantId] });
              }}
              disabled={!tenantId}
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh Tenant Billing
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plans</CardTitle>
          <CardDescription>Available base plans for tenant subscriptions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!canManageBilling && (
            <p className="text-sm text-muted-foreground">
              You can view billing data, but checkout, add-on changes, and portal actions require <code>manage billing</code>.
            </p>
          )}

          {plansQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading plans...</p>
          ) : (
            (plansQuery.data || []).map((plan) => {
              const isCurrentPlan = currentPlanSlug === plan.slug;

              return (
                <div key={plan.slug} className="rounded-md border p-3 flex items-center justify-between gap-4">
                  <div>
                  <p className="font-medium">{plan.name}</p>
                  <p className="text-sm text-muted-foreground">{plan.description || 'No description'}</p>
                  <p className="text-sm mt-1">{formatAmount(plan.price_monthly, plan.currency)} / month</p>
                  </div>
                  <Button
                    onClick={() => checkoutMutation.mutate(plan.slug)}
                    disabled={!tenantId || checkoutMutation.isPending || !canManageBilling || isCurrentPlan}
                    variant={isCurrentPlan ? 'outline' : 'default'}
                  >
                    {isCurrentPlan ? 'Current Plan' : 'Choose Plan'}
                  </Button>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subscription Summary</CardTitle>
          <CardDescription>Current billing status for selected tenant.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!tenantId ? (
            <p className="text-sm text-muted-foreground">Enter a tenant ID to load subscription details.</p>
          ) : subscriptionQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading subscription...</p>
          ) : subscriptionQuery.data ? (
            <>
              <p className="text-sm">
                Plan: <span className="font-medium">{subscriptionQuery.data.plan?.name || 'n/a'}</span>
              </p>
              <p className="text-sm">
                Status: <Badge variant="outline">{subscriptionQuery.data.status || 'inactive'}</Badge>
              </p>
              <p className="text-sm">
                Monthly total: {formatAmount(subscriptionQuery.data.monthly_total || 0, subscriptionQuery.data.currency || 'USD')}
              </p>
              <Button
                variant="secondary"
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending || !canManageBilling}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Stripe Portal
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No subscription data returned.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add-ons</CardTitle>
          <CardDescription>Enable or disable tenant add-ons.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {tenantId && subscriptionQuery.data && !canActivateAddons && (
            <p className="text-sm text-muted-foreground">
              Add-ons require an active paid base subscription. Select a paid plan and complete Stripe checkout first.
            </p>
          )}

          {!tenantId ? (
            <p className="text-sm text-muted-foreground">Enter a tenant ID to manage add-ons.</p>
          ) : addonsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading add-ons...</p>
          ) : (
            (addonsQuery.data || []).map((addon) => (
              <div key={addon.slug} className="rounded-md border p-3 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{addon.name}</p>
                  <p className="text-sm text-muted-foreground">{addon.description || 'No description'}</p>
                  <p className="text-sm mt-1">{formatAmount(addon.price_monthly, addon.currency)} / month</p>
                </div>
                <Button
                  variant={addon.is_purchased ? 'outline' : 'default'}
                  onClick={() => addonToggleMutation.mutate({ addon: addon.slug, active: addon.is_purchased })}
                  disabled={addonToggleMutation.isPending || !canManageBilling || (!addon.is_purchased && !canActivateAddons)}
                >
                  {addon.is_purchased ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
