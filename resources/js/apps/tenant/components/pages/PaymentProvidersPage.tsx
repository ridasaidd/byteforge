import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, PlugZap, Save, TestTube2, Trash2 } from 'lucide-react';

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

type CredentialField = {
  key: string;
  label: string;
  placeholder?: string;
  secret?: boolean;
};

const CREDENTIAL_FIELDS: Record<PaymentProviderCode, CredentialField[]> = {
  stripe: [
    { key: 'secret_key', label: 'Secret Key', placeholder: 'sk_test_...', secret: true },
    { key: 'publishable_key', label: 'Publishable Key', placeholder: 'pk_test_...' },
    { key: 'webhook_secret', label: 'Webhook Secret', placeholder: 'whsec_...', secret: true },
  ],
  swish: [
    { key: 'merchant_swish_number', label: 'Merchant Swish Number', placeholder: '4671234768' },
    { key: 'certificate', label: 'Certificate (PEM)', placeholder: '-----BEGIN CERTIFICATE-----', secret: true },
    { key: 'private_key', label: 'Private Key (PEM)', placeholder: '-----BEGIN PRIVATE KEY-----', secret: true },
  ],
  klarna: [
    { key: 'username', label: 'Username', placeholder: 'Klarna API Username' },
    { key: 'password', label: 'Password', placeholder: 'Klarna API Password', secret: true },
    { key: 'base_url', label: 'Base URL', placeholder: 'https://api.playground.klarna.com' },
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
        throw new Error('Tenant ID is required.');
      }

      if (!canManageProviders) {
        throw new Error('Missing permission: payments.manage');
      }

      if (Object.keys(credentials).length === 0) {
        throw new Error('At least one credential field is required.');
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
        title: 'Provider saved',
        description: 'Payment provider settings were updated.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Save failed',
        description: getErrorMessage(error, 'Could not save provider settings.'),
        variant: 'destructive',
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) {
        throw new Error('Tenant ID is required.');
      }

      if (!canManageProviders) {
        throw new Error('Missing permission: payments.manage');
      }

      return paymentProviders.testConnection(provider, {
        tenant_id: tenantId,
        credentials,
      });
    },
    onSuccess: (response) => {
      const valid = Boolean(response.data.valid);
      toast({
        title: valid ? 'Connection test passed' : 'Connection test failed',
        description: String(response.data.message || 'Provider responded.'),
        variant: valid ? 'default' : 'destructive',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Test failed',
        description: getErrorMessage(error, 'Could not test provider credentials.'),
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (rowProvider: PaymentProviderCode) => {
      if (!tenantId) {
        throw new Error('Tenant ID is required.');
      }

      if (!canManageProviders) {
        throw new Error('Missing permission: payments.manage');
      }

      return paymentProviders.remove(rowProvider, tenantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-payment-providers'] });
      toast({
        title: 'Provider removed',
        description: 'Payment provider config was removed.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Remove failed',
        description: getErrorMessage(error, 'Could not remove provider.'),
        variant: 'destructive',
      });
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment Providers"
        description="Configure Stripe, Swish, and Klarna credentials for this tenant"
      />

      <Card>
        <CardHeader>
          <CardTitle>Configured Providers</CardTitle>
          <CardDescription>
            Provider setup requires the Payment Processing add-on to be enabled.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading providers...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Credentials</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PROVIDERS.map((rowProvider) => {
                  const row = providerMap.get(rowProvider);
                  const summary = row?.credentials_summary
                    ? Object.entries(row.credentials_summary)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(', ')
                    : 'Not configured';

                  return (
                    <TableRow key={rowProvider}>
                      <TableCell className="font-medium capitalize">{rowProvider}</TableCell>
                      <TableCell>{row?.mode || 'n/a'}</TableCell>
                      <TableCell>
                        {row?.is_active ? <Badge>Active</Badge> : <Badge variant="outline">Inactive</Badge>}
                      </TableCell>
                      <TableCell className="max-w-[420px] truncate text-muted-foreground">{summary}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!row || deleteMutation.isPending || !canManageProviders}
                          onClick={() => deleteMutation.mutate(rowProvider)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
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
          <CardTitle>Configure Provider</CardTitle>
          <CardDescription>Save or update provider credentials with guided fields.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!canManageProviders && (
            <p className="text-sm text-muted-foreground">
              You can view providers, but updating credentials requires the <code>payments.manage</code> permission.
            </p>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tenant_id">Tenant ID</Label>
              <Input
                id="tenant_id"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                placeholder="tenant-uuid"
                disabled={hasFixedTenantId}
              />
              {hasFixedTenantId && (
                <p className="text-xs text-muted-foreground">Tenant ID is auto-filled from your session.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <select
                id="provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value as PaymentProviderCode)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                disabled={!canManageProviders}
              >
                {PROVIDERS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mode">Mode</Label>
              <select
                id="mode"
                value={mode}
                onChange={(e) => setMode(e.target.value as PaymentProviderMode)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                disabled={!canManageProviders}
              >
                <option value="test">test</option>
                <option value="live">live</option>
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
              <Label htmlFor="is_active">Provider active</Label>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {CREDENTIAL_FIELDS[provider].map((field) => (
              <div className="space-y-2" key={field.key}>
                <Label htmlFor={`credential_${field.key}`}>{field.label}</Label>
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
                  placeholder={field.placeholder}
                  disabled={!canManageProviders}
                />
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !canManageProviders}>
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? 'Saving...' : 'Save Provider'}
            </Button>
            <Button
              variant="outline"
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending || !canManageProviders}
            >
              <TestTube2 className="h-4 w-4 mr-2" />
              {testMutation.isPending ? 'Testing...' : 'Test Connection'}
            </Button>
            <Button
              variant="secondary"
              disabled={!canManageProviders}
              onClick={() => {
                setCredentials(defaultCredentialsFor(provider));
                toast({
                  title: 'Template reset',
                  description: 'Credentials template was reset.',
                });
              }}
            >
              <PlugZap className="h-4 w-4 mr-2" />
              Reset Template
            </Button>
            <Badge variant="outline" className="ml-auto">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {providerMap.size} configured
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
