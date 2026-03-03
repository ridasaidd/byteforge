import { useEffect, useMemo, useState } from 'react';
import { navigations, type MenuItem, type Navigation } from '@/shared/services/api/navigations';

function sortMenuItems(items: MenuItem[]): MenuItem[] {
  return items
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((item) => ({
      ...item,
      children: item.children ? sortMenuItems(item.children) : undefined,
    }));
}

function buildHierarchyFromFlat(items: MenuItem[]): MenuItem[] {
  const map = new Map<string, MenuItem>();
  const roots: MenuItem[] = [];

  items.forEach((item, index) => {
    const id = item.id || `nav-item-${index}`;
    map.set(id, {
      ...item,
      id,
      children: [],
    });
  });

  items.forEach((item, index) => {
    const id = item.id || `nav-item-${index}`;
    const node = map.get(id);
    if (!node) return;

    if (item.parent_id && map.has(item.parent_id)) {
      map.get(item.parent_id)?.children?.push(node);
      return;
    }

    roots.push(node);
  });

  return sortMenuItems(roots);
}

function normalizeMenuItems(items: MenuItem[] | undefined): MenuItem[] {
  if (!items || items.length === 0) return [];

  const hasParentReferences = items.some((item) => !!item.parent_id);
  if (hasParentReferences) {
    return buildHierarchyFromFlat(items);
  }

  return sortMenuItems(items);
}

function findMetadataNavigation(metadata: { navigations?: unknown[] } | undefined, navigationId: number | undefined): Navigation | null {
  if (!navigationId || !Array.isArray(metadata?.navigations)) return null;

  const match = metadata.navigations.find((entry) => {
    if (!entry || typeof entry !== 'object') return false;
    const nav = entry as { id?: unknown };
    return Number(nav.id) === navigationId;
  });

  if (!match || typeof match !== 'object') return null;
  return match as Navigation;
}

export function useNavData(
  navigationId: number | undefined,
  placeholderItems: MenuItem[] | undefined,
  metadata?: { navigations?: unknown[] }
): { items: MenuItem[]; loading: boolean } {
  const metadataNavigation = useMemo(
    () => findMetadataNavigation(metadata, navigationId),
    [metadata, navigationId]
  );

  const [apiNavigation, setApiNavigation] = useState<Navigation | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (metadataNavigation) {
      setLoading(false);
      setApiNavigation(null);
      return;
    }

    if (!navigationId) {
      setApiNavigation(null);
      setLoading(false);
      return;
    }

    let isDisposed = false;
    setLoading(true);

    navigations
      .get(navigationId)
      .then((response) => {
        if (!isDisposed) {
          setApiNavigation(response.data);
        }
      })
      .catch(() => {
        if (!isDisposed) {
          setApiNavigation(null);
        }
      })
      .finally(() => {
        if (!isDisposed) {
          setLoading(false);
        }
      });

    return () => {
      isDisposed = true;
    };
  }, [navigationId, metadataNavigation]);

  const items = useMemo(() => {
    // If a real navigation is selected (navigationId is set), never fall back to
    // placeholder items — placeholders are exclusively for the theme builder where
    // no navigationId exists yet.
    const sourceItems = metadataNavigation?.structure
      ?? apiNavigation?.structure
      ?? (navigationId ? undefined : placeholderItems)
      ?? [];

    return normalizeMenuItems(sourceItems);
  }, [metadataNavigation, apiNavigation, navigationId, placeholderItems]);

  return {
    items,
    loading: !metadataNavigation && loading,
  };
}
