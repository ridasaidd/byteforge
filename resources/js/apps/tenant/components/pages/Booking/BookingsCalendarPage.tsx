import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  isSameDay,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  isToday,
  isBefore,
  startOfDay,
  isSameMonth,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, CalendarDays, List } from 'lucide-react';
import { cmsBookingApi } from '@/shared/services/api/booking';
import type { CmsBooking, BookingStatus } from '@/shared/services/api/booking';
import { PageHeader } from '@/shared/components/molecules/PageHeader';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<BookingStatus, string> = {
  pending:          'bg-yellow-100 text-yellow-800',
  pending_hold:     'bg-purple-100 text-purple-800',
  awaiting_payment: 'bg-blue-100 text-blue-800',
  confirmed:        'bg-green-100 text-green-800',
  completed:        'bg-gray-100 text-gray-700',
  cancelled:        'bg-red-100 text-red-700',
  no_show:          'bg-orange-100 text-orange-800',
};

const SERVICE_COLORS = [
  {
    dot: 'bg-blue-500',
    border: 'border-blue-300',
    softBg: 'bg-blue-50',
    text: 'text-blue-800',
  },
  {
    dot: 'bg-emerald-500',
    border: 'border-emerald-300',
    softBg: 'bg-emerald-50',
    text: 'text-emerald-800',
  },
  {
    dot: 'bg-rose-500',
    border: 'border-rose-300',
    softBg: 'bg-rose-50',
    text: 'text-rose-800',
  },
  {
    dot: 'bg-amber-500',
    border: 'border-amber-300',
    softBg: 'bg-amber-50',
    text: 'text-amber-800',
  },
  {
    dot: 'bg-violet-500',
    border: 'border-violet-300',
    softBg: 'bg-violet-50',
    text: 'text-violet-800',
  },
  {
    dot: 'bg-cyan-500',
    border: 'border-cyan-300',
    softBg: 'bg-cyan-50',
    text: 'text-cyan-800',
  },
];

function colorForService(serviceId: number | undefined) {
  if (!serviceId) return SERVICE_COLORS[0];
  return SERVICE_COLORS[Math.abs(serviceId) % SERVICE_COLORS.length];
}

function dayNumberClass(day: Date): string {
  const today = startOfDay(new Date());
  if (isToday(day)) return 'font-bold text-foreground';
  if (isBefore(day, today)) return 'text-muted-foreground';
  return 'text-foreground';
}

function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] ?? ''}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  try { return format(parseISO(iso), 'HH:mm'); } catch { return '—'; }
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try { return format(parseISO(iso), 'PP'); } catch { return '—'; }
}

function BookingPill({
  booking,
  onBookingClick,
}: {
  booking: CmsBooking;
  onBookingClick: (id: number) => void;
}) {
  const color = colorForService(booking.service_id);

  return (
    <button
      type="button"
      onClick={() => onBookingClick(booking.id)}
      className={`w-full text-left px-1.5 py-0.5 rounded border-l-2 truncate text-[10px] sm:text-xs ${color.softBg} ${color.border} ${color.text}`}
      title={`${booking.service?.name ?? 'Service'} · ${booking.customer_name}`}
    >
      {formatTime(booking.starts_at)} {booking.customer_name}
    </button>
  );
}

// ─── Week calendar view ───────────────────────────────────────────────────────

