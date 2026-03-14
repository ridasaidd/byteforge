import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, PlugZap, Save, TestTube2, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/shared/hooks/useAuth';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { useToast } from '@/shared/hooks';
import { paymentProviders } from '@/shared/services/api';
import type { PaymentProviderCode, PaymentProviderMode, TenantPaymentProvider } from '@/shared/services/api/types';
import { PageHeader } from '@/shared/components/molecules/PageHeader';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';

const PROVIDERS: PaymentProviderCode[] = ['stripe', 'swish', 'klarna'];

const CREDENTIAL_FIELDS: Record<PaymentProviderCode, Array<{ key: string; secret?: boolean }>> = {
  stripe: [
    { key: 'secret_key', secret: true },
    { key: 'publishable_key' },
    { key: 'webhook_secret', secret: true },
  ],
  swish: [
    { key: 'merchant_swish_number' },
    { key: 'certificate', secret: true },
    { key: 'private_key', secret: true },
  ],
  klarna: [
    { key: 'username' },
    { key: 'password', secret: true },
    { key: 'base_url' },
  ],
};

function defaultCredentialsFor(provider: PaymentProviderCode): Record<string, string> {
  return CREDENTIAL_FIELDS[provider].reduce<Record<string, string>>((acc, field) => {
    acc[field.key] = '';
    return acc;
  }, {});
}

function getErrorMessage(error: unknown, fallback: string): string {
  const apiError = error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
  const firstFieldError = apiError.response?.data?.errors
    ? Object.values(apiError.response.data.errors)[0]?.[0]
    : null;

  return firstFieldError || apiError.response?.data?.message || fallback;
}

