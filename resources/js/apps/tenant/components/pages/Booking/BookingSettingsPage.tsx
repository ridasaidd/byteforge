import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantSettings, type UpdateTenantSettingsData } from '@/shared/services/api';
import { tenantPages } from '@/shared/services/api/pages';
import { useToast } from '@/shared/hooks/useToast';
import { PageHeader } from '@/shared/components/molecules/PageHeader';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import type { Page } from '@/shared/services/api/types';

function toChecked(val: unknown): boolean {
  return val === true || val === 1 || val === '1';
}

function toNum(val: unknown): string {
  if (val == null) return '';
  return String(val);
}

export function BookingSettingsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();

  // Form state
  const [timezone, setTimezone] = useState('');
  const [autoConfirm, setAutoConfirm] = useState(false);
  const [holdMinutes, setHoldMinutes] = useState('10');
  const [checkinTime, setCheckinTime] = useState('');
  const [checkoutTime, setCheckoutTime] = useState('');
  const [reminderHours, setReminderHours] = useState('');
  const [cancellationNoticeHours, setCancellationNoticeHours] = useState('');
  const [paymentPageId, setPaymentPageId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: async () => {
      const res = await tenantSettings.get();
      return res.data;
    },
  });

  const { data: publishedPages = [], isLoading: isLoadingPages } = useQuery({
    queryKey: ['tenant-pages', 'published-for-booking-payment'],
    queryFn: async () => {
      const response = await tenantPages.list({ per_page: 100, status: 'published' });
      return response.data;
    },
  });

  // Populate form when data arrives
  useEffect(() => {
    if (!data) return;
    setTimezone(data.timezone ?? '');
    setAutoConfirm(toChecked(data.booking_auto_confirm));
    setHoldMinutes(toNum(data.booking_hold_minutes) || '10');
    setCheckinTime(data.booking_checkin_time ?? '');
    setCheckoutTime(data.booking_checkout_time ?? '');
    setReminderHours(
      Array.isArray(data.booking_reminder_hours)
        ? data.booking_reminder_hours.join(', ')
        : toNum(data.booking_reminder_hours)
    );
    setCancellationNoticeHours(toNum(data.booking_cancellation_notice_hours));
    setPaymentPageId(toNum(data.booking_payment_page_id));
  }, [data]);

  const paymentPageOptions = publishedPages.filter((page: Page) => page.status === 'published');

  const saveMutation = useMutation({
    mutationFn: (payload: UpdateTenantSettingsData) => tenantSettings.update(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant-settings'] });
      toast({ title: 'Booking settings saved' });
    },
    onError: () => toast({ title: 'Failed to save settings', variant: 'destructive' }),
  });

  function handleSave() {
    // Parse reminder hours: comma-separated numbers
    const reminderHoursArr = reminderHours
      .split(',')
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n));

    saveMutation.mutate({
      timezone: timezone || undefined,
      booking_auto_confirm: autoConfirm,
      booking_hold_minutes: parseInt(holdMinutes, 10) || 10,
      booking_checkin_time: checkinTime || undefined,
      booking_checkout_time: checkoutTime || undefined,
      booking_reminder_hours: reminderHoursArr,
      booking_cancellation_notice_hours: parseInt(cancellationNoticeHours, 10) || undefined,
      booking_payment_page_id: paymentPageId ? parseInt(paymentPageId, 10) : null,
    });
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground p-8 text-center">Loading settings…</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Booking Settings"
        description="Configure how bookings behave for your tenancy."
      />

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Timezone and confirmation behaviour.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-1.5">
            <Label htmlFor="timezone">Timezone</Label>
            <Input
              id="timezone"
              placeholder="e.g. Europe/Stockholm"
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              IANA timezone string. Used for availability calculations and notifications.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              id="auto-confirm"
              type="checkbox"
              checked={autoConfirm}
              onChange={e => setAutoConfirm(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="auto-confirm">Auto-confirm bookings</Label>
          </div>

          <div className="grid gap-1.5 max-w-xs">
            <Label htmlFor="hold-minutes">Hold expiry (minutes)</Label>
            <Input
              id="hold-minutes"
              type="number"
              min={1}
              value={holdMinutes}
              onChange={e => setHoldMinutes(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              How long a booking hold is reserved before releasing the slot.
            </p>
          </div>

          <div className="grid gap-1.5 max-w-md">
            <Label htmlFor="payment-page">Payment page</Label>
            <select
              id="payment-page"
              value={paymentPageId}
              onChange={(event) => setPaymentPageId(event.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              disabled={isLoadingPages}
            >
              <option value="">System fallback payment page</option>
              {paymentPageOptions.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.is_homepage ? `${page.title} (Homepage)` : `${page.title} (/pages/${page.slug})`}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Select the published CMS page that contains the Payment Widget. When unset, bookings fall back to the built-in payment page.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Check-in / Check-out</CardTitle>
          <CardDescription>Default times used for range-based (per-night) bookings.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="checkin">Check-in time</Label>
            <Input
              id="checkin"
              type="time"
              value={checkinTime}
              onChange={e => setCheckinTime(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="checkout">Check-out time</Label>
            <Input
              id="checkout"
              type="time"
              value={checkoutTime}
              onChange={e => setCheckoutTime(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Control when reminder emails are sent.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-1.5 max-w-sm">
            <Label htmlFor="reminder-hours">Reminder hours before (comma-separated)</Label>
            <Input
              id="reminder-hours"
              placeholder="e.g. 24, 2"
              value={reminderHours}
              onChange={e => setReminderHours(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Send reminder emails these many hours before the booking starts.
            </p>
          </div>

          <div className="grid gap-1.5 max-w-xs">
            <Label htmlFor="cancel-hours">Cancellation notice (hours)</Label>
            <Input
              id="cancel-hours"
              type="number"
              min={0}
              value={cancellationNoticeHours}
              onChange={e => setCancellationNoticeHours(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Minimum hours notice required for a customer to cancel their booking.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Saving…' : 'Save settings'}
        </Button>
      </div>
    </div>
  );
}
