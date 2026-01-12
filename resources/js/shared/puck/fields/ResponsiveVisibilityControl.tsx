import { FieldLabel } from '@measured/puck';

export interface ResponsiveVisibilityValue {
  mobile: 'visible' | 'hidden';
  tablet?: 'visible' | 'hidden';
  desktop?: 'visible' | 'hidden';
}

interface ResponsiveVisibilityControlProps {
  field: { label?: string };
  value?: ResponsiveVisibilityValue;
  onChange: (value: ResponsiveVisibilityValue) => void;
}

type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export function ResponsiveVisibilityControl({
  field,
  value,
  onChange,
}: ResponsiveVisibilityControlProps) {
  const normalizedValue: ResponsiveVisibilityValue = value || {
    mobile: 'visible',
    tablet: 'visible',
    desktop: 'visible',
  };

  const handleToggle = (breakpoint: Breakpoint) => {
    const currentState = normalizedValue[breakpoint] || 'visible';
    onChange({
      ...normalizedValue,
      [breakpoint]: currentState === 'visible' ? 'hidden' : 'visible',
    });
  };

  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {(['mobile', 'tablet', 'desktop'] as const).map((bp) => {
        const isVisible = normalizedValue[bp] !== 'hidden';
        return (
          <button
            key={bp}
            type="button"
            onClick={() => handleToggle(bp)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              border: '1px solid var(--puck-color-grey-04)',
              borderRadius: '4px',
              backgroundColor: 'var(--puck-color-white)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <span
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--puck-color-grey-08)',
                textTransform: 'capitalize',
              }}
            >
              {bp}
            </span>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span
                style={{
                  fontSize: '12px',
                  color: isVisible ? '#16a34a' : '#dc2626',
                  fontWeight: 600,
                }}
              >
                {isVisible ? 'Visible' : 'Hidden'}
              </span>
              <div
                style={{
                  position: 'relative',
                  width: '40px',
                  height: '20px',
                  borderRadius: '10px',
                  backgroundColor: isVisible ? '#16a34a' : '#dc2626',
                  transition: 'background-color 0.2s',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '2px',
                    left: isVisible ? '22px' : '2px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    backgroundColor: 'white',
                    transition: 'left 0.2s',
                  }}
                />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );

  return field.label ? <FieldLabel label={field.label}>{content}</FieldLabel> : content;
}

/**
 * Generate CSS for responsive visibility
 * Strategy: Only generate CSS when there's actually a change from visible
 */
export function generateVisibilityCSS(className: string, value?: ResponsiveVisibilityValue): string {
  if (!value) return '';

  // If all are visible, no CSS needed
  const mobileHidden = value.mobile === 'hidden';
  const tabletHidden = (value.tablet ?? value.mobile) === 'hidden';
  const desktopHidden = (value.desktop ?? value.tablet ?? value.mobile) === 'hidden';

  if (!mobileHidden && !tabletHidden && !desktopHidden) {
    return ''; // All visible, no CSS needed
  }

  let css = '';

  // Mobile base
  if (mobileHidden) {
    css += `.${className} { display: none; }\n`;
  }

  // Tablet - add if different from mobile
  if (value.tablet !== undefined && value.tablet !== value.mobile) {
    css += `@media (min-width: 768px) {\n  .${className} { display: ${value.tablet === 'hidden' ? 'none' : 'revert'}; }\n}\n`;
  }

  // Desktop - only add if different from effective tablet value
  if (value.desktop !== undefined) {
    const effectiveTablet = value.tablet ?? value.mobile;
    if (value.desktop !== effectiveTablet) {
      css += `@media (min-width: 1024px) {\n  .${className} { display: ${value.desktop === 'hidden' ? 'none' : 'revert'}; }\n}\n`;
    }
  }

  return css;
}
