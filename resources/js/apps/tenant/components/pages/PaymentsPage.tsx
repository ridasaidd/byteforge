import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCcw, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useToast } from '@/shared/hooks';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { paymentsApi } from '@/shared/services/api';
import type { PaymentProviderCode } from '@/shared/services/api/types';
import { PageHeader } from '@/shared/components/molecules/PageHeader';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';

const PROVIDERS: Array<PaymentProviderCode | ''> = ['', 'stripe', 'swish', 'klarna'];

function getErrorMessage(error: unknown, fallback: string): string {
  const apiError = error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
  const firstFieldError = apiError.response?.data?.errors
    ? Object.values(apiError.response.data.errors)[0]?.[0]
    : null;

  return firstFieldError || apiError.response?.data?.message || fallback;
}

function formatAmount(amount: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

export function PaymentsPage() {
  const { t, i18n } = useTranslation('billing');
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();
  const canRefund = hasPermission('payments.refund');

  const [provider, setProvider] = useState<PaymentProviderCode | ''>('');
  const [status, setStatus] = useState('');
  const [refundPaymentId, setRefundPaymentId] = useState<number | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['tenant-payments', provider, status],
    queryFn: async () => {
      const response = await paymentsApi.list({
        provider: provider || undefined,
        status: status || undefined,
        per_page: 50,
      });
      return response;
    },
  });

  const rows = useMemo(() => data?.data || [], [data]);

  const selectedPayment = useMemo(
    () => rows.find((row) => row.id === refundPaymentId) || null,
    [rows, refundPaymentId]
  );

  const refundMutation = useMutation({
    mutationFn: () => {
      if (!refundPaymentId) {
        throw new Error(t('no_payment_selected'));
      }

      const parsedAmount = Number(refundAmount);
      if (!Number.isInteger(parsedAmount) || parsedAmount <= 0) {
        throw new Error(t('refund_amount_positive_integer'));
      }

      return paymentsApi.refund(refundPaymentId, {
        amount: parsedAmount,
        reason: refundReason || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-payments'] });
      toast({
        title: t('refund_processed_title'),
        description: t('refund_processed_description'),
      });
      setRefundPaymentId(null);
      setRefundAmount('');
      setRefundReason('');
    },
    onError: (error: unknown) => {
      toast({
        title: t('refund_failed_title'),
        description: getErrorMessage(error, t('refund_failed_description')),
        variant: 'destructive',
      });
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader title={t('tenant_payments_title')} description={t('tenant_payments_description')} />

      <Card>
        <CardHeader>
          <CardTitle>{t('filters')}</CardTitle>
          <CardDescription>{t('filters_description')}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="provider_filter">{t('provider')}</Label>
            <select
              id="provider_filter"
              value={provider}
              onChange={(e) => setProvider(e.target.value as PaymentProviderCode | '')}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {PROVIDERS.map((p) => (
                <option key={p || 'all'} value={p}>
                  {p ? t(`provider_${p}`) : t('all_providers')}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status_filter">{t('status')}</Label>
            <Input
              id="status_filter"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              placeholder={t('status_placeholder')}
            />
          </div>

          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['tenant-payments'] });
              }}
            >
              <RefreshCcw className="h-4 w-4 me-2" />
              {t('refresh')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('payment_history')}</CardTitle>
          <CardDescription>{t('payment_records_found', { count: data?.meta.total || 0 })}</CardDescription>
        </CardHeader>
        <CardContent>
          {!canRefund && (
            <p className="text-sm text-muted-foreground mb-3">
              {t('refund_permission_required')}
            </p>
          )}

          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t('loading_payments')}</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('no_payments_found')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('id')}</TableHead>
                  <TableHead>{t('provider')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead>{t('amount')}</TableHead>
                  <TableHead>{t('customer')}</TableHead>
                  <TableHead>{t('created')}</TableHead>
                  <TableHead className="text-end">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">#{row.id}</TableCell>
                    <TableCell className="capitalize">{t(`provider_${row.provider}`)}</TableCell>
                    <TableCell>
                      <Badge variant={row.status === 'completed' ? 'default' : 'outline'}>{row.status}</Badge>
                    </TableCell>
                    <TableCell>{formatAmount(row.amount, row.currency, i18n.language)}</TableCell>
                    <TableCell>{row.customer_email || row.customer_name || t('na')}</TableCell>
                    <TableCell>{new Date(row.created_at).toLocaleString(i18n.language)}</TableCell>
                    <TableCell className="text-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={!canRefund}
                        onClick={() => {
                          setRefundPaymentId(row.id);
                          setRefundAmount(String(row.amount));
                          setRefundReason('');
                        }}
                      >
                        <RotateCcw className="h-4 w-4 me-1" />
                        {t('refund')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={refundPaymentId !== null} onOpenChange={(open) => !open && setRefundPaymentId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('refund_payment')}</DialogTitle>
            <DialogDescription>
              {selectedPayment
                ? `${t('issue_refund_for_payment')} #${selectedPayment.id} (${formatAmount(selectedPayment.amount, selectedPayment.currency, i18n.language)}).`
                : t('select_payment_to_refund')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="refund_amount">{t('amount_minor_units')}</Label>
              <Input
                id="refund_amount"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder="1000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="refund_reason">{t('refund_reason_optional')}</Label>
              <Input
                id="refund_reason"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder={t('refund_reason_placeholder')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundPaymentId(null)}>
              {t('cancel')}
            </Button>
            <Button onClick={() => refundMutation.mutate()} disabled={refundMutation.isPending}>
              {refundMutation.isPending ? t('processing') : t('submit_refund')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
