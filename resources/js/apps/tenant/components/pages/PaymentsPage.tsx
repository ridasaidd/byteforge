import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCcw, RotateCcw } from 'lucide-react';

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

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

export function PaymentsPage() {
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
        throw new Error('No payment selected.');
      }

      const parsedAmount = Number(refundAmount);
      if (!Number.isInteger(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Refund amount must be a positive integer in minor units.');
      }

      return paymentsApi.refund(refundPaymentId, {
        amount: parsedAmount,
        reason: refundReason || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-payments'] });
      toast({
        title: 'Refund processed',
        description: 'Refund request was submitted successfully.',
      });
      setRefundPaymentId(null);
      setRefundAmount('');
      setRefundReason('');
    },
    onError: (error: unknown) => {
      toast({
        title: 'Refund failed',
        description: getErrorMessage(error, 'Could not process refund.'),
        variant: 'destructive',
      });
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" description="Review transaction history and issue refunds" />

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter by provider and payment status.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="provider_filter">Provider</Label>
            <select
              id="provider_filter"
              value={provider}
              onChange={(e) => setProvider(e.target.value as PaymentProviderCode | '')}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {PROVIDERS.map((p) => (
                <option key={p || 'all'} value={p}>
                  {p || 'all providers'}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status_filter">Status</Label>
            <Input
              id="status_filter"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              placeholder="completed, pending, refunded..."
            />
          </div>

          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['tenant-payments'] });
              }}
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>{data?.meta.total || 0} payment records found.</CardDescription>
        </CardHeader>
        <CardContent>
          {!canRefund && (
            <p className="text-sm text-muted-foreground mb-3">
              Refund actions require the <code>payments.refund</code> permission.
            </p>
          )}

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading payments...</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments found for the selected filters.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">#{row.id}</TableCell>
                    <TableCell className="capitalize">{row.provider}</TableCell>
                    <TableCell>
                      <Badge variant={row.status === 'completed' ? 'default' : 'outline'}>{row.status}</Badge>
                    </TableCell>
                    <TableCell>{formatAmount(row.amount, row.currency)}</TableCell>
                    <TableCell>{row.customer_email || row.customer_name || 'n/a'}</TableCell>
                    <TableCell>{new Date(row.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
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
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Refund
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
            <DialogTitle>Refund Payment</DialogTitle>
            <DialogDescription>
              {selectedPayment
                ? `Issue a refund for payment #${selectedPayment.id} (${formatAmount(selectedPayment.amount, selectedPayment.currency)}).`
                : 'Select a payment to refund.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="refund_amount">Amount (minor units)</Label>
              <Input
                id="refund_amount"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder="1000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="refund_reason">Reason (optional)</Label>
              <Input
                id="refund_reason"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Customer request"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundPaymentId(null)}>
              Cancel
            </Button>
            <Button onClick={() => refundMutation.mutate()} disabled={refundMutation.isPending}>
              {refundMutation.isPending ? 'Processing...' : 'Submit Refund'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
