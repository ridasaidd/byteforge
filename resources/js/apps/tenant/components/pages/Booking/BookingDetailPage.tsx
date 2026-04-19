import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { arSA, enUS, sv as svDateLocale } from 'date-fns/locale';
import { ArrowLeft, CheckCircle2, XCircle, Flag, Clock, AlertCircle, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cmsBookingApi } from '@/shared/services/api/booking';
import { tenantSettings } from '@/shared/services/api';
import type { BookingEvent } from '@/shared/services/api/booking';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { useToast } from '@/shared/hooks/useToast';
import { PageHeader } from '@/shared/components/molecules/PageHeader';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pending:          'bg-yellow-100 text-yellow-800',
  pending_hold:     'bg-purple-100 text-purple-800',
  awaiting_payment: 'bg-blue-100 text-blue-800',
  confirmed:        'bg-green-100 text-green-800',
  completed:        'bg-gray-100 text-gray-700',
  cancelled:        'bg-red-100 text-red-700',
  no_show:          'bg-orange-100 text-orange-800',
};

const SERVICE_COLORS = [
  { dot: 'bg-blue-500', softBg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' },
  { dot: 'bg-emerald-500', softBg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
  { dot: 'bg-rose-500', softBg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200' },
  { dot: 'bg-amber-500', softBg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  { dot: 'bg-violet-500', softBg: 'bg-violet-50', text: 'text-violet-800', border: 'border-violet-200' },
  { dot: 'bg-cyan-500', softBg: 'bg-cyan-50', text: 'text-cyan-800', border: 'border-cyan-200' },
];

function colorForService(serviceId: number | undefined) {
  if (!serviceId) return SERVICE_COLORS[0];
  return SERVICE_COLORS[Math.abs(serviceId) % SERVICE_COLORS.length];
}

function getDateLocale(language: string) {
  switch (language.split('-')[0]) {
    case 'sv':
      return svDateLocale;
    case 'ar':
      return arSA;
    default:
      return enUS;
  }
}

function getStatusLabel(status: string, t: (key: string) => string) {
  switch (status) {
    case 'pending':
      return t('status_pending');
    case 'pending_hold':
      return t('status_pending_hold');
    case 'awaiting_payment':
      return t('status_awaiting_payment');
    case 'confirmed':
      return t('status_confirmed');
    case 'completed':
      return t('status_completed');
    case 'cancelled':
      return t('status_cancelled');
    case 'no_show':
      return t('status_no_show');
    default:
      return status.replace(/_/g, ' ');
  }
}

function makeFormatter(dateFormat: string, timeFormat: string, dateLocale: ReturnType<typeof getDateLocale>) {
  return function fmt(iso: string | null): string {
    if (!iso) return '-';
    try { return format(parseISO(iso), `${dateFormat} ${timeFormat}`, { locale: dateLocale }); } catch { return '-'; }
  };
}

const DEFAULT_DATE_FORMAT = 'yyyy-MM-dd';
const DEFAULT_TIME_FORMAT = 'HH:mm';

// ─── Timeline ────────────────────────────────────────────────────────────────

function EventTimeline({
  events,
  fmt,
  serviceId,
  serviceName,
}: {
  events: BookingEvent[];
  fmt: (iso: string | null) => string;
  serviceId?: number;
  serviceName?: string;
}) {
  const { t } = useTranslation('booking');

  if (!events.length) return <p className="text-sm text-muted-foreground">{t('no_events_yet')}</p>;
  const color = colorForService(serviceId);

  return (
    <ol className="relative border-l border-muted ml-2">
      {[...events].reverse().map(ev => (
        <li key={ev.id} className="ml-4 mb-4">
          <div className="absolute -left-1.5 mt-1 w-3 h-3 rounded-full bg-primary/70" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{fmt(ev.created_at)}</span>
            {serviceName && (
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] ${color.softBg} ${color.border} ${color.text}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${color.dot}`} />
                {serviceName}
              </span>
            )}
          </div>
          <div className="text-sm font-medium capitalize">
            {ev.from_status ? `${getStatusLabel(ev.from_status, t)} -> ` : ''}
            {getStatusLabel(ev.to_status, t)}
          </div>
          {ev.note && <div className="text-xs text-muted-foreground mt-0.5">{ev.note}</div>}
          <div className="text-xs text-muted-foreground">
            {t('by_actor', { actorType: ev.actor_type, actorId: ev.actor_id != null ? ` #${ev.actor_id}` : '' })}
          </div>
        </li>
      ))}
    </ol>
  );
}

// ─── Delete dialog ────────────────────────────────────────────────────────────

function DeleteDialog({
  open,
  onConfirm,
  onClose,
  isPending,
}: {
  open: boolean;
  onConfirm: () => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const { t } = useTranslation('booking');

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('delete_booking_title')}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {t('delete_booking_message')}
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('back')}</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            {t('delete_permanently')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Cancel dialog ────────────────────────────────────────────────────────────

function CancelDialog({
  open,
  onConfirm,
  onClose,
}: {
  open: boolean;
  onConfirm: (note: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation('booking');
  const [note, setNote] = useState('');
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('cancel_booking_title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Label htmlFor="cancel-note">{t('cancellation_note_optional')}</Label>
          <Input
            id="cancel-note"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder={t('cancellation_note_placeholder')}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('back')}</Button>
          <Button variant="destructive" onClick={() => onConfirm(note)}>{t('cancel_booking')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Reschedule dialog ────────────────────────────────────────────────────────

function RescheduleDialog({
  open,
  initialStartsAt,
  initialEndsAt,
  onConfirm,
  onClose,
}: {
  open: boolean;
  initialStartsAt: string | null;
  initialEndsAt: string | null;
  onConfirm: (startsAt: string, endsAt: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation('booking');

  function toInputValue(iso: string | null): string {
    if (!iso) return '';
    try { return format(parseISO(iso), "yyyy-MM-dd'T'HH:mm"); } catch { return ''; }
  }
  const [startsAt, setStartsAt] = useState(toInputValue(initialStartsAt));
  const [endsAt, setEndsAt] = useState(toInputValue(initialEndsAt));

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('reschedule_booking_title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="r-starts">{t('start')}</Label>
            <Input id="r-starts" type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="r-ends">{t('end')}</Label>
            <Input id="r-ends" type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('cancel')}</Button>
          <Button onClick={() => onConfirm(startsAt, endsAt)} disabled={!startsAt || !endsAt}>
            {t('reschedule')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function BookingDetailPage() {
  const { t, i18n } = useTranslation('booking');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('bookings.manage');
  const canCancel = hasPermission('bookings.cancel');

  const [showCancel, setShowCancel] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const numericId = parseInt(id ?? '0', 10);

  const { data: settingsData } = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: async () => {
      try {
        return (await tenantSettings.get()).data;
      } catch {
        // Booking detail should still render with defaults even if settings are inaccessible.
        return null;
      }
    },
    retry: false,
  });
  const dateLocale = getDateLocale(i18n.language);
  const fmt = makeFormatter(
    settingsData?.date_format ?? DEFAULT_DATE_FORMAT,
    settingsData?.time_format ?? DEFAULT_TIME_FORMAT,
    dateLocale,
  );

  const { data: rawBooking, isLoading, isError } = useQuery({
    queryKey: ['cms-booking', numericId],
    queryFn: () => cmsBookingApi.getBooking(numericId),
    enabled: !!numericId,
  });
  const booking = rawBooking?.data;

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['cms-booking', numericId] });
    qc.invalidateQueries({ queryKey: ['cms-bookings'] });
  }

  const confirmMutation = useMutation({
    mutationFn: () => cmsBookingApi.confirmBooking(numericId),
    onSuccess: () => { invalidate(); toast({ title: t('booking_confirmed') }); },
    onError:   () => toast({ title: t('failed_to_confirm'), variant: 'destructive' }),
  });

  const completeMutation = useMutation({
    mutationFn: () => cmsBookingApi.completeBooking(numericId),
    onSuccess: () => { invalidate(); toast({ title: t('booking_marked_complete') }); },
    onError:   () => toast({ title: t('failed_to_complete'), variant: 'destructive' }),
  });

  const noShowMutation = useMutation({
    mutationFn: () => cmsBookingApi.noShowBooking(numericId),
    onSuccess: () => { invalidate(); toast({ title: t('booking_marked_no_show') }); },
    onError:   () => toast({ title: t('failed_to_update'), variant: 'destructive' }),
  });

  const cancelMutation = useMutation({
    mutationFn: (note: string) => cmsBookingApi.cancelBooking(numericId, note || undefined),
    onSuccess: () => { setShowCancel(false); invalidate(); toast({ title: t('booking_cancelled') }); },
    onError:   () => toast({ title: t('failed_to_cancel'), variant: 'destructive' }),
  });

  const rescheduleMutation = useMutation({
    mutationFn: ({ startsAt, endsAt }: { startsAt: string; endsAt: string }) =>
      cmsBookingApi.rescheduleBooking(numericId, startsAt, endsAt),
    onSuccess: () => { setShowReschedule(false); invalidate(); toast({ title: t('booking_rescheduled') }); },
    onError:   () => toast({ title: t('failed_to_reschedule'), variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => cmsBookingApi.deleteBooking(numericId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-bookings'] });
      toast({ title: t('booking_deleted') });
      navigate('/cms/bookings');
    },
    onError: () => toast({ title: t('failed_to_delete_booking'), variant: 'destructive' }),
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground p-8 text-center">{t('loading_booking')}</p>;
  }
  if (isError || !booking) {
    return <p className="text-sm text-red-500 p-8 text-center">{t('booking_not_found')}</p>;
  }

  const status = booking.status;
  const isPending   = status === 'pending' || status === 'pending_hold';
  const isConfirmed = status === 'confirmed';
  const isDone      = status === 'completed' || status === 'cancelled' || status === 'no_show';
  const serviceColor = colorForService(booking.service_id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('booking_title', { id: booking.id })}
        description={booking.customer_name}
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate('/cms/bookings')}>
            <ArrowLeft size={14} className="mr-1" /> {t('back')}
          </Button>
        }
      />

      {/* Status + actions */}
      <Card>
        <CardContent className="pt-4 flex flex-wrap items-center gap-3">
          <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[status] ?? ''}`}>
            {getStatusLabel(status, t)}
          </span>
          {!isDone && canManage && isPending && (
            <Button size="sm" onClick={() => confirmMutation.mutate()} disabled={confirmMutation.isPending}>
              <CheckCircle2 size={14} className="mr-1" /> {t('confirm')}
            </Button>
          )}
          {!isDone && canManage && isConfirmed && (
            <Button size="sm" variant="secondary" onClick={() => completeMutation.mutate()} disabled={completeMutation.isPending}>
              <Flag size={14} className="mr-1" /> {t('mark_complete')}
            </Button>
          )}
          {!isDone && canManage && isConfirmed && (
            <Button size="sm" variant="ghost" onClick={() => noShowMutation.mutate()} disabled={noShowMutation.isPending}>
              <AlertCircle size={14} className="mr-1" /> {t('mark_no_show')}
            </Button>
          )}
          {!isDone && canManage && !isPending && (
            <Button size="sm" variant="outline" onClick={() => setShowReschedule(true)}>
              <Clock size={14} className="mr-1" /> {t('reschedule')}
            </Button>
          )}
          {!isDone && canCancel && (
            <Button size="sm" variant="destructive" onClick={() => setShowCancel(true)}>
              <XCircle size={14} className="mr-1" /> {t('cancel_booking')}
            </Button>
          )}
          {isDone && canManage && (
            <Button size="sm" variant="destructive" onClick={() => setShowDelete(true)}>
              <Trash2 size={14} className="mr-1" /> {t('delete')}
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer */}
        <Card>
          <CardHeader><CardTitle className="text-base">{t('customer_title')}</CardTitle></CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <div><span className="text-muted-foreground">{t('customer_name')}</span> {booking.customer_name}</div>
            <div><span className="text-muted-foreground">{t('email')}</span> {booking.customer_email}</div>
            {booking.customer_phone && (
              <div><span className="text-muted-foreground">{t('phone')}</span> {booking.customer_phone}</div>
            )}
            {booking.customer_notes && (
              <div className="pt-2">
                <span className="text-muted-foreground block mb-0.5">{t('notes')}</span>
                <p className="bg-muted rounded p-2 text-xs">{booking.customer_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Booking details */}
        <Card>
          <CardHeader><CardTitle className="text-base">{t('booking_details_title')}</CardTitle></CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <div><span className="text-muted-foreground">{t('service')}</span> {booking.service?.name ?? '-'}</div>
            {booking.service?.name && (
              <div>
                <span className="text-muted-foreground">{t('service_color')}</span>{' '}
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs ${serviceColor.softBg} ${serviceColor.border} ${serviceColor.text}`}>
                  <span className={`h-2 w-2 rounded-full ${serviceColor.dot}`} />
                  {booking.service.name}
                </span>
              </div>
            )}
            <div><span className="text-muted-foreground">{t('resource')}</span> {booking.resource?.name ?? '-'}</div>
            <div><span className="text-muted-foreground">{t('mode')}</span> {booking.service?.booking_mode === 'slot' ? t('booking_mode_slot') : booking.service?.booking_mode === 'range' ? t('booking_mode_range') : '-'}</div>
            <div><span className="text-muted-foreground">{t('start')}</span> {fmt(booking.starts_at)}</div>
            <div><span className="text-muted-foreground">{t('end')}</span> {fmt(booking.ends_at)}</div>
            {booking.cancelled_at && (
              <div>
                <span className="text-muted-foreground">{t('cancelled')}</span> {fmt(booking.cancelled_at)}
                {booking.cancelled_by && ` by ${booking.cancelled_by}`}
              </div>
            )}
            <div><span className="text-muted-foreground">{t('created')}</span> {fmt(booking.created_at)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Event timeline */}
      <Card>
        <CardHeader><CardTitle className="text-base">{t('event_timeline_title')}</CardTitle></CardHeader>
        <CardContent>
          <EventTimeline
            events={booking.events ?? []}
            fmt={fmt}
            serviceId={booking.service_id}
            serviceName={booking.service?.name}
          />
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CancelDialog
        open={showCancel}
        onConfirm={note => cancelMutation.mutate(note)}
        onClose={() => setShowCancel(false)}
      />
      <RescheduleDialog
        open={showReschedule}
        initialStartsAt={booking.starts_at}
        initialEndsAt={booking.ends_at}
        onConfirm={(startsAt, endsAt) => rescheduleMutation.mutate({ startsAt, endsAt })}
        onClose={() => setShowReschedule(false)}
      />
      <DeleteDialog
        open={showDelete}
        onConfirm={() => deleteMutation.mutate()}
        onClose={() => setShowDelete(false)}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
