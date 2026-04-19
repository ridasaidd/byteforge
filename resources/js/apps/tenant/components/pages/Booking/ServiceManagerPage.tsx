import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Link2, Unlink, ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cmsBookingApi } from '@/shared/services/api/booking';
import type { CmsBookingService, CmsBookingResource, CreateBookingServiceData } from '@/shared/services/api/booking';
import { PageHeader } from '@/shared/components/molecules/PageHeader';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { useToast } from '@/shared/hooks';
import { usePermissions } from '@/shared/hooks/usePermissions';

// ─── Types ────────────────────────────────────────────────────────────────────

type FormData = {
  name: string;
  description: string;
  booking_mode: 'slot' | 'range';
  duration_minutes: string;
  slot_interval_minutes: string;
  min_nights: string;
  max_nights: string;
  buffer_minutes: string;
  advance_notice_hours: string;
  price: string;
  currency: string;
  requires_payment: boolean;
  is_active: boolean;
};

function defaultForm(svc?: CmsBookingService): FormData {
  return {
    name:                   svc?.name ?? '',
    description:            svc?.description ?? '',
    booking_mode:           svc?.booking_mode ?? 'slot',
    duration_minutes:       String(svc?.duration_minutes ?? 60),
    slot_interval_minutes:  String(svc?.slot_interval_minutes ?? 30),
    min_nights:             String(svc?.min_nights ?? ''),
    max_nights:             String(svc?.max_nights ?? ''),
    buffer_minutes:         String(svc?.buffer_minutes ?? 0),
    advance_notice_hours:   String(svc?.advance_notice_hours ?? 0),
    price:                  String(svc?.price ?? ''),
    currency:               svc?.currency ?? 'SEK',
    requires_payment:       svc?.requires_payment ?? false,
    is_active:              svc?.is_active ?? true,
  };
}

function formToPayload(f: FormData): CreateBookingServiceData {
  return {
    name:                   f.name,
    description:            f.description || null,
    booking_mode:           f.booking_mode,
    duration_minutes:       f.duration_minutes ? parseInt(f.duration_minutes) : null,
    slot_interval_minutes:  f.slot_interval_minutes ? parseInt(f.slot_interval_minutes) : null,
    min_nights:             f.min_nights ? parseInt(f.min_nights) : null,
    max_nights:             f.max_nights ? parseInt(f.max_nights) : null,
    buffer_minutes:         parseInt(f.buffer_minutes) || 0,
    advance_notice_hours:   parseInt(f.advance_notice_hours) || 0,
    price:                  f.price ? parseFloat(f.price) : null,
    currency:               f.currency || 'SEK',
    requires_payment:       f.requires_payment,
    is_active:              f.is_active,
  };
}

// ─── Service form dialog ──────────────────────────────────────────────────────

