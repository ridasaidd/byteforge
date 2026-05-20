import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/shared/components/molecules/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Button } from '@/shared/components/ui/button';
import { useToast } from '@/shared/hooks/useToast';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { cmsQuotesApi } from '@/shared/services/api/quotes';

export function QuoteRequestsPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('quotes.manage');
  const [isManualRequestDialogOpen, setIsManualRequestDialogOpen] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [subjectLabel, setSubjectLabel] = useState('');
  const [requestDescription, setRequestDescription] = useState('');
  const [preferredStartAt, setPreferredStartAt] = useState('');
  const [preferredEndAt, setPreferredEndAt] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['cms-quote-requests'],
    queryFn: () => cmsQuotesApi.listRequests(),
  });

  const resetManualRequestForm = () => {
    setGuestName('');
    setGuestEmail('');
    setGuestPhone('');
    setSubjectLabel('');
    setRequestDescription('');
    setPreferredStartAt('');
    setPreferredEndAt('');
  };

  const handleManualRequestDialogChange = (open: boolean) => {
    setIsManualRequestDialogOpen(open);
    if (!open) {
      resetManualRequestForm();
    }
  };

  const createManualRequestMutation = useMutation({
    mutationFn: () => cmsQuotesApi.createRequest({
      guest_name: guestName.trim(),
      guest_email: guestEmail.trim(),
      guest_phone: guestPhone.trim() || null,
      subject_label: subjectLabel.trim() || null,
      request_description: requestDescription.trim(),
      preferred_start_at: preferredStartAt ? new Date(preferredStartAt).toISOString() : null,
      preferred_end_at: preferredEndAt ? new Date(preferredEndAt).toISOString() : null,
    }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['cms-quote-requests'] });
      resetManualRequestForm();
      setIsManualRequestDialogOpen(false);
      toast({ title: t('quotes_manual_request_created') });
      navigate(`/cms/quotes/${response.data.id}`);
    },
    onError: () => {
      toast({ title: t('quotes_manual_request_create_failed'), variant: 'destructive' });
    },
  });

  const requests = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('quotes_requests_page_title')}
        description={t('quotes_requests_page_description')}
        actions={canManage ? (
          <Button onClick={() => setIsManualRequestDialogOpen(true)}>
            {t('quotes_manual_request_open_button')}
          </Button>
        ) : null}
      />

      {canManage ? (
        <Dialog open={isManualRequestDialogOpen} onOpenChange={handleManualRequestDialogChange}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('quotes_manual_request_title')}</DialogTitle>
              <DialogDescription>{t('quotes_manual_request_description')}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="quotes-manual-name">{t('quotes_manual_guest_name_label')}</Label>
                  <Input id="quotes-manual-name" value={guestName} onChange={(event) => setGuestName(event.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="quotes-manual-email">{t('quotes_manual_guest_email_label')}</Label>
                  <Input id="quotes-manual-email" type="email" value={guestEmail} onChange={(event) => setGuestEmail(event.target.value)} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="quotes-manual-phone">{t('quotes_manual_guest_phone_label')}</Label>
                  <Input id="quotes-manual-phone" value={guestPhone} onChange={(event) => setGuestPhone(event.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="quotes-manual-subject">{t('quotes_manual_subject_label')}</Label>
                  <Input id="quotes-manual-subject" value={subjectLabel} onChange={(event) => setSubjectLabel(event.target.value)} />
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="quotes-manual-description">{t('quotes_manual_description_label')}</Label>
                <Textarea id="quotes-manual-description" value={requestDescription} onChange={(event) => setRequestDescription(event.target.value)} rows={4} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="quotes-manual-preferred-start">{t('quotes_manual_preferred_start_label')}</Label>
                  <Input id="quotes-manual-preferred-start" type="datetime-local" value={preferredStartAt} onChange={(event) => setPreferredStartAt(event.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="quotes-manual-preferred-end">{t('quotes_manual_preferred_end_label')}</Label>
                  <Input id="quotes-manual-preferred-end" type="datetime-local" min={preferredStartAt || undefined} value={preferredEndAt} onChange={(event) => setPreferredEndAt(event.target.value)} />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleManualRequestDialogChange(false)}
                disabled={createManualRequestMutation.isPending}
              >
                {t('quotes_manual_request_cancel_button')}
              </Button>
              <Button
                onClick={() => createManualRequestMutation.mutate()}
                disabled={createManualRequestMutation.isPending || guestName.trim() === '' || guestEmail.trim() === '' || requestDescription.trim() === ''}
              >
                {t('quotes_manual_request_button')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t('menu_quotes')}</CardTitle>
          <CardDescription>{t('quotes_requests_page_description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t('loading')}</p>
          ) : requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('quotes_requests_empty')}</p>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <div key={request.id} className="rounded-lg border p-4">
                  <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                    <div>
                      <Link className="font-medium hover:underline" to={`/cms/quotes/${request.id}`}>
                        {request.guest_name}
                      </Link>
                      <p className="text-sm text-muted-foreground">{request.guest_email}</p>
                    </div>
                    <p className="text-sm capitalize text-muted-foreground">{request.status}</p>
                  </div>
                  {request.subject_label ? (
                    <p className="mt-3 text-sm">{request.subject_label}</p>
                  ) : null}
                  {request.preferred_start_at || request.preferred_end_at ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {t('quotes_requested_dates_summary', {
                        start: request.preferred_start_at ? new Date(request.preferred_start_at).toLocaleString() : t('quotes_requested_dates_open_start'),
                        end: request.preferred_end_at ? new Date(request.preferred_end_at).toLocaleString() : t('quotes_requested_dates_open_end'),
                      })}
                    </p>
                  ) : null}
                  {request.booking_service ? (
                    <p className="mt-2 text-xs text-muted-foreground">{request.booking_service.name}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
