import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cmsBookingApi } from '@/shared/services/api/booking';
import type { CmsBookingResource, CreateBookingResourceData, BookingAvailabilityWindow } from '@/shared/services/api/booking';
import { tenantUsers } from '@/shared/services/api/tenantUsers';
import type { User } from '@/shared/services/api/types';
import { PageHeader } from '@/shared/components/molecules/PageHeader';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { useToast } from '@/shared/hooks';
import { usePermissions } from '@/shared/hooks/usePermissions';

// ─── Form helpers ─────────────────────────────────────────────────────────────

type FormData = {
  name: string;
  type: 'person' | 'space' | 'equipment';
  description: string;
  checkin_time: string;
  checkout_time: string;
  capacity: string;
  resource_label: string;
  user_id: string;
  is_active: boolean;
};

function defaultForm(r?: CmsBookingResource): FormData {
  return {
    name:           r?.name ?? '',
    type:           r?.type ?? 'space',
    description:    r?.description ?? '',
    checkin_time:   r?.checkin_time ?? '',
    checkout_time:  r?.checkout_time ?? '',
    capacity:       String(r?.capacity ?? 1),
    resource_label: r?.resource_label ?? '',
    user_id:        String(r?.user_id ?? ''),
    is_active:      r?.is_active ?? true,
  };
}

function formToPayload(f: FormData): CreateBookingResourceData {
  return {
    name:           f.name,
    type:           f.type,
    description:    f.description || null,
    checkin_time:   f.checkin_time || null,
    checkout_time:  f.checkout_time || null,
    capacity:       parseInt(f.capacity) || 1,
    resource_label: f.resource_label || null,
    user_id:        f.user_id ? parseInt(f.user_id) : null,
    is_active:      f.is_active,
  };
}

// ─── Resource form dialog ─────────────────────────────────────────────────────