function ServiceDialog({
  open,
  onClose,
  editing,
  onSave,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  editing: CmsBookingService | null;
  onSave: (data: CreateBookingServiceData) => void;
  saving: boolean;
}) {
  const { t } = useTranslation('booking');
  const [form, setForm] = useState<FormData>(() => defaultForm(editing ?? undefined));
  const set = (k: keyof FormData, v: string | boolean) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const isSlot = form.booking_mode === 'slot';

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(formToPayload(form));
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? t('edit_service_title') : t('new_service_title')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="service-name">{t('name_required')}</Label>
            <Input id="service-name" name="name" required maxLength={120} value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="service-description">{t('description')}</Label>
            <Input id="service-description" name="description" value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          <div>
            <Label>{t('booking_mode_required')}</Label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={form.booking_mode}
              onChange={e => set('booking_mode', e.target.value as 'slot' | 'range')}
            >
              <option value="slot">{t('booking_mode_slot')}</option>
              <option value="range">{t('booking_mode_range')}</option>
            </select>
          </div>
          {isSlot ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t('duration_minutes')}</Label>
                  <Input type="number" min={1} value={form.duration_minutes} onChange={e => set('duration_minutes', e.target.value)} />
                </div>
                <div>
                  <Label>{t('slot_interval_minutes')}</Label>
                  <Input type="number" min={1} value={form.slot_interval_minutes} onChange={e => set('slot_interval_minutes', e.target.value)} />
                </div>
              </div>
              <div>
                <Label>{t('buffer_between_bookings')}</Label>
                <Input type="number" min={0} value={form.buffer_minutes} onChange={e => set('buffer_minutes', e.target.value)} />
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('min_nights')}</Label>
                <Input type="number" min={1} value={form.min_nights} onChange={e => set('min_nights', e.target.value)} />
              </div>
              <div>
                <Label>{t('max_nights')}</Label>
                <Input type="number" min={1} value={form.max_nights} onChange={e => set('max_nights', e.target.value)} />
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('price')}</Label>
              <Input type="number" min={0} step="0.01" value={form.price} onChange={e => set('price', e.target.value)} />
            </div>
            <div>
              <Label>{t('currency')}</Label>
              <Input maxLength={3} value={form.currency} onChange={e => set('currency', e.target.value.toUpperCase())} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="requires_payment" checked={form.requires_payment} onChange={e => set('requires_payment', e.target.checked)} />
            <Label htmlFor="requires_payment">{t('require_payment_before_confirmation')}</Label>
          </div>
          <div>
            <Label>{t('advance_notice_hours')}</Label>
            <Input type="number" min={0} value={form.advance_notice_hours} onChange={e => set('advance_notice_hours', e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} />
            <Label htmlFor="is_active">{t('active')}</Label>
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

// ─── Attach resource dialog ───────────────────────────────────────────────────

function AttachResourceDialog({
  open,
  onClose,
  service,
  allResources,
  onAttach,
  onDetach,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  service: CmsBookingService;
  allResources: CmsBookingResource[];
  onAttach: (resourceId: number) => void;
  onDetach: (resourceId: number) => void;
  saving: boolean;
}) {
  const { t } = useTranslation('booking');
  const attachedIds = new Set(service.resources?.map(r => r.id) ?? []);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('manage_resources_title', { name: service.name })}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {allResources.length === 0 && (
            <p className="text-sm text-muted-foreground">{t('no_resources_found')}</p>
          )}
          {allResources.map(r => {
            const attached = attachedIds.has(r.id);
            return (
              <div key={r.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                <span>{r.name} <span className="text-muted-foreground">({r.type})</span></span>
                <Button
                  size="sm"
                  variant={attached ? 'destructive' : 'outline'}
                  disabled={saving}
                  onClick={() => attached ? onDetach(r.id) : onAttach(r.id)}
                >
                  {attached ? <><Unlink size={14} className="mr-1" />{t('detach')}</> : <><Link2 size={14} className="mr-1" />{t('attach')}</>}
                </Button>
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('done')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function ServiceManagerPage() {
  const { t } = useTranslation('booking');
  const { toast } = useToast();
  const qc = useQueryClient();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('bookings.manage');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CmsBookingService | null>(null);
  const [attachDialog, setAttachDialog] = useState<CmsBookingService | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const { data: servicesData, isLoading } = useQuery({
    queryKey: ['cms-booking-services'],
    queryFn: () => cmsBookingApi.listServices(),
  });

  const { data: resourcesData } = useQuery({
    queryKey: ['cms-booking-resources'],
    queryFn: () => cmsBookingApi.listResources(),
  });

  const services = servicesData?.data ?? [];
  const allResources = resourcesData?.data ?? [];

  const saveMutation = useMutation({
    mutationFn: (data: CreateBookingServiceData) =>
      editing
        ? cmsBookingApi.updateService(editing.id, data)
        : cmsBookingApi.createService(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-booking-services'] });
      setDialogOpen(false);
      setEditing(null);
      toast({ title: editing ? t('service_updated') : t('service_created') });
    },
    onError: () => toast({ title: t('save_failed'), variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => cmsBookingApi.deleteService(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-booking-services'] });
      toast({ title: t('service_deleted') });
    },
    onError: () => toast({ title: t('delete_failed'), variant: 'destructive' }),
  });

  const attachMutation = useMutation({
    mutationFn: ({ sid, rid }: { sid: number; rid: number }) =>
      cmsBookingApi.attachResource(sid, rid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-booking-services'] });
    },
    onError: () => toast({ title: t('attach_failed'), variant: 'destructive' }),
  });

  const detachMutation = useMutation({
    mutationFn: ({ sid, rid }: { sid: number; rid: number }) =>
      cmsBookingApi.detachResource(sid, rid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-booking-services'] });
    },
    onError: () => toast({ title: t('detach_failed'), variant: 'destructive' }),
  });

  function openNew() { setEditing(null); setDialogOpen(true); }
  function openEdit(svc: CmsBookingService) { setEditing(svc); setDialogOpen(true); }
  function toggleExpand(id: number) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  // When attachDialog service data changes (after attach/detach), sync from fresh list
  const attachDialogService = attachDialog
    ? (services.find(s => s.id === attachDialog.id) ?? attachDialog)
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('services_page_title')}
        description={t('services_page_description')}
        actions={canManage ? (
          <Button onClick={openNew}>
            <Plus size={16} className="mr-1" /> {t('new_service')}
          </Button>
        ) : undefined}
      />

      {isLoading && (
        <p className="text-sm text-muted-foreground">{t('loading')}</p>
      )}

      <div className="space-y-3">
        {services.map(svc => {
          const isExpanded = expanded.has(svc.id);
          return (
            <Card key={svc.id} data-testid="service-card" data-service-id={svc.id}>
              <CardHeader className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => toggleExpand(svc.id)} className="text-muted-foreground">
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  <CardTitle className="text-base flex-1">{svc.name}</CardTitle>
                  <Badge variant={svc.is_active ? 'default' : 'secondary'}>
                    {svc.is_active ? t('active') : t('inactive')}
                  </Badge>
                  <Badge variant="outline">{svc.booking_mode === 'slot' ? t('booking_mode_slot') : t('booking_mode_range')}</Badge>
                  {svc.requires_payment && (
                    <Badge variant="outline">{t('paid')}</Badge>
                  )}
                  {svc.price != null && (
                    <span className="text-sm text-muted-foreground">{svc.price} {svc.currency}</span>
                  )}
                  {canManage && (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setAttachDialog(svc)} title={t('manage_resources_action')}>
                        <Link2 size={15} />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(svc)} title={t('edit_service_title')} aria-label={t('edit_service_title')} data-testid={`service-edit-${svc.id}`}>
                        <Pencil size={15} />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(svc.id)} title={t('delete_service')} aria-label={t('delete_service')}>
                        <Trash2 size={15} />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              {isExpanded && (
                <CardContent className="pt-0 pb-3 px-4 text-sm text-muted-foreground space-y-1">
                  {svc.description && <p>{svc.description}</p>}
                  {svc.booking_mode === 'slot' && (
                    <p>{t('service_details_slot', { duration: svc.duration_minutes, interval: svc.slot_interval_minutes, buffer: svc.buffer_minutes })}</p>
                  )}
                  {svc.booking_mode === 'range' && (
                    <p>
                      {svc.min_nights != null ? t('service_details_range_min', { count: svc.min_nights }) : ''}
                      {svc.min_nights != null && svc.max_nights != null ? ' · ' : ''}
                      {svc.max_nights != null ? t('service_details_range_max', { count: svc.max_nights }) : ''}
                    </p>
                  )}
                  <p>{t('resources_label')}: {svc.resources?.map(r => r.name).join(', ') || t('none')}</p>
                </CardContent>
              )}
            </Card>
          );
        })}
        {!isLoading && services.length === 0 && (
          <p className="text-sm text-muted-foreground">{t('no_services_yet')}</p>
        )}
      </div>

      <ServiceDialog
        key={editing?.id ?? 'new'}
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
        editing={editing}
        onSave={d => saveMutation.mutate(d)}
        saving={saveMutation.isPending}
      />

      {attachDialogService && (
        <AttachResourceDialog
          open={!!attachDialog}
          onClose={() => setAttachDialog(null)}
          service={attachDialogService}
          allResources={allResources}
          onAttach={rid => attachMutation.mutate({ sid: attachDialogService.id, rid })}
          onDetach={rid => detachMutation.mutate({ sid: attachDialogService.id, rid })}
          saving={attachMutation.isPending || detachMutation.isPending}
        />
      )}
    </div>
  );
}
