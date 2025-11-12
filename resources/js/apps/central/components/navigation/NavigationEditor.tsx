import { useState, useEffect } from 'react';
import { Save, X, Plus, GripVertical, Trash2, ExternalLink, FileText, ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { navigations, type Navigation, type MenuItem, type CreateNavigationData } from '@/shared/services/api/navigations';
import { pages } from '@/shared/services/api/pages';
import type { Page } from '@/shared/services/api/types';
import { toast } from 'sonner';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  pointerWithin,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Simple UUID generator
const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

interface NavigationEditorProps {
  navigation: Navigation | null;
  onSave: () => void;
  onCancel: () => void;
}

interface SortableMenuItemProps {
  item: MenuItem;
  depth: number;
  isExpanded: boolean;
  hasChildren: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onIndent: (id: string) => void;
  onOutdent: (id: string) => void;
}

function SortableMenuItem({
  item,
  depth,
  isExpanded,
  hasChildren,
  onEdit,
  onDelete,
  onToggleExpand,
  onIndent,
  onOutdent,
}: SortableMenuItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, marginLeft: `${depth * 24}px` }}
      className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors bg-white mb-2"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="w-5 h-5 text-gray-400" />
      </div>

      {/* Expand/Collapse button for items with children */}
      <button
        onClick={() => onToggleExpand(item.id)}
        className={`w-5 h-5 flex items-center justify-center ${hasChildren ? 'text-gray-600' : 'text-transparent pointer-events-none'}`}
      >
        {hasChildren && (isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
      </button>

      <div className="flex-1">
        <div className="font-medium text-gray-900">{item.label}</div>
        <div className="text-sm text-gray-500">{item.url}</div>
      </div>

      <div className="flex items-center gap-2">
        {/* Indent/Outdent buttons */}
        {depth < 2 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onIndent(item.id)}
            title="Indent"
          >
            →
          </Button>
        )}
        {depth > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOutdent(item.id)}
            title="Outdent"
          >
            ←
          </Button>
        )}

        <Button variant="outline" size="sm" onClick={() => onEdit(item.id)}>
          Edit
        </Button>
        <Button variant="destructive" size="sm" onClick={() => onDelete(item.id)}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export function NavigationEditor({ navigation, onSave, onCancel }: NavigationEditorProps) {
  const [name, setName] = useState(navigation?.name || '');
  const [slug, setSlug] = useState(navigation?.slug || '');
  const [status, setStatus] = useState<'draft' | 'published'>(navigation?.status || 'draft');
  const [menuItems, setMenuItems] = useState<MenuItem[]>(navigation?.structure || []);
  const [isSaving, setIsSaving] = useState(false);
  const [publishedPages, setPublishedPages] = useState<Page[]>([]);
  const [isLoadingPages, setIsLoadingPages] = useState(true);
  const [isCustomLinkOpen, setIsCustomLinkOpen] = useState(false);
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [customLabel, setCustomLabel] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [customTarget, setCustomTarget] = useState<'_self' | '_blank'>('_self');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Flatten menu items for display (respecting expanded state)
  const flattenMenuItems = (items: MenuItem[], parentExpanded = true): Array<MenuItem & { depth: number }> => {
    const result: Array<MenuItem & { depth: number }> = [];

    const flatten = (itemList: MenuItem[], depth = 0, showItems = true) => {
      itemList.forEach(item => {
        if (showItems) {
          result.push({ ...item, depth });
        }

        const childrenToShow = showItems && expandedItems.has(item.id);
        if (item.children && item.children.length > 0) {
          flatten(item.children, depth + 1, childrenToShow);
        }
      });
    };

    flatten(items, 0, parentExpanded);
    return result;
  };

  // Convert flat list to hierarchical structure
  const buildHierarchy = (items: MenuItem[]): MenuItem[] => {
    const map = new Map<string, MenuItem>();
    const roots: MenuItem[] = [];

    // Create a map of all items
    items.forEach(item => {
      map.set(item.id, { ...item, children: [] });
    });

    // Build the hierarchy
    items.forEach(item => {
      const node = map.get(item.id)!;
      if (item.parent_id && map.has(item.parent_id)) {
        const parent = map.get(item.parent_id)!;
        if (!parent.children) parent.children = [];
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  // Get all item IDs recursively
  const getAllItemIds = (items: MenuItem[]): string[] => {
    const ids: string[] = [];
    const collect = (itemList: MenuItem[]) => {
      itemList.forEach(item => {
        ids.push(item.id);
        if (item.children) collect(item.children);
      });
    };
    collect(items);
    return ids;
  };

  const flatItems = flattenMenuItems(buildHierarchy(menuItems));
  const allItemIds = getAllItemIds(buildHierarchy(menuItems));

  // Fetch published pages
  useEffect(() => {
    const fetchPages = async () => {
      try {
        setIsLoadingPages(true);
        const response = await pages.list({ status: 'published' });
        setPublishedPages(response.data);
      } catch (error) {
        console.error('Failed to fetch pages:', error);
        toast.error('Failed to load pages');
      } finally {
        setIsLoadingPages(false);
      }
    };

    fetchPages();
  }, []);

  // Generate slug from name
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!navigation) {
      setSlug(generateSlug(value));
    }
  };

  const handleAddPage = (page: Page) => {
    // Check if page is already in menu
    const exists = menuItems.some(item => item.page_id === page.id);
    if (exists) {
      toast.error('Page already in menu');
      return;
    }

    const newItem: MenuItem = {
      id: generateId(),
      label: page.title,
      url: page.is_homepage ? '/' : `/pages/${page.slug}`,
      page_id: page.id,
      target: '_self',
      parent_id: null,
      order: menuItems.length,
    };
    setMenuItems([...menuItems, newItem]);
    toast.success('Page added to menu');
  };

  const handleAddCustomLink = () => {
    setCustomLabel('');
    setCustomUrl('');
    setCustomTarget('_self');
    setEditingItemId(null);
    setIsEditingItem(false);
    setIsCustomLinkOpen(true);
  };

  const handleEditItem = (id: string) => {
    const item = menuItems.find(i => i.id === id);
    if (item) {
      setCustomLabel(item.label);
      setCustomUrl(item.url || '');
      setCustomTarget(item.target || '_self');
      setEditingItemId(id);
      setIsEditingItem(true);
      setIsCustomLinkOpen(true);
    }
  };

  const handleSaveCustomLink = () => {
    if (!customLabel.trim() || !customUrl.trim()) {
      toast.error('Please enter both label and URL');
      return;
    }

    if (isEditingItem && editingItemId) {
      // Update existing item
      setMenuItems(menuItems.map(item =>
        item.id === editingItemId
          ? { ...item, label: customLabel, url: customUrl, target: customTarget }
          : item
      ));
      toast.success('Menu item updated');
    } else {
      // Add new custom link
      const newItem: MenuItem = {
        id: generateId(),
        label: customLabel,
        url: customUrl,
        target: customTarget,
        parent_id: null,
        order: menuItems.length,
      };
      setMenuItems([...menuItems, newItem]);
      toast.success('Custom link added');
    }

    setIsCustomLinkOpen(false);
  };

  const handleDeleteItem = (id: string) => {
    // Remove item and all its children
    const removeItemAndChildren = (items: MenuItem[], targetId: string): MenuItem[] => {
      return items.filter(item => {
        if (item.id === targetId) return false;
        if (item.children) {
          item.children = removeItemAndChildren(item.children, targetId);
        }
        return true;
      });
    };

    const hierarchy = buildHierarchy(menuItems);
    const updatedHierarchy = removeItemAndChildren(hierarchy, id);
    const flatUpdated = flattenHierarchy(updatedHierarchy);
    setMenuItems(flatUpdated);
    toast.success('Menu item removed');
  };

  const handleToggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleIndent = (id: string) => {
    const hierarchy = buildHierarchy(menuItems);
    const flatList = flattenMenuItems(hierarchy);
    const itemIndex = flatList.findIndex(item => item.id === id);

    if (itemIndex > 0) {
      const item = menuItems.find(i => i.id === id);
      const prevItem = flatList[itemIndex - 1];

      if (item && prevItem && prevItem.depth === flatList[itemIndex].depth) {
        // Update parent_id to make it a child of the previous item
        setMenuItems(items =>
          items.map(i => i.id === id ? { ...i, parent_id: prevItem.id } : i)
        );
        // Auto-expand the parent
        setExpandedItems(prev => new Set(prev).add(prevItem.id));
        toast.success('Item indented');
      }
    }
  };

  const handleOutdent = (id: string) => {
    const item = menuItems.find(i => i.id === id);
    if (item && item.parent_id) {
      const parent = menuItems.find(i => i.id === item.parent_id);
      if (parent) {
        // Move to same level as parent
        setMenuItems(items =>
          items.map(i => i.id === id ? { ...i, parent_id: parent.parent_id } : i)
        );
        toast.success('Item outdented');
      }
    }
  };

  // Flatten hierarchy back to flat array
  const flattenHierarchy = (items: MenuItem[]): MenuItem[] => {
    const result: MenuItem[] = [];
    let order = 0;

    const flatten = (itemList: MenuItem[], parentId: string | null = null) => {
      itemList.forEach(item => {
        result.push({
          ...item,
          parent_id: parentId,
          order: order++,
        });
        if (item.children && item.children.length > 0) {
          flatten(item.children, item.id);
        }
      });
    };

    flatten(items);
    return result;
  };

  const handleDragStart = (event: DragStartEvent) => {
    // Could be used for DragOverlay in the future
    console.log('Dragging:', event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    setMenuItems((items) => {
      const hierarchy = buildHierarchy(items);
      const flatList = flattenMenuItems(hierarchy);

      const oldIndex = flatList.findIndex((item) => item.id === active.id);
      const newIndex = flatList.findIndex((item) => item.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return items;

      // Reorder at the same level
      const reordered = arrayMove(flatList, oldIndex, newIndex);

      // Rebuild hierarchy from reordered flat list
      const updatedHierarchy = buildHierarchy(
        reordered.map((item, index) => ({
          ...item,
          order: index,
        }))
      );

      return flattenHierarchy(updatedHierarchy);
    });
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a navigation name');
      return;
    }

    if (!slug.trim()) {
      toast.error('Please enter a slug');
      return;
    }

    try {
      setIsSaving(true);

      const data: CreateNavigationData = {
        name: name.trim(),
        slug: slug.trim(),
        structure: menuItems,
  status,
      };

      if (navigation) {
        await navigations.update(navigation.id, data);
        toast.success('Navigation updated successfully');
      } else {
        await navigations.create(data);
        toast.success('Navigation created successfully');
      }

      onSave();
    } catch (error: unknown) {
      console.error('Failed to save navigation:', error);
      toast.error('Failed to save navigation');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {navigation ? 'Edit Navigation' : 'Create Navigation'}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {navigation ? `Editing: ${navigation.name}` : 'Create a new navigation menu'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Navigation Settings</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Main Menu"
            />
          </div>
          <div>
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="main-menu"
            />
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(value: 'draft' | 'published') => setStatus(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-2 gap-6">
        {/* Left: Available Pages */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Published Pages</h2>

          {isLoadingPages ? (
            <div className="text-center py-8 text-gray-500">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-2"></div>
              <p>Loading pages...</p>
            </div>
          ) : publishedPages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p>No published pages yet</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {publishedPages.map((page) => (
                <div
                  key={page.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-900">{page.title}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddPage(page)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleAddCustomLink}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Add Custom Link
            </Button>
          </div>
        </div>

        {/* Right: Menu Structure */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Menu Structure</h2>

          {menuItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="mb-2">No menu items yet</p>
              <p className="text-sm">Add pages from the left or create custom links</p>
            </div>
          ) : (
            <div>
              <div className="text-sm text-gray-600 mb-3 flex items-center gap-2">
                <span>💡 Tip: Use → and ← buttons to indent/outdent items, or drag to reorder</span>
              </div>
              <DndContext
                sensors={sensors}
                collisionDetection={pointerWithin}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={allItemIds}
                  strategy={verticalListSortingStrategy}
                >
                  <div>
                    {flatItems.map((item) => {
                      const hasChildren = menuItems.some(i => i.parent_id === item.id);
                      return (
                        <SortableMenuItem
                          key={item.id}
                          item={item}
                          depth={item.depth}
                          isExpanded={expandedItems.has(item.id)}
                          hasChildren={hasChildren}
                          onEdit={handleEditItem}
                          onDelete={handleDeleteItem}
                          onToggleExpand={handleToggleExpand}
                          onIndent={handleIndent}
                          onOutdent={handleOutdent}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}
        </div>
      </div>

      {/* Custom Link Dialog */}
      <Dialog open={isCustomLinkOpen} onOpenChange={setIsCustomLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditingItem ? 'Edit Menu Item' : 'Add Custom Link'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="custom-label">Label</Label>
              <Input
                id="custom-label"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="Link text"
              />
            </div>
            <div>
              <Label htmlFor="custom-url">URL</Label>
              <Input
                id="custom-url"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://example.com or /about"
              />
            </div>
            <div>
              <Label htmlFor="custom-target">Open in</Label>
              <Select value={customTarget} onValueChange={(value: '_self' | '_blank') => setCustomTarget(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_self">Same Window</SelectItem>
                  <SelectItem value="_blank">New Tab</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCustomLinkOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCustomLink}>
              {isEditingItem ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