function ResourceDialog({
  open,
  onClose,
  editing,
  onSave,
  saving,
  users,
}: {
  open: boolean;
  onClose: () => void;
  editing: CmsBookingResource | null;
  onSave: (data: CreateBookingResourceData) => void;
  saving: boolean;
  users: User[];
}) {
  const { t } = useTranslation('booking');
  const [form, setForm] = useState<FormData>(() => defaultForm(editing ?? undefined));
  const set = (k: keyof FormData, v: string | boolean) =>
    setForm(prev => ({ ...prev, [k]: v }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(formToPayload(form));
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? t('edit_resource_title') : t('new_resource_title')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>{t('name_required')}</Label>
            <Input required maxLength={120} value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div>
            <Label>{t('description')}</Label>
            <textarea
              className="w-full border rounded-md px-3 py-2 text-sm min-h-[88px]"
              maxLength={1000}
              placeholder={t('description_placeholder_resource')}
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">{form.description.length}/1000</p>
          </div>
          <div>
            <Label>{t('type_required')}</Label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={form.type}
              onChange={e => set('type', e.target.value as 'person' | 'space' | 'equipment')}
            >
              <option value="space">{t('type_space')}</option>
              <option value="person">{t('type_person')}</option>
              <option value="equipment">{t('type_equipment')}</option>
            </select>
          </div>
          {form.type === 'space' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('default_checkin_time')}</Label>
                <Input type="time" value={form.checkin_time} onChange={e => set('checkin_time', e.target.value)} />
              </div>
              <div>
                <Label>{t('default_checkout_time')}</Label>
                <Input type="time" value={form.checkout_time} onChange={e => set('checkout_time', e.target.value)} />
              </div>
            </div>
          )}
          {form.type !== 'person' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('capacity')}</Label>
                <Input type="number" min={1} max={255} value={form.capacity} onChange={e => set('capacity', e.target.value)} />
              </div>
              <div>
                <Label>{t('label')}</Label>
                <Input maxLength={60} placeholder={t('label_placeholder')} value={form.resource_label} onChange={e => set('resource_label', e.target.value)} />
              </div>
            </div>
          )}
          {form.type === 'person' && (
            <div>
              <Label>{t('linked_tenant_user')}</Label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={form.user_id}
                onChange={e => {
                  const uid = e.target.value;
                  set('user_id', uid);
                  // Auto-fill name from the selected user when name is empty or was previously auto-filled
                  if (uid) {
                    const user = users.find(u => String(u.id) === uid);
                    if (user && (!form.name || users.some(u => u.name === form.name))) {
                      set('name', user.name);
                    }
                  }
                }}
              >
                <option value="">{t('no_linked_account')}</option>
                {users.map(u => (
                  <option key={u.id} value={String(u.id)}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input type="checkbox" id="res_active" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} />
            <Label htmlFor="res_active">{t('active')}</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>{t('cancel')}</Button>
            <Button type="submit" disabled={saving}>{saving ? t('saving') : t('save')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Availability window manager ──────────────────────────────────────────────

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// Display Mon→Sun order (indices into DAYS array)
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function AvailabilityManager({
  resourceId,
  resourceType,
  canManage,
}: {
  resourceId: number;
  resourceType: 'person' | 'space' | 'equipment';
  canManage: boolean;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation('booking');

  const { data, isLoading } = useQuery({
    queryKey: ['cms-booking-availability', resourceId],
    queryFn: () => cmsBookingApi.listAvailability(resourceId),
  });

  const [adding, setAdding] = useState<{ dayOfWeek: number; startsAt: string; endsAt: string } | null>(null);

  const addMutation = useMutation({
    mutationFn: (payload: { day_of_week: number; starts_at: string; ends_at: string }) =>
      cmsBookingApi.createAvailability(resourceId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-booking-availability', resourceId] });
      setAdding(null);
      toast({ title: t('time_window_added') });
    },
    onError: () => toast({ title: t('failed_save_window'), variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (windowId: number) => cmsBookingApi.deleteAvailability(windowId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-booking-availability', resourceId] });
      toast({ title: t('time_window_removed') });
    },
    onError: () => toast({ title: t('failed_remove_window'), variant: 'destructive' }),
  });

  const byDay = useMemo(() => {
    const map = new Map<number, BookingAvailabilityWindow[]>();
    for (const w of (data?.data ?? []).filter(w => w.day_of_week !== null && !w.is_blocked)) {
      const d = w.day_of_week as number;
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(w);
    }
    return map;
  }, [data?.data]);

  return (
    <div className="mt-2 pt-3 border-t">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{t('availability_schedule')}</p>
      <p className="text-xs text-muted-foreground mb-2">
        {resourceType === 'person' && t('availability_help_person')}
        {resourceType === 'space' && t('availability_help_space')}
        {resourceType === 'equipment' && t('availability_help_equipment')}
      </p>
      {isLoading ? (
        <p className="text-xs text-muted-foreground">{t('loading')}</p>
      ) : (
        <div className="space-y-1.5">
          {DAY_ORDER.map(dayOfWeek => {
            const dayWindows = byDay.get(dayOfWeek) ?? [];
            const isAddingThisDay = adding?.dayOfWeek === dayOfWeek;
            return (
              <div key={dayOfWeek} className="flex items-start gap-2 text-sm min-h-[24px]">
                <span className="w-8 shrink-0 text-xs text-muted-foreground pt-0.5">{DAYS[dayOfWeek]}</span>
                <div className="flex flex-wrap items-center gap-1 flex-1">
                  {dayWindows.map(w => (
                    <span key={w.id} className="inline-flex items-center gap-0.5 bg-muted rounded px-2 py-0.5 text-xs">
                      {w.starts_at.slice(0, 5)}–{w.ends_at.slice(0, 5)}
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => deleteMutation.mutate(w.id)}
                          className="ml-1 text-muted-foreground hover:text-destructive leading-none"
                          aria-label={t('remove_window')}
                        >×</button>
                      )}
                    </span>
                  ))}
                  {dayWindows.length === 0 && !isAddingThisDay && (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                  {canManage && (
                    isAddingThisDay ? (
                      <span className="inline-flex items-center gap-1 text-xs">
                        <input
                          type="time"
                          value={adding.startsAt}
                          onChange={e => setAdding({ ...adding, startsAt: e.target.value })}
                          className="border rounded px-1 py-0.5 w-22 text-xs"
                        />
                        <span>–</span>
                        <input
                          type="time"
                          value={adding.endsAt}
                          onChange={e => setAdding({ ...adding, endsAt: e.target.value })}
                          className="border rounded px-1 py-0.5 w-22 text-xs"
                        />
                        <button
                          type="button"
                          className="text-xs text-primary font-medium hover:underline"
                          disabled={addMutation.isPending}
                          onClick={() => {
                            if (adding.startsAt && adding.endsAt) {
                              addMutation.mutate({
                                day_of_week: dayOfWeek,
                                starts_at: adding.startsAt + ':00',
                                ends_at: adding.endsAt + ':00',
                              });
                            }
                          }}
                        >{addMutation.isPending ? '...' : t('save_window')}</button>
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:underline"
                          onClick={() => setAdding(null)}
                        >{t('cancel')}</button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="text-xs text-primary hover:underline"
                        onClick={() => setAdding({ dayOfWeek, startsAt: '09:00', endsAt: '17:00' })}
                      >+ {t('add')}</button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  person: 'type_person',
  space: 'type_space',
  equipment: 'type_equipment',
};

export function ResourceManagerPage() {
  const { t } = useTranslation('booking');
  const { toast } = useToast();
  const qc = useQueryClient();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('bookings.manage');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CmsBookingResource | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  function toggleExpand(id: number) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  const { data: usersData } = useQuery({
    queryKey: ['tenant-users-for-resource'],
    queryFn: () => tenantUsers.list({ per_page: 200 }),
  });
  const allUsers = usersData?.data ?? [];

  const { data, isLoading } = useQuery({
    queryKey: ['cms-booking-resources'],
    queryFn: () => cmsBookingApi.listResources(),
  });

  const resources = useMemo(() => data?.data ?? [], [data]);

  // Auto-expand all cards on first load so the schedule editor is immediately visible
  useEffect(() => {
    if (resources.length > 0) {
      setExpanded(prev => {
        if (prev.size > 0) return prev; // don't collapse cards the user has manually toggled
        return new Set(resources.map(r => r.id));
      });
    }
  }, [resources]);

  const saveMutation = useMutation({
    mutationFn: (payload: CreateBookingResourceData) =>
      editing
        ? cmsBookingApi.updateResource(editing.id, payload)
        : cmsBookingApi.createResource(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-booking-resources'] });
      setDialogOpen(false);
      setEditing(null);
      toast({ title: editing ? t('resource_updated') : t('resource_created') });
    },
    onError: () => toast({ title: t('save_failed'), variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => cmsBookingApi.deleteResource(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-booking-resources'] });
      toast({ title: t('resource_deleted') });
    },
    onError: () => toast({ title: t('delete_failed'), variant: 'destructive' }),
  });

  function openNew() { setEditing(null); setDialogOpen(true); }
  function openEdit(r: CmsBookingResource) { setEditing(r); setDialogOpen(true); }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('resources_page_title')}
        description={t('resources_page_description')}
        actions={canManage ? (
          <Button onClick={openNew}>
            <Plus size={16} className="mr-1" /> {t('new_resource')}
          </Button>
        ) : undefined}
      />

      {isLoading && <p className="text-sm text-muted-foreground">{t('loading')}</p>}

      <div className="space-y-3">
        {resources.map(r => {
          const isExpanded = expanded.has(r.id);
          return (
          <Card key={r.id}>
            <CardHeader className="py-3 px-4">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => toggleExpand(r.id)} className="text-muted-foreground">
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                <CardTitle className="text-base flex-1">{r.name}</CardTitle>
                <Badge variant="outline">{t(TYPE_LABELS[r.type] ?? r.type)}</Badge>
                <Badge variant={r.is_active ? 'default' : 'secondary'}>
                  {r.is_active ? t('active') : t('inactive')}
                </Badge>
                {r.resource_label && (
                  <span className="text-sm text-muted-foreground">{r.resource_label}</span>
                )}
                {canManage && (
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(r)}>
                      <Pencil size={15} />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(r.id)}>
                      <Trash2 size={15} />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            {isExpanded && (
              <CardContent className="pt-0 pb-4 px-4">
                {r.description && (
                  <p className="text-sm text-muted-foreground mb-2">{r.description}</p>
                )}
                {r.type === 'space' && (r.checkin_time || r.checkout_time) && (
                  <p className="text-xs text-muted-foreground mb-2">
                    {t('default_stay_times', { checkin: r.checkin_time || '-', checkout: r.checkout_time || '-' })}
                  </p>
                )}
                {r.services && r.services.length > 0 && (
                  <p className="text-xs text-muted-foreground mb-2">
                    {t('services_label_long')}: {r.services.map(s => s.name).join(', ')}
                  </p>
                )}
                <AvailabilityManager resourceId={r.id} resourceType={r.type} canManage={canManage} />
              </CardContent>
            )}
          </Card>
          );
        })}
        {!isLoading && resources.length === 0 && (
          <p className="text-sm text-muted-foreground">{t('no_resources_yet')}</p>
        )}
      </div>

      <ResourceDialog
        key={editing?.id ?? 'new'}
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
        editing={editing}
        onSave={d => saveMutation.mutate(d)}
        saving={saveMutation.isPending}
        users={allUsers}
      />
    </div>
  );
}
