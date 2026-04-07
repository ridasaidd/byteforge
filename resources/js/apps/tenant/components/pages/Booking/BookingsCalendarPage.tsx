import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, List } from 'lucide-react';
import { cmsBookingApi } from '@/shared/services/api/booking';
import type { CmsBooking, BookingStatus } from '@/shared/services/api/booking';
import { PageHeader } from '@/shared/components/molecules/PageHeader';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';

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

// ─── Week calendar view ───────────────────────────────────────────────────────

function WeekView({
  weekStart,
  bookings,
  onBookingClick,
}: {
  weekStart: Date;
  bookings: CmsBooking[];
  onBookingClick: (id: number) => void;
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
              <span className="text-foreground">{format(day, 'd')}</span>
            </div>
            <div className="space-y-1">
              {dayBookings.slice(0, 4).map(b => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onBookingClick(b.id)}
                  className="w-full text-left px-1.5 py-0.5 rounded bg-primary/10 hover:bg-primary/20 truncate"
                >
                  {formatTime(b.starts_at)} {b.customer_name}
                </button>
              ))}
              {dayBookings.length > 4 && (
                <span className="text-muted-foreground">+{dayBookings.length - 4} more</span>
              )}
            </div>
          </div>
        );
      })}
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
            <TableCell>{b.service?.name ?? '—'}</TableCell>
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

type ViewMode = 'week' | 'list';

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
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [statusFilter, setStatusFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');

  // Fetch all bookings for current week (week view) or all (list view)
  const dateParam = viewMode === 'week' ? undefined : undefined;

  const { data, isLoading } = useQuery({
    queryKey: ['cms-bookings', statusFilter, serviceFilter, resourceFilter, viewMode, weekStart.toISOString()],
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
    if (viewMode !== 'week') return allBookings;
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    return allBookings.filter(b => {
      if (!b.starts_at) return false;
      try {
        const d = parseISO(b.starts_at);
        return d >= weekStart && d <= weekEnd;
      } catch { return false; }
    });
  }, [allBookings, viewMode, weekStart]);

  function onBookingClick(id: number) {
    navigate(`/cms/bookings/${id}`);
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
          {/* Week nav */}
          {viewMode === 'week' && (
            <div className="flex items-center justify-between mb-4">
              <Button size="sm" variant="outline" onClick={() => setWeekStart(w => subWeeks(w, 1))}>
                <ChevronLeft size={14} />
              </Button>
              <span className="text-sm font-medium">
                {format(weekStart, 'dd MMM')} – {format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'dd MMM yyyy')}
              </span>
              <Button size="sm" variant="outline" onClick={() => setWeekStart(w => addWeeks(w, 1))}>
                <ChevronRight size={14} />
              </Button>
            </div>
          )}

          {isLoading
            ? <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
            : viewMode === 'week'
              ? <WeekView weekStart={weekStart} bookings={visibleBookings} onBookingClick={onBookingClick} />
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
    </div>
  );
}
