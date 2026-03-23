import { useState } from 'react';
import { MapPin, Phone, Mail, Plus, Pencil, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workshops } from '@/shared/services/api/workshops';
import { DataTable, type Column } from '@/shared/components/molecules/DataTable';
import { PageHeader } from '@/shared/components/molecules/PageHeader';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { useToast } from '@/shared/hooks';
import { usePermissions } from '@/shared/hooks/usePermissions';
import type { Workshop, CreateWorkshopData } from '@/shared/services/api/types';

// ============================================================================
// Empty form state
// ============================================================================

const emptyForm = (): CreateWorkshopData => ({
  name: '',
  description: '',
  phone: '',
  email: '',
  website: '',
  address: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'SE',
  latitude: undefined,
  longitude: undefined,
  specializations: [],
  is_active: true,
});

// ============================================================================
// Component
// ============================================================================

export function WorkshopsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('workshops.manage');

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CreateWorkshopData>(emptyForm());
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Queries
  const workshopsQuery = useQuery({
    queryKey: ['workshops', page, search],
    queryFn: () => workshops.list({ page, per_page: 15, search: search || undefined }),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: CreateWorkshopData) => workshops.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workshops'] });
      setDialogOpen(false);
      toast({ title: 'Workshop created.' });
    },
    onError: () => toast({ title: 'Failed to create workshop.', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateWorkshopData }) =>
      workshops.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workshops'] });
      setDialogOpen(false);
      setEditingId(null);
      toast({ title: 'Workshop updated.' });
    },
    onError: () => toast({ title: 'Failed to update workshop.', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => workshops.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workshops'] });
      setDeleteConfirmId(null);
      toast({ title: 'Workshop deleted.' });
    },
    onError: () => toast({ title: 'Failed to delete workshop.', variant: 'destructive' }),
  });

  // Handlers
  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (workshop: Workshop) => {
    setEditingId(workshop.id);
    setForm({
      name: workshop.name,
      description: workshop.description ?? '',
      phone: workshop.phone ?? '',
      email: workshop.email ?? '',
      website: workshop.website ?? '',
      address: workshop.address ?? '',
      city: workshop.city ?? '',
      state: workshop.state ?? '',
      postal_code: workshop.postal_code ?? '',
      country: workshop.country,
      latitude: workshop.latitude ?? undefined,
      longitude: workshop.longitude ?? undefined,
      specializations: workshop.specializations ?? [],
      is_active: workshop.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleSpecializations = (value: string) => {
    setForm((f) => ({
      ...f,
      specializations: value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    }));
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // Table columns
  const columns: Column<Workshop>[] = [
    {
      key: 'name',
      label: 'Workshop',
      render: (w) => (
        <div>
          <p className="font-medium">{w.name}</p>
          {w.city && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin size={12} /> {w.city}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'contact',
      label: 'Contact',
      render: (w) => (
        <div className="text-sm space-y-0.5">
          {w.phone && (
            <p className="flex items-center gap-1 text-muted-foreground">
              <Phone size={12} /> {w.phone}
            </p>
          )}
          {w.email && (
            <p className="flex items-center gap-1 text-muted-foreground">
              <Mail size={12} /> {w.email}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'specializations',
      label: 'Specializations',
      render: (w) => (
        <div className="flex flex-wrap gap-1">
          {(w.specializations ?? []).slice(0, 3).map((s) => (
            <Badge key={s} variant="secondary" className="text-xs">
              {s}
            </Badge>
          ))}
          {(w.specializations ?? []).length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{(w.specializations ?? []).length - 3}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (w) => (
        <div className="flex items-center gap-2">
          {w.is_active ? (
            <Badge variant="default" className="flex items-center gap-1">
              <CheckCircle size={12} /> Active
            </Badge>
          ) : (
            <Badge variant="secondary" className="flex items-center gap-1">
              <XCircle size={12} /> Inactive
            </Badge>
          )}
          {w.is_verified && (
            <Badge variant="outline" className="text-xs">Verified</Badge>
          )}
        </div>
      ),
    },
    ...(canManage
      ? [
          {
            key: 'actions' as string,
            label: '',
            render: (w: Workshop) => (
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => openEdit(w)}>
                  <Pencil size={14} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteConfirmId(w.id)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ];

  const items = (workshopsQuery.data as { data?: Workshop[] } | undefined)?.data ?? [];
  const meta = (workshopsQuery.data as { meta?: { total?: number; last_page?: number } } | undefined)?.meta;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workshops"
        description="Manage mechanic workshops listed on this tenant."
        actions={
          canManage ? (
            <Button onClick={openCreate} className="flex items-center gap-2">
              <Plus size={16} /> Add Workshop
            </Button>
          ) : null
        }
      />

      {/* Search */}
      <div className="flex gap-3">
        <Input
          placeholder="Search by name or city…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-xs"
        />
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={items}
        isLoading={workshopsQuery.isLoading}
        emptyMessage="No workshops found."
      />

      {/* Pagination */}
      {meta && meta.last_page && meta.last_page > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="flex items-center text-sm text-muted-foreground">
            Page {page} of {meta.last_page}
          </span>
          <Button variant="outline" size="sm" disabled={page >= (meta.last_page ?? 1)} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Workshop' : 'Add Workshop'}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            {/* Name */}
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Workshop name"
              />
            </div>

            {/* Description */}
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="About the workshop…"
                rows={3}
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+46 70 000 00 00"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="workshop@example.com"
              />
            </div>

            {/* Website */}
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={form.website ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                placeholder="https://workshop.example.com"
              />
            </div>

            {/* Address */}
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="address">Street Address</Label>
              <Input
                id="address"
                value={form.address ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Street and number"
              />
            </div>

            {/* City */}
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={form.city ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                placeholder="City"
              />
            </div>

            {/* Postal code */}
            <div className="space-y-1.5">
              <Label htmlFor="postal_code">Postal Code</Label>
              <Input
                id="postal_code"
                value={form.postal_code ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, postal_code: e.target.value }))}
                placeholder="12345"
              />
            </div>

            {/* Latitude */}
            <div className="space-y-1.5">
              <Label htmlFor="latitude">Latitude</Label>
              <Input
                id="latitude"
                type="number"
                step="0.0000001"
                value={form.latitude ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, latitude: e.target.value ? parseFloat(e.target.value) : undefined }))
                }
                placeholder="59.3293"
              />
            </div>

            {/* Longitude */}
            <div className="space-y-1.5">
              <Label htmlFor="longitude">Longitude</Label>
              <Input
                id="longitude"
                type="number"
                step="0.0000001"
                value={form.longitude ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, longitude: e.target.value ? parseFloat(e.target.value) : undefined }))
                }
                placeholder="18.0686"
              />
            </div>

            {/* Specializations */}
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="specializations">Specializations</Label>
              <Input
                id="specializations"
                value={(form.specializations ?? []).join(', ')}
                onChange={(e) => handleSpecializations(e.target.value)}
                placeholder="Oil change, Tyres, Brakes (comma-separated)"
              />
              <p className="text-xs text-muted-foreground">Separate specializations with commas.</p>
            </div>

            {/* Active */}
            <div className="flex items-center gap-2 sm:col-span-2">
              <input
                type="checkbox"
                id="is_active"
                checked={form.is_active ?? true}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="is_active">Active (visible to customers)</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !form.name.trim()}>
              {isSaving ? 'Saving…' : editingId ? 'Save changes' : 'Create workshop'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete workshop?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This action cannot be undone. The workshop listing will be permanently removed.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
