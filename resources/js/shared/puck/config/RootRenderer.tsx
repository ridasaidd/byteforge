import React from 'react';
import { usePuckEditMode } from '@/shared/hooks';
import { buildLayoutCSS, type ColorValue, type ResponsiveSpacingValue } from '../fields';

interface RootRenderProps {
  children: React.ReactNode;
  _rootId?: string;
  backgroundColor?: ColorValue;
  backgroundImage?: string;
  backgroundSize?: string;
  backgroundPosition?: string;
  backgroundRepeat?: string;
  color?: ColorValue;
  fontFamily?: string;
  maxWidth?: string;
  minHeight?: string;
  padding?: ResponsiveSpacingValue;
  margin?: ResponsiveSpacingValue;
}

export function RootRenderer({
  children, _rootId, backgroundColor, backgroundImage, backgroundSize,
  backgroundPosition, backgroundRepeat, color, fontFamily, maxWidth,
  minHeight, padding, margin,
}: RootRenderProps) {
  const isEditing = usePuckEditMode();

  // Class names — page-scoped to avoid conflicts in merged CSS
  const outerClass = _rootId ? `puck-root-${_rootId}` : 'puck-root';
  const innerClass = _rootId ? `puck-root-${_rootId}-inner` : 'puck-root-inner';

  // Resolve ColorValue to CSS string
  const resolveBg = (() => {
    if (!backgroundColor) return '#ffffff';
    if (typeof backgroundColor === 'string') return backgroundColor;
    if (backgroundColor.type === 'theme' && backgroundColor.value) {
      return `var(--${backgroundColor.value.replace(/\./g, '-')}, #ffffff)`;
    }
    return backgroundColor.value || '#ffffff';
  })();

  const resolveColor = (() => {
    if (!color) return 'inherit';
    if (typeof color === 'string') return color;
    if (color.type === 'theme' && color.value) {
      return `var(--${color.value.replace(/\./g, '-')}, inherit)`;
    }
    return color.value || 'inherit';
  })();

  // Build outer div CSS
  const outerRules: string[] = [`background-color: ${resolveBg}`];
  if (backgroundImage) {
    outerRules.push(`background-image: url(${backgroundImage})`);
    outerRules.push(`background-size: ${backgroundSize || 'cover'}`);
    outerRules.push(`background-position: ${backgroundPosition || 'center'}`);
    outerRules.push(`background-repeat: ${backgroundRepeat || 'no-repeat'}`);
  }
  if (resolveColor !== 'inherit') outerRules.push(`color: ${resolveColor}`);
  outerRules.push(`font-family: ${fontFamily || 'var(--font-family-sans, system-ui, sans-serif)'}`);
  if (minHeight && minHeight !== 'auto') outerRules.push(`min-height: ${minHeight}`);

  const outerCss = `.${outerClass} { ${outerRules.join('; ')}; }`;

  // Build inner div CSS (responsive padding/margin via builder + max-width)
  const innerLayoutCss = buildLayoutCSS({ className: innerClass, padding, margin });
  const innerMaxWidthCss = maxWidth ? `.${innerClass} { max-width: ${maxWidth}; }` : '';

  return (
    <>
      {isEditing && <style>{outerCss}{'\n'}{innerLayoutCss}{innerMaxWidthCss}</style>}
      <div className={outerClass}>
        <div className={innerClass}>
          {children}
        </div>
      </div>
    </>
  );
}
