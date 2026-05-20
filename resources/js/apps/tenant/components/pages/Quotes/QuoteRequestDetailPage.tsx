import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/shared/components/molecules/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Button } from '@/shared/components/ui/button';
import { useToast } from '@/shared/hooks/useToast';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { cmsQuotesApi } from '@/shared/services/api/quotes';

function toDateTimeLocalValue(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function latestQuoteHeading(status: string, t: (key: string) => string): string {
  switch (status) {
    case 'sent':
      return t('quotes_sent_heading');
    case 'accepted':
      return t('quotes_accepted_heading');
    case 'expired':
      return t('quotes_expired_heading');
    case 'converted':
      return t('quotes_converted_heading');
    case 'rejected':
      return t('quotes_rejected_heading');
    case 'cancelled':
      return t('quotes_cancelled_heading');
    default:
      return t('quotes_latest_quote_title');
  }
}

function latestQuoteDescription(status: string, t: (key: string) => string): string {
  switch (status) {
    case 'sent':
      return t('quotes_sent_description');
    case 'accepted':
      return t('quotes_accepted_description');
    case 'expired':
      return t('quotes_expired_description');
    case 'converted':
      return t('quotes_converted_description');
    case 'rejected':
      return t('quotes_rejected_description');
    case 'cancelled':
      return t('quotes_cancelled_description');
    default:
      return t('quotes_status_draft');
  }
}

export function QuoteRequestDetailPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const requestId = Number.parseInt(id ?? '0', 10);
  const canManage = hasPermission('quotes.manage');
  const canSend = hasPermission('quotes.send');
  const canConvert = hasPermission('quotes.convert');
  const canViewBookings = hasPermission('bookings.view');

  const [customerMessage, setCustomerMessage] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [lineLabel, setLineLabel] = useState('');
  const [lineDescription, setLineDescription] = useState('');
  const [lineQuantity, setLineQuantity] = useState('1');
  const [lineUnitPriceMinor, setLineUnitPriceMinor] = useState('0');
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['cms-quote-request', requestId],
    queryFn: () => cmsQuotesApi.getRequest(requestId),
    enabled: Number.isFinite(requestId) && requestId > 0,
  });

  const request = data?.data;
  const latestQuote = request?.latest_quote ?? null;

  const previewTotalMinor = useMemo(() => {
    const quantity = Number.parseFloat(lineQuantity);
    const unitPriceMinor = Number.parseInt(lineUnitPriceMinor, 10);
    if (!Number.isFinite(quantity) || !Number.isFinite(unitPriceMinor)) {
      return 0;
    }

    return Math.round(quantity * unitPriceMinor);
  }, [lineQuantity, lineUnitPriceMinor]);

  const createDraftMutation = useMutation({
    mutationFn: () => cmsQuotesApi.createDraftQuote(requestId, {
      currency: 'SEK',
      estimated_duration_minutes: estimatedDuration ? Number.parseInt(estimatedDuration, 10) : null,
      customer_message: customerMessage || null,
      internal_notes: internalNotes || null,
      valid_until: validUntil ? new Date(validUntil).toISOString() : null,
      line_items: [
        {
          label: lineLabel,
          description: lineDescription || null,
          quantity: Number.parseFloat(lineQuantity),
          unit_price_minor: Number.parseInt(lineUnitPriceMinor, 10),
        },
      ],
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-quote-request', requestId] });
      toast({ title: t('quotes_draft_created') });
    },
    onError: () => {
      toast({ title: t('quotes_draft_create_failed'), variant: 'destructive' });
    },
  });

  const sendQuoteMutation = useMutation({
    mutationFn: (quoteId: number) => cmsQuotesApi.sendQuote(quoteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-quote-request', requestId] });
      toast({ title: t('quotes_sent') });
    },
    onError: () => {
      toast({ title: t('quotes_send_failed'), variant: 'destructive' });
    },
  });

  const cancelQuoteMutation = useMutation({
    mutationFn: (quoteId: number) => cmsQuotesApi.cancelQuote(quoteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-quote-request', requestId] });
      toast({ title: t('quotes_cancelled') });
    },
    onError: () => {
      toast({ title: t('quotes_cancel_failed'), variant: 'destructive' });
    },
  });

  const deleteQuoteMutation = useMutation({
    mutationFn: (quoteId: number) => cmsQuotesApi.deleteQuote(quoteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-quote-request', requestId] });
      toast({ title: t('quotes_deleted') });
    },
    onError: () => {
      toast({ title: t('quotes_delete_failed'), variant: 'destructive' });
    },
  });

  const convertToBookingMutation = useMutation({
    mutationFn: (quoteId: number) => cmsQuotesApi.convertToBooking(quoteId),
    onSuccess: (response) => {
      navigate('/cms/bookings', {
        state: {
          createBookingPrefill: response.data,
        },
      });
    },
    onError: () => {
      toast({ title: t('quotes_convert_to_booking_failed'), variant: 'destructive' });
    },
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{t('loading')}</p>;
  }

  if (!request) {
    return <p className="text-sm text-muted-foreground">{t('quotes_request_not_found')}</p>;
  }

  const handleAttachmentDownload = async (attachmentId: number, fileName: string) => {
    try {
      setDownloadingAttachmentId(attachmentId);
      const blob = await cmsQuotesApi.downloadRequestAttachment(requestId, attachmentId);
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(objectUrl);
    } catch {
      toast({ title: 'Attachment download failed.', variant: 'destructive' });
    } finally {
      setDownloadingAttachmentId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('quotes_request_detail_title', { id: request.id })}
        description={t('quotes_request_detail_description')}
      />

      <Card>
        <CardHeader>
          <CardTitle>{request.guest_name}</CardTitle>
          <CardDescription>{request.guest_email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {request.subject_label ? <p>{request.subject_label}</p> : null}
          <p>{request.request_description}</p>
          {request.preferred_start_at || request.preferred_end_at ? (
            <p className="text-muted-foreground">
              {t('quotes_requested_dates_summary', {
                start: request.preferred_start_at ? new Date(request.preferred_start_at).toLocaleString() : t('quotes_requested_dates_open_start'),
                end: request.preferred_end_at ? new Date(request.preferred_end_at).toLocaleString() : t('quotes_requested_dates_open_end'),
              })}
            </p>
          ) : null}
          {request.booking_service ? (
            <p className="text-muted-foreground">{request.booking_service.name}</p>
          ) : null}
          {request.latest_quote ? (
            <p className="text-muted-foreground">
              {t('quotes_latest_draft_total', { amount: request.latest_quote.total_minor })}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {request.attachments && request.attachments.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Request attachments</CardTitle>
            <CardDescription>Private files shared with this quote request.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {request.attachments.map((attachment) => (
              <div key={attachment.id} className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <p className="font-medium">{attachment.file_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {attachment.mime_type ?? 'Unknown file type'} · {Math.max(1, Math.round(attachment.size / 1024))} KB
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => handleAttachmentDownload(attachment.id, attachment.file_name)}
                  disabled={downloadingAttachmentId === attachment.id}
                >
                  {downloadingAttachmentId === attachment.id ? 'Downloading...' : 'Download'}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {latestQuote ? (
        <Card>
          <CardHeader>
            <CardTitle>{latestQuoteHeading(latestQuote.status, t)}</CardTitle>
            <CardDescription>{latestQuoteDescription(latestQuote.status, t)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
              <p>{t('quotes_latest_quote_total', { amount: latestQuote.total_minor, currency: latestQuote.currency })}</p>
              {latestQuote.sent_at ? <p>{t('quotes_sent_at_label', { value: new Date(latestQuote.sent_at).toLocaleString() })}</p> : null}
            </div>
            {latestQuote.accepted_at ? (
              <p className="text-sm text-muted-foreground">{t('quotes_accepted_at_label', { value: new Date(latestQuote.accepted_at).toLocaleString() })}</p>
            ) : null}
            {latestQuote.rejected_at ? (
              <p className="text-sm text-muted-foreground">{t('quotes_rejected_at_label', { value: new Date(latestQuote.rejected_at).toLocaleString() })}</p>
            ) : null}
            {latestQuote.cancelled_at ? (
              <p className="text-sm text-muted-foreground">{t('quotes_cancelled_at_label', { value: new Date(latestQuote.cancelled_at).toLocaleString() })}</p>
            ) : null}
            {latestQuote.expired_at ? (
              <p className="text-sm text-muted-foreground">{t('quotes_expired_at_label', { value: new Date(latestQuote.expired_at).toLocaleString() })}</p>
            ) : null}
            {latestQuote.converted_at ? (
              <p className="text-sm text-muted-foreground">{t('quotes_converted_at_label', { value: new Date(latestQuote.converted_at).toLocaleString() })}</p>
            ) : null}
            {latestQuote.customer_message ? <p className="text-sm">{latestQuote.customer_message}</p> : null}
            <div className="space-y-3">
              {latestQuote.line_items.map((item) => (
                <div key={item.id} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">{item.label}</p>
                      {item.description ? <p className="text-sm text-muted-foreground">{item.description}</p> : null}
                    </div>
                    <p className="text-sm text-muted-foreground">{item.line_total_minor} {latestQuote.currency}</p>
                  </div>
                </div>
              ))}
            </div>
            {latestQuote.status === 'draft' && canSend ? (
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => sendQuoteMutation.mutate(latestQuote.id)}
                  disabled={sendQuoteMutation.isPending || deleteQuoteMutation.isPending}
                >
                  {t('quotes_send_button')}
                </Button>
                {canManage ? (
                  <Button
                    variant="outline"
                    onClick={() => deleteQuoteMutation.mutate(latestQuote.id)}
                    disabled={deleteQuoteMutation.isPending || sendQuoteMutation.isPending}
                  >
                    {t('quotes_delete_draft_button')}
                  </Button>
                ) : null}
              </div>
            ) : null}
            {latestQuote.status === 'sent' && canManage ? (
              <Button
                variant="outline"
                onClick={() => cancelQuoteMutation.mutate(latestQuote.id)}
                disabled={cancelQuoteMutation.isPending}
              >
                {t('quotes_cancel_button')}
              </Button>
            ) : null}
            {latestQuote.status === 'accepted' && canConvert ? (
              <Button
                onClick={() => convertToBookingMutation.mutate(latestQuote.id)}
                disabled={convertToBookingMutation.isPending}
              >
                {t('quotes_convert_to_booking_button')}
              </Button>
            ) : null}
            {latestQuote.status === 'converted' && latestQuote.converted_booking_id && canViewBookings ? (
              <Button
                variant="outline"
                onClick={() => navigate(`/cms/bookings/${latestQuote.converted_booking_id}`)}
              >
                {t('quotes_view_booking_button', { id: latestQuote.converted_booking_id })}
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t('quotes_create_draft_title')}</CardTitle>
            <CardDescription>{t('quotes_create_draft_description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="quotes-customer-message">{t('quotes_customer_message_label')}</Label>
                <Textarea id="quotes-customer-message" value={customerMessage} onChange={(event) => setCustomerMessage(event.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="quotes-internal-notes">{t('quotes_internal_notes_label')}</Label>
                <Textarea id="quotes-internal-notes" value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="quotes-estimated-duration">{t('quotes_estimated_duration_label')}</Label>
                <Input id="quotes-estimated-duration" type="number" min={1} value={estimatedDuration} onChange={(event) => setEstimatedDuration(event.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="quotes-valid-until">{t('quotes_valid_until_label')}</Label>
                <Input id="quotes-valid-until" type="datetime-local" value={toDateTimeLocalValue(validUntil)} onChange={(event) => setValidUntil(event.target.value)} />
              </div>
            </div>

            <div className="rounded-lg border p-4 space-y-4">
              <div className="grid gap-1.5">
                <Label htmlFor="quotes-line-label">{t('quotes_line_item_label')}</Label>
                <Input id="quotes-line-label" value={lineLabel} onChange={(event) => setLineLabel(event.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="quotes-line-description">{t('quotes_line_item_description_label')}</Label>
                <Textarea id="quotes-line-description" value={lineDescription} onChange={(event) => setLineDescription(event.target.value)} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="quotes-line-quantity">{t('quotes_line_item_quantity_label')}</Label>
                  <Input id="quotes-line-quantity" type="number" min="0.01" step="0.01" value={lineQuantity} onChange={(event) => setLineQuantity(event.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="quotes-line-unit-price">{t('quotes_line_item_unit_price_minor_label')}</Label>
                  <Input id="quotes-line-unit-price" type="number" min={0} value={lineUnitPriceMinor} onChange={(event) => setLineUnitPriceMinor(event.target.value)} />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{t('quotes_draft_total_preview', { amount: previewTotalMinor })}</p>
            </div>

            <Button
              onClick={() => createDraftMutation.mutate()}
              disabled={!canManage || createDraftMutation.isPending}
            >
              {t('quotes_create_draft_button')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
