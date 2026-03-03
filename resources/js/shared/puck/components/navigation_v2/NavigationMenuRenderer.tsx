import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Menu, X } from 'lucide-react';
import { registerOverlayPortal } from '@puckeditor/core';
import type { ColorValue, FontWeightValue, ResponsiveFontSizeValue, ResponsiveValue } from '../../fields';
import { usePuckEditMode, useTheme, useWindowWidth } from '@/shared/hooks';
import { DesktopNav } from './desktop/DesktopNav';
import { MobileNav } from './mobile/MobileNav';
import { buildNavCss } from './shared/navCssBuilder';
import { MOBILE_BREAKPOINTS, type NavigationMenuProps } from './shared/navTypes';
import { useNavData } from './shared/useNavData';

interface PuckContext {
  dragRef?: ((element: Element | null) => void) | null;
  metadata?: { navigations?: unknown[] };
}

function normalizeNavigationId(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value !== null && 'value' in value) {
    const normalized = Number((value as { value?: unknown }).value);
    return Number.isNaN(normalized) ? undefined : normalized;
  }

  return undefined;
}

function resolveColor(
  value: ColorValue | string | undefined,
  resolve: (path: string, fallback?: string) => string
): string | undefined {
  if (!value) return undefined;

  if (typeof value === 'string') {
    if (value.startsWith('#') || value.startsWith('rgb') || value.startsWith('var(')) {
      return value;
    }

    return resolve(value, '');
  }

  if (value.type === 'custom') {
    return value.value || undefined;
  }

  if (value.type === 'theme') {
    const raw = value.value;
    if (!raw) return undefined;
    if (raw.startsWith('#') || raw.startsWith('rgb') || raw.startsWith('var(')) {
      return raw;
    }

    return resolve(raw, '');
  }

  return value.value || undefined;
}

function isResponsiveColorValue(value: unknown): value is { mobile: ColorValue; tablet?: ColorValue; desktop?: ColorValue } {
  return typeof value === 'object' && value !== null && 'mobile' in value;
}

function resolveResponsiveColor(
  value: ResponsiveValue<ColorValue> | ColorValue | string | undefined,
  resolve: (path: string, fallback?: string) => string
): ResponsiveValue<string> | string | undefined {
  if (!value) return undefined;

  if (isResponsiveColorValue(value)) {
    const resolved: { mobile: string; tablet?: string; desktop?: string } = {
      mobile: resolveColor(value.mobile, resolve) || '',
    };

    if (value.tablet !== undefined) {
      resolved.tablet = resolveColor(value.tablet, resolve) || '';
    }

    if (value.desktop !== undefined) {
      resolved.desktop = resolveColor(value.desktop, resolve) || '';
    }

    return resolved;
  }

  return resolveColor(value as ColorValue | string | undefined, resolve);
}

function resolveFontWeight(
  value: FontWeightValue | undefined,
  resolve: (path: string, fallback?: string) => string
): string | undefined {
  if (!value) return undefined;

  if (typeof value === 'string') return value;
  if (typeof value === 'object' && 'value' in value) {
    if (!value.value) return undefined;
    if (value.type === 'theme') {
      return resolve(value.value, '');
    }

    return value.value;
  }

  return undefined;
}

function normalizeCssLength(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return /^-?\d*\.?\d+$/.test(trimmed) ? `${trimmed}px` : trimmed;
}

function resolveResponsiveFontSize(
  value: ResponsiveFontSizeValue | undefined,
  resolve: (path: string, fallback?: string) => string
): ResponsiveFontSizeValue | undefined {
  if (!value || typeof value !== 'object') return value;

  const breakpoints: Array<'mobile' | 'tablet' | 'desktop'> = ['mobile', 'tablet', 'desktop'];
  const resolved: Record<string, unknown> = {};

  breakpoints.forEach((breakpoint) => {
    const entry = (value as Record<string, unknown>)[breakpoint];
    if (!entry) return;

    if (typeof entry === 'string') {
      const resolvedValue = entry.startsWith('typography.') ? resolve(entry, entry) : entry;
      resolved[breakpoint] = normalizeCssLength(resolvedValue || entry);
      return;
    }

    if (typeof entry === 'object' && entry !== null && 'type' in (entry as Record<string, unknown>) && 'value' in (entry as Record<string, unknown>)) {
      const fontSizeValue = entry as { type?: string; value?: string };
      const rawValue = fontSizeValue.value || '';
      const resolvedValue = fontSizeValue.type === 'theme' ? resolve(rawValue, rawValue) : rawValue;
      resolved[breakpoint] = {
        type: 'custom',
        value: normalizeCssLength(resolvedValue || rawValue),
      };
      return;
    }

    resolved[breakpoint] = entry;
  });

  return resolved as ResponsiveFontSizeValue;
}

