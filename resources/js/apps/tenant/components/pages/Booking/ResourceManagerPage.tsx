import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { cmsBookingApi } from '@/shared/services/api/booking';
import type { CmsBookingResource, CreateBookingResourceData } from '@/shared/services/api/booking';
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
  capacity: string;
  resource_label: string;
  user_id: string;
  is_active: boolean;
};

function defaultForm(r?: CmsBookingResource): FormData {
  return {
    name:           r?.name ?? '',
    type:           r?.type ?? 'space',
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
}: {
  open: boolean;
  onClose: () => void;
  editing: CmsBookingResource | null;
  onSave: (data: CreateBookingResourceData) => void;
  saving: boolean;
}) {
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
          <DialogTitle>{editing ? 'Edit Resource' : 'New Resource'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Name *</Label>
            <Input required maxLength={120} value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div>
            <Label>Type *</Label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={form.type}
              onChange={e => set('type', e.target.value as 'person' | 'space' | 'equipment')}
            >
              <option value="space">Space (room, cabin, etc.)</option>
              <option value="person">Person (staff member)</option>
              <option value="equipment">Equipment</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Capacity</Label>
              <Input type="number" min={1} max={255} value={form.capacity} onChange={e => set('capacity', e.target.value)} />
            </div>
            <div>
              <Label>Label</Label>
              <Input maxLength={60} placeholder="Room 1, Suite A…" value={form.resource_label} onChange={e => set('resource_label', e.target.value)} />
            </div>
          </div>
          {form.type === 'person' && (
            <div>
              <Label>Linked user ID</Label>
              <Input type="number" min={1} placeholder="Leave blank if no account" value={form.user_id} onChange={e => set('user_id', e.target.value)} />
            </div>
          )}
          <div className="flex items-center gap-2">
            <input type="checkbox" id="res_active" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} />
            <Label htmlFor="res_active">Active</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  person:    'Person',
  space:     'Space',
  equipment: 'Equipment',
};

export function ResourceManagerPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('bookings.manage');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CmsBookingResource | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['cms-booking-resources'],
    queryFn: () => cmsBookingApi.listResources(),
  });

  const resources = data?.data ?? [];

  const saveMutation = useMutation({
    mutationFn: (payload: CreateBookingResourceData) =>
      editing
        ? cmsBookingApi.updateResource(editing.id, payload)
        : cmsBookingApi.createResource(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-booking-resources'] });
      setDialogOpen(false);
      setEditing(null);
      toast({ title: editing ? 'Resource updated' : 'Resource created' });
    },
    onError: () => toast({ title: 'Save failed', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => cmsBookingApi.deleteResource(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-booking-resources'] });
      toast({ title: 'Resource deleted' });
    },
    onError: () => toast({ title: 'Delete failed', variant: 'destructive' }),
  });

  function openNew() { setEditing(null); setDialogOpen(true); }
  function openEdit(r: CmsBookingResource) { setEditing(r); setDialogOpen(true); }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Booking Resources"
        description="Manage rooms, staff, and equipment that can be booked."
        actions={canManage ? (
          <Button onClick={openNew}>
            <Plus size={16} className="mr-1" /> New resource
          </Button>
        ) : undefined}
      />

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      <div className="space-y-3">
        {resources.map(r => (
          <Card key={r.id}>
            <CardHeader className="py-3 px-4">
              <div className="flex items-center gap-3">
                <CardTitle className="text-base flex-1">{r.name}</CardTitle>
                <Badge variant="outline">{TYPE_LABELS[r.type] ?? r.type}</Badge>
                <Badge variant={r.is_active ? 'default' : 'secondary'}>
                  {r.is_active ? 'Active' : 'Inactive'}
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
            {(r.services && r.services.length > 0) && (
              <CardContent className="pt-0 pb-3 px-4 text-xs text-muted-foreground">
                Services: {r.services.map(s => s.name).join(', ')}
              </CardContent>
            )}
          </Card>
        ))}
        {!isLoading && resources.length === 0 && (
          <p className="text-sm text-muted-foreground">No resources yet.</p>
        )}
      </div>

      <ResourceDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
        editing={editing}
        onSave={d => saveMutation.mutate(d)}
        saving={saveMutation.isPending}
      />
    </div>
  );
}