export function PaymentProvidersPage() {
  const { t } = useTranslation('billing');
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const inferredTenantId = user?.tenant_id || '';
  const hasFixedTenantId = inferredTenantId.length > 0;
  const canManageProviders = hasPermission('payments.manage');

  const [tenantId, setTenantId] = useState(inferredTenantId);
  const [provider, setProvider] = useState<PaymentProviderCode>('stripe');
  const [mode, setMode] = useState<PaymentProviderMode>('test');
  const [isActive, setIsActive] = useState(true);
  const [credentials, setCredentials] = useState<Record<string, string>>(defaultCredentialsFor('stripe'));

  useEffect(() => {
    if (inferredTenantId && !tenantId) {
      setTenantId(inferredTenantId);
    }
  }, [inferredTenantId, tenantId]);

  useEffect(() => {
    setCredentials(defaultCredentialsFor(provider));
  }, [provider]);

  const { data, isLoading } = useQuery({
    queryKey: ['tenant-payment-providers'],
    queryFn: async () => {
      const response = await paymentProviders.list();
      return response.data;
    },
  });

  const providerMap = useMemo(() => {
    const map = new Map<PaymentProviderCode, TenantPaymentProvider>();
    (data || []).forEach((row) => {
      map.set(row.provider, row);
    });
    return map;
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) {
        throw new Error(t('tenant_id_required'));
      }

      if (!canManageProviders) {
        throw new Error(t('missing_manage_permission'));
      }

      if (Object.keys(credentials).length === 0) {
        throw new Error(t('at_least_one_credential_required'));
      }

      const payload = {
        tenant_id: tenantId,
        credentials,
        is_active: isActive,
        mode,
      };

      if (providerMap.has(provider)) {
        return paymentProviders.update(provider, payload);
      }

      return paymentProviders.create(provider, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-payment-providers'] });
      toast({
        title: t('provider_saved_title'),
        description: t('provider_saved_description'),
      });
    },
    onError: (error: unknown) => {
      toast({
        title: t('save_failed_title'),
        description: getErrorMessage(error, t('save_failed_description')),
        variant: 'destructive',
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) {
        throw new Error(t('tenant_id_required'));
      }

      if (!canManageProviders) {
        throw new Error(t('missing_manage_permission'));
      }

      return paymentProviders.testConnection(provider, {
        tenant_id: tenantId,
        credentials,
      });
    },
    onSuccess: (response) => {
      const valid = Boolean(response.data.valid);
      toast({
        title: valid ? t('connection_test_passed') : t('connection_test_failed'),
        description: String(response.data.message || t('provider_responded')),
        variant: valid ? 'default' : 'destructive',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: t('test_failed_title'),
        description: getErrorMessage(error, t('test_failed_description')),
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (rowProvider: PaymentProviderCode) => {
      if (!tenantId) {
        throw new Error(t('tenant_id_required'));
      }

      if (!canManageProviders) {
        throw new Error(t('missing_manage_permission'));
      }

      return paymentProviders.remove(rowProvider, tenantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-payment-providers'] });
      toast({
        title: t('provider_removed_title'),
        description: t('provider_removed_description'),
      });
    },
    onError: (error: unknown) => {
      toast({
        title: t('remove_failed_title'),
        description: getErrorMessage(error, t('remove_failed_description')),
        variant: 'destructive',
      });
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('payment_providers_title')}
        description={t('payment_providers_description')}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t('configured_providers')}</CardTitle>
          <CardDescription>
            {t('configured_providers_description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t('loading_providers')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('provider')}</TableHead>
                  <TableHead>{t('mode')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead>{t('credentials')}</TableHead>
                  <TableHead className="text-end">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PROVIDERS.map((rowProvider) => {
                  const row = providerMap.get(rowProvider);
                  const summary = row?.credentials_summary
                    ? Object.entries(row.credentials_summary)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(', ')
                    : t('not_configured');

                  return (
                    <TableRow key={rowProvider}>
                      <TableCell className="font-medium">{t(`provider_${rowProvider}`)}</TableCell>
                      <TableCell>{row?.mode ? t(`mode_${row.mode}`) : t('na')}</TableCell>
                      <TableCell>
                        {row?.is_active ? <Badge>{t('active')}</Badge> : <Badge variant="outline">{t('inactive')}</Badge>}
                      </TableCell>
                      <TableCell className="max-w-[420px] truncate text-muted-foreground">{summary}</TableCell>
                      <TableCell className="text-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!row || deleteMutation.isPending || !canManageProviders}
                          onClick={() => deleteMutation.mutate(rowProvider)}
                        >
                          <Trash2 className="h-4 w-4 me-1" />
                          {t('remove')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('configure_provider')}</CardTitle>
          <CardDescription>{t('configure_provider_description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!canManageProviders && (
            <p className="text-sm text-muted-foreground">
              {t('manage_providers_required')}
            </p>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tenant_id">{t('tenant_id')}</Label>
              <Input
                id="tenant_id"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                placeholder={t('tenant_id_placeholder')}
                disabled={hasFixedTenantId}
              />
              {hasFixedTenantId && (
                <p className="text-xs text-muted-foreground">{t('tenant_id_autofilled')}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="provider">{t('provider')}</Label>
              <select
                id="provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value as PaymentProviderCode)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                disabled={!canManageProviders}
              >
                {PROVIDERS.map((p) => (
                  <option key={p} value={p}>
                    {t(`provider_${p}`)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mode">{t('mode')}</Label>
              <select
                id="mode"
                value={mode}
                onChange={(e) => setMode(e.target.value as PaymentProviderMode)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                disabled={!canManageProviders}
              >
                <option value="test">{t('mode_test')}</option>
                <option value="live">{t('mode_live')}</option>
              </select>
            </div>

            <div className="flex items-end gap-2 pb-1">
              <input
                id="is_active"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4"
                disabled={!canManageProviders}
              />
              <Label htmlFor="is_active">{t('provider_active')}</Label>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {CREDENTIAL_FIELDS[provider].map((field) => (
              <div className="space-y-2" key={field.key}>
                <Label htmlFor={`credential_${field.key}`}>{t(field.key)}</Label>
                <Input
                  id={`credential_${field.key}`}
                  type={field.secret ? 'password' : 'text'}
                  value={credentials[field.key] || ''}
                  onChange={(e) => {
                    setCredentials((prev) => ({
                      ...prev,
                      [field.key]: e.target.value,
                    }));
                  }}
                  placeholder={t(`${field.key}_placeholder`)}
                  disabled={!canManageProviders}
                />
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !canManageProviders}>
              <Save className="h-4 w-4 me-2" />
              {saveMutation.isPending ? t('saving') : t('save_provider')}
            </Button>
            <Button
              variant="outline"
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending || !canManageProviders}
            >
              <TestTube2 className="h-4 w-4 me-2" />
              {testMutation.isPending ? t('testing') : t('test_connection')}
            </Button>
            <Button
              variant="secondary"
              disabled={!canManageProviders}
              onClick={() => {
                setCredentials(defaultCredentialsFor(provider));
                toast({
                  title: t('template_reset_title'),
                  description: t('template_reset_description'),
                });
              }}
            >
              <PlugZap className="h-4 w-4 me-2" />
              {t('reset_template')}
            </Button>
            <Badge variant="outline" className="ms-auto">
              <CheckCircle2 className="h-3 w-3 me-1" />
              {t('configured_count', { count: providerMap.size })}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