// eslint-disable-next-line react-refresh/only-export-components
export function NavigationMenuRenderer(props: NavigationMenuProps & { puck?: PuckContext }) {
  const {
    id,
    navigationId,
    placeholderItems,
    customClassName,
    customId,
    customCss,
    mobileBreakpoint = 'md',
    mobileVariant = 'dropdown',
    toggleIconSize = 24,
    closeButtonIconSize = 20,
    puck,
  } = props;

  const { resolve } = useTheme();
  const isEditing = usePuckEditMode();
  const width = useWindowWidth();
  const [isOpen, setIsOpen] = useState(false);
  const registerToggleButton = useCallback((element: HTMLButtonElement | null) => {
    if (!isEditing || !element) return;
    registerOverlayPortal(element);
  }, [isEditing]);

  const normalizedNavigationId = normalizeNavigationId(navigationId);
  const { items, loading } = useNavData(normalizedNavigationId, placeholderItems, puck?.metadata);

  const breakpointWidth = MOBILE_BREAKPOINTS[mobileBreakpoint] ?? MOBILE_BREAKPOINTS.md;
  const isMobile = width < breakpointWidth;
  const className = `nav-menu-${id || 'default'}`;

  useEffect(() => {
    if (!isEditing && !isMobile && isOpen) {
      setIsOpen(false);
    }
  }, [isEditing, isMobile, isOpen]);

  const css = useMemo(() => {
    return buildNavCss({
      className,
      display: props.display,
      direction: props.direction,
      justify: props.justify,
      align: props.align,
      wrap: props.wrap,
      flexGap: props.flexGap,
      width: props.width,
      maxWidth: props.maxWidth,
      padding: props.padding,
      margin: props.margin,
      border: props.border,
      borderRadius: props.borderRadius,
      shadow: props.shadow,
      position: props.position,
      positionOffset: props.positionOffset,
      transform: props.transform,
      zIndex: props.zIndex,
      opacity: props.opacity,
      overflow: props.overflow,
      visibility: props.visibility,
      backgroundColor: resolveResponsiveColor(props.backgroundColor, resolve),

      itemColor: resolveResponsiveColor(props.itemColor, resolve),
      itemHoverColor: resolveResponsiveColor(props.itemHoverColor, resolve),
      itemActiveColor: resolveResponsiveColor(props.itemActiveColor, resolve),
      itemBackgroundColor: resolveResponsiveColor(props.itemBackgroundColor, resolve),
      itemHoverBackgroundColor: resolveResponsiveColor(props.itemHoverBackgroundColor, resolve),
      itemActiveBackgroundColor: resolveResponsiveColor(props.itemActiveBackgroundColor, resolve),
      itemPadding: props.itemPadding,
      fontFamily: props.fontFamily,
      fontSize: resolveResponsiveFontSize(props.fontSize, resolve),
      fontWeight: resolveFontWeight(props.fontWeight, resolve),
      lineHeight: props.lineHeight,
      letterSpacing: props.letterSpacing,
      textTransform: props.textTransform,
      textDecoration: props.textDecoration,
      itemBorderRadius: props.itemBorderRadius,
      cursor: props.cursor,
      transition: props.transition,

      subItemColor: resolveResponsiveColor(props.subItemColor, resolve),
      subItemHoverColor: resolveResponsiveColor(props.subItemHoverColor, resolve),
      subItemBackgroundColor: resolveResponsiveColor(props.subItemBackgroundColor, resolve),
      subItemHoverBackgroundColor: resolveResponsiveColor(props.subItemHoverBackgroundColor, resolve),
      subItemPadding: props.subItemPadding,
      subFontFamily: props.subFontFamily,
      subFontSize: resolveResponsiveFontSize(props.subFontSize, resolve),
      subFontWeight: resolveFontWeight(props.subFontWeight, resolve),
      dropdownBackgroundColor: resolveResponsiveColor(props.dropdownBackgroundColor, resolve),
      dropdownBorderRadius: props.dropdownBorderRadius,
      dropdownShadow: props.dropdownShadow,
      dropdownMinWidth: props.dropdownMinWidth,

      mobileBreakpoint,
      mobileVariant,
      drawerWidth: props.drawerWidth,
      drawerBackgroundColor: resolveResponsiveColor(props.drawerBackgroundColor, resolve),
      drawerOverlayColor: resolveResponsiveColor(props.drawerOverlayColor, resolve),
      drawerOverlayOpacity: props.drawerOverlayOpacity,
      closeButtonColor: resolveResponsiveColor(props.closeButtonColor, resolve),
      closeButtonBackgroundColor: resolveResponsiveColor(props.closeButtonBackgroundColor, resolve),
      closeButtonSize: props.closeButtonSize,
      closeButtonIconSize,
      closeButtonOffset: props.closeButtonOffset,
      navItemsPadding: props.navItemsPadding,
      navItemsMargin: props.navItemsMargin,
      toggleColor: resolveResponsiveColor(props.toggleColor, resolve),
      toggleIconSize,

      customCss,
    });
  }, [
    className,
    props.display,
    props.direction,
    props.justify,
    props.align,
    props.wrap,
    props.flexGap,
    props.width,
    props.maxWidth,
    props.padding,
    props.margin,
    props.border,
    props.borderRadius,
    props.shadow,
    props.position,
    props.positionOffset,
    props.transform,
    props.zIndex,
    props.opacity,
    props.overflow,
    props.visibility,
    props.backgroundColor,
    props.itemColor,
    props.itemHoverColor,
    props.itemActiveColor,
    props.itemBackgroundColor,
    props.itemHoverBackgroundColor,
    props.itemActiveBackgroundColor,
    props.itemPadding,
    props.fontFamily,
    props.fontSize,
    props.fontWeight,
    props.lineHeight,
    props.letterSpacing,
    props.textTransform,
    props.textDecoration,
    props.itemBorderRadius,
    props.cursor,
    props.transition,
    props.subItemColor,
    props.subItemHoverColor,
    props.subItemBackgroundColor,
    props.subItemHoverBackgroundColor,
    props.subItemPadding,
    props.subFontFamily,
    props.subFontSize,
    props.subFontWeight,
    props.dropdownBackgroundColor,
    props.dropdownBorderRadius,
    props.dropdownShadow,
    props.dropdownMinWidth,
    mobileBreakpoint,
    mobileVariant,
    props.drawerWidth,
    props.drawerBackgroundColor,
    props.drawerOverlayColor,
    props.drawerOverlayOpacity,
    props.closeButtonColor,
    props.closeButtonBackgroundColor,
    props.closeButtonSize,
    closeButtonIconSize,
    props.closeButtonOffset,
    props.navItemsPadding,
    props.navItemsMargin,
    props.toggleColor,
    toggleIconSize,
    customCss,
    resolve,
  ]);

  if (loading) {
    return <div ref={puck?.dragRef} className="text-gray-400">Loading menu…</div>;
  }

  if (items.length === 0) {
    return (
      <div ref={puck?.dragRef} className="p-2 border border-dashed text-gray-400 text-sm">
        Select a navigation menu
      </div>
    );
  }

  return (
    <div ref={puck?.dragRef} style={{ display: 'contents' }}>
    <nav
      className={[className, customClassName || ''].filter(Boolean).join(' ')}
      id={customId || undefined}
    >
      {isEditing && css && <style>{css}</style>}

      <button
        ref={registerToggleButton}
        type="button"
        className="nav-toggle"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
      >
        {isOpen ? <X size={toggleIconSize} aria-hidden="true" /> : <Menu size={toggleIconSize} aria-hidden="true" />}
      </button>

      {(mobileVariant === 'drawer' || mobileVariant === 'fullscreen') && (
        <div
          className={`nav-backdrop ${isOpen ? 'is-open' : ''}`.trim()}
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <DesktopNav items={items} isEditing={isEditing} />

      <MobileNav
        mobileVariant={mobileVariant}
        items={items}
        isEditing={isEditing}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        closeButtonIconSize={closeButtonIconSize}
      />
    </nav>
    </div>
  );
}