function WeekView({
  weekStart,
  bookings,
  onBookingClick,
  onOpenDay,
}: {
  weekStart: Date;
  bookings: CmsBooking[];
  onBookingClick: (id: number) => void;
  onOpenDay: (day: Date, dayBookings: CmsBooking[]) => void;
}) {
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const days    = eachDayOfInterval({ start: weekStart, end: weekEnd });

  function bookingsForDay(day: Date) {
    return bookings.filter(b => {
      if (!b.starts_at) return false;
      try { return isSameDay(parseISO(b.starts_at), day); } catch { return false; }
    });
  }

  return (
    <div className="grid grid-cols-7 gap-1 min-h-64">
      {days.map(day => {
        const dayBookings = bookingsForDay(day);
        return (
          <div key={day.toISOString()} className="border rounded-md p-1.5 bg-card min-h-24 text-xs">
            <div className="font-semibold text-muted-foreground mb-1">
              {format(day, 'EEE')}<br />
              <span className={dayNumberClass(day)}>{format(day, 'd')}</span>
            </div>
            <div className="space-y-1">
              {dayBookings.slice(0, 4).map(b => (
                <BookingPill key={b.id} booking={b} onBookingClick={onBookingClick} />
              ))}
              {dayBookings.length > 4 && (
                <button
                  type="button"
                  onClick={() => onOpenDay(day, dayBookings)}
                  className="text-muted-foreground text-[10px] sm:text-xs underline-offset-2 hover:underline"
                >
                  +{dayBookings.length - 4} more
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MonthView({
  monthDate,
  bookings,
  onBookingClick,
  onOpenDay,
}: {
  monthDate: Date;
  bookings: CmsBooking[];
  onBookingClick: (id: number) => void;
  onOpenDay: (day: Date, dayBookings: CmsBooking[]) => void;
}) {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  function bookingsForDay(day: Date): CmsBooking[] {
    const all = bookings.filter(b => {
      if (!b.starts_at) return false;
      try { return isSameDay(parseISO(b.starts_at), day); } catch { return false; }
    });

    // On today: sort upcoming bookings (≥ now) first so the 2 visible pills
    // show what's actionable. Past bookings remain accessible via the modal.
    if (isToday(day) && all.length > 0) {
      const now = new Date();
      const upcoming = all.filter(b => b.starts_at && parseISO(b.starts_at) >= now);
      const past     = all.filter(b => !b.starts_at || parseISO(b.starts_at) < now);
      // Sort each group chronologically
      const byTime = (a: CmsBooking, b: CmsBooking) =>
        (a.starts_at ? parseISO(a.starts_at).getTime() : 0) -
        (b.starts_at ? parseISO(b.starts_at).getTime() : 0);
      return [...upcoming.sort(byTime), ...past.sort(byTime)];
    }

    // All other dates: simple chronological order
    return all.sort((a, b) =>
      (a.starts_at ? parseISO(a.starts_at).getTime() : 0) -
      (b.starts_at ? parseISO(b.starts_at).getTime() : 0)
    );
  }

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-7 gap-1 text-[10px] sm:text-xs text-muted-foreground px-1">
        <span><span className="sm:hidden">M</span><span className="hidden sm:inline">Mon</span></span>
        <span><span className="sm:hidden">T</span><span className="hidden sm:inline">Tue</span></span>
        <span><span className="sm:hidden">W</span><span className="hidden sm:inline">Wed</span></span>
        <span><span className="sm:hidden">T</span><span className="hidden sm:inline">Thu</span></span>
        <span><span className="sm:hidden">F</span><span className="hidden sm:inline">Fri</span></span>
        <span><span className="sm:hidden">S</span><span className="hidden sm:inline">Sat</span></span>
        <span><span className="sm:hidden">S</span><span className="hidden sm:inline">Sun</span></span>
      </div>

      <div className="grid grid-cols-7 gap-1 min-h-64">
        {days.map(day => {
          const dayBookings = bookingsForDay(day);
          const inCurrentMonth = isSameMonth(day, monthDate);
          // Count how many are hidden (upcoming-first means hidden pills are past ones on today)
          const hiddenCount = dayBookings.length - 2;

          return (
            <div
              key={day.toISOString()}
              className={`border rounded-md p-1 sm:p-1.5 min-h-20 sm:min-h-28 text-[11px] sm:text-xs ${inCurrentMonth ? 'bg-card' : 'bg-muted/20'}`}
            >
              <div className="mb-1">
                <span className={`${dayNumberClass(day)} ${!inCurrentMonth ? 'opacity-60' : ''}`}>
                  {format(day, 'd')}
                </span>
              </div>
              <div className="space-y-1">
                {dayBookings.slice(0, 2).map(b => (
                  <BookingPill key={b.id} booking={b} onBookingClick={onBookingClick} />
                ))}
                {hiddenCount > 0 && (
                  <button
                    type="button"
                    onClick={() => onOpenDay(day, dayBookings)}
                    className="text-muted-foreground text-[10px] sm:text-xs underline-offset-2 hover:underline"
                  >
                    +{hiddenCount} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── List view ────────────────────────────────────────────────────────────────

function BookingListView({
  bookings,
  onBookingClick,
}: {
  bookings: CmsBooking[];
  onBookingClick: (id: number) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Customer</TableHead>
          <TableHead>Service</TableHead>
          <TableHead>Resource</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Time</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bookings.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground">No bookings found.</TableCell>
          </TableRow>
        )}
        {bookings.map(b => (
          <TableRow
            key={b.id}
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => onBookingClick(b.id)}
          >
            <TableCell>
              <div className="font-medium">{b.customer_name}</div>
              <div className="text-xs text-muted-foreground">{b.customer_email}</div>
            </TableCell>
            <TableCell>
              <div className="inline-flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${colorForService(b.service_id).dot}`} />
                <span>{b.service?.name ?? '—'}</span>
              </div>
            </TableCell>
            <TableCell>{b.resource?.name ?? '—'}</TableCell>
            <TableCell>{formatDate(b.starts_at)}</TableCell>
            <TableCell>
              {formatTime(b.starts_at)}
              {b.ends_at ? ` – ${formatTime(b.ends_at)}` : ''}
            </TableCell>
            <TableCell><StatusBadge status={b.status} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type ViewMode = 'month' | 'week' | 'list';

const statusOptions: Array<{ value: string; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'completed', label: 'Completed' },
  { value: 'no_show', label: 'No-show' },
];

export function BookingsCalendarPage() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [statusFilter, setStatusFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [dayDialogOpen, setDayDialogOpen] = useState(false);
  const [selectedDayLabel, setSelectedDayLabel] = useState('');
  const [selectedDayBookings, setSelectedDayBookings] = useState<CmsBooking[]>([]);

  // Fetch all bookings for current week (week view) or all (list view)
  const dateParam = viewMode === 'week' ? undefined : undefined;

  const { data, isLoading } = useQuery({
    queryKey: ['cms-bookings', statusFilter, serviceFilter, resourceFilter, viewMode, currentDate.toISOString()],
    queryFn: () => cmsBookingApi.listBookings({
      status: statusFilter || undefined,
      service_id: serviceFilter ? parseInt(serviceFilter) : undefined,
      resource_id: resourceFilter ? parseInt(resourceFilter) : undefined,
      ...(dateParam ? { date: dateParam } : {}),
    }),
  });

  const { data: servicesData } = useQuery({
    queryKey: ['cms-booking-services'],
    queryFn: () => cmsBookingApi.listServices(),
  });

  const { data: resourcesData } = useQuery({
    queryKey: ['cms-booking-resources'],
    queryFn: () => cmsBookingApi.listResources(),
  });

  const allBookings: CmsBooking[] = useMemo(() => data?.data ?? [], [data]);
  const services = servicesData?.data ?? [];
  const resources = resourcesData?.data ?? [];

  // For week view, filter client-side to the visible week
  const visibleBookings = useMemo(() => {
    if (viewMode === 'list') return allBookings;

    const rangeStart = viewMode === 'week'
      ? startOfWeek(currentDate, { weekStartsOn: 1 })
      : startOfMonth(currentDate);
    const rangeEnd = viewMode === 'week'
      ? endOfWeek(currentDate, { weekStartsOn: 1 })
      : endOfMonth(currentDate);

    return allBookings.filter(b => {
      if (!b.starts_at) return false;
      try {
        const d = parseISO(b.starts_at);
        return d >= rangeStart && d <= rangeEnd;
      } catch { return false; }
    });
  }, [allBookings, viewMode, currentDate]);

  const serviceLegend = useMemo(() => {
    const seen = new Set<number>();
    const deduped = allBookings
      .filter(b => b.service_id && b.service?.name)
      .filter(b => {
        if (seen.has(b.service_id)) return false;
        seen.add(b.service_id);
        return true;
      })
      .slice(0, 8);

    return deduped;
  }, [allBookings]);

  function onBookingClick(id: number) {
    navigate(`/cms/bookings/${id}`);
  }

  function openDayDialog(day: Date, dayBookings: CmsBooking[]) {
    setSelectedDayLabel(format(day, 'EEEE, dd MMM yyyy'));
    setSelectedDayBookings([...dayBookings].sort((a, b) => {
      const aTime = a.starts_at ? parseISO(a.starts_at).getTime() : 0;
      const bTime = b.starts_at ? parseISO(b.starts_at).getTime() : 0;
      return aTime - bTime;
    }));
    setDayDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bookings"
        description="View and manage all incoming bookings."
      />

      {/* Filters + view toggle */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="border rounded-md px-3 py-1.5 text-sm"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          {statusOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          className="border rounded-md px-3 py-1.5 text-sm"
          value={serviceFilter}
          onChange={e => setServiceFilter(e.target.value)}
        >
          <option value="">All services</option>
          {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select
          className="border rounded-md px-3 py-1.5 text-sm"
          value={resourceFilter}
          onChange={e => setResourceFilter(e.target.value)}
        >
          <option value="">All resources</option>
          {resources.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>

        <div className="ml-auto flex gap-1">
          <Button
            size="sm"
            variant={viewMode === 'month' ? 'default' : 'outline'}
            onClick={() => setViewMode('month')}
          >
            <CalendarDays size={14} className="mr-1" /> Month
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'week' ? 'default' : 'outline'}
            onClick={() => setViewMode('week')}
          >
            <Calendar size={14} className="mr-1" /> Week
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'list' ? 'default' : 'outline'}
            onClick={() => setViewMode('list')}
          >
            <List size={14} className="mr-1" /> List
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4">
          {/* Calendar nav */}
          {(viewMode === 'week' || viewMode === 'month') && (
            <div className="flex items-center justify-between mb-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentDate(d => viewMode === 'month' ? subMonths(d, 1) : subWeeks(d, 1))}
              >
                <ChevronLeft size={14} />
              </Button>
              <span className="text-sm font-medium">
                {viewMode === 'month'
                  ? format(startOfMonth(currentDate), 'MMMM yyyy')
                  : `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'dd MMM')} – ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'dd MMM yyyy')}`
                }
              </span>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" onClick={() => setCurrentDate(new Date())}>Today</Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentDate(d => viewMode === 'month' ? addMonths(d, 1) : addWeeks(d, 1))}
                >
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}

          {(viewMode === 'week' || viewMode === 'month') && serviceLegend.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 mb-3 text-xs text-muted-foreground">
              {serviceLegend.map(b => (
                <span key={b.service_id} className="inline-flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${colorForService(b.service_id).dot}`} />
                  {b.service?.name}
                </span>
              ))}
            </div>
          )}

          {isLoading
            ? <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
            : viewMode === 'month'
              ? <MonthView
                  monthDate={currentDate}
                  bookings={visibleBookings}
                  onBookingClick={onBookingClick}
                  onOpenDay={openDayDialog}
                />
              : viewMode === 'week'
                ? <WeekView
                    weekStart={startOfWeek(currentDate, { weekStartsOn: 1 })}
                    bookings={visibleBookings}
                    onBookingClick={onBookingClick}
                    onOpenDay={openDayDialog}
                  />
              : <BookingListView bookings={allBookings} onBookingClick={onBookingClick} />
          }
        </CardContent>
      </Card>

      {/* Pagination info for list view */}
      {viewMode === 'list' && data && (
        <p className="text-xs text-muted-foreground text-right">
          Showing {allBookings.length} of {data.total} bookings (page {data.current_page}/{data.last_page})
        </p>
      )}

      <Dialog open={dayDialogOpen} onOpenChange={setDayDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedDayLabel}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 max-h-[60vh] overflow-y-auto">
            {selectedDayBookings.length === 0 && (
              <p className="text-sm text-muted-foreground">No bookings for this day.</p>
            )}
            {selectedDayBookings.map(b => (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  setDayDialogOpen(false);
                  onBookingClick(b.id);
                }}
                className="w-full text-left border rounded-md px-3 py-2 hover:bg-muted/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${colorForService(b.service_id).dot}`} />
                    <span className="text-sm font-medium">{b.customer_name}</span>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatTime(b.starts_at)}{b.ends_at ? ` - ${formatTime(b.ends_at)}` : ''}
                  {' · '}
                  {b.service?.name ?? 'Service'}
                  {b.resource?.name ? ` · ${b.resource.name}` : ''}
                </p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
