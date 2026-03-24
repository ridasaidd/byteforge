/**
 * PositionWithOffsetsControl
 *
 * Composite component that combines ResponsivePositionControl and ResponsivePositionOffsetControl.
 * Provides smart behavior:
 * - Hides offsets when position is 'static'
 * - Auto-populates sensible offset defaults when position changes
 * - Shows conditional guidance based on position type
 */

import { useMemo, useCallback } from 'react';
import { ResponsivePositionControl, getSmartOffsetDefaultForPosition, isPositionStatic, positionRequiresOffset, type ResponsivePositionValue } from './ResponsivePositionControl';
import { ResponsivePositionOffsetControl, type ResponsivePositionOffsetValue } from './ResponsivePositionOffsetControl';

interface PositionWithOffsetsControlProps {
  field?: { label?: string };
  positionValue: ResponsivePositionValue | undefined;
  offsetValue: ResponsivePositionOffsetValue | undefined;
  onPositionChange: (value: ResponsivePositionValue) => void;
  onOffsetChange: (value: ResponsivePositionOffsetValue) => void;
}

export function PositionWithOffsetsControl({
  field,
  positionValue,
  offsetValue,
  onPositionChange,
  onOffsetChange,
}: PositionWithOffsetsControlProps) {
  // Get the current position value (mobile breakpoint by default)
  const currentPosition = useMemo(() => {
    if (!positionValue) return 'static';
    if (typeof positionValue === 'string') return positionValue;
    return positionValue.mobile || 'static';
  }, [positionValue]);

  // Handle position change with smart offset defaults
  const handlePositionChange = useCallback((newPositionValue: ResponsivePositionValue) => {
    onPositionChange(newPositionValue);

    // When position changes to a type that requires offset, auto-populate sensible defaults
    const newPosition = typeof newPositionValue === 'string' ? newPositionValue : newPositionValue?.mobile;
    if (newPosition && positionRequiresOffset(newPosition)) {
      // Get smart defaults for this position type
      const smartDefaults = getSmartOffsetDefaultForPosition(newPosition);

      // Apply smart defaults to current offset value preserving responsive structure
      if (offsetValue && typeof offsetValue === 'object' && 'mobile' in offsetValue) {
        // Responsive offset structure
        onOffsetChange({
          mobile: smartDefaults,
          tablet: offsetValue.tablet,
          desktop: offsetValue.desktop,
        });
      } else {
        // Simple offset value
        onOffsetChange({
          mobile: smartDefaults,
        } as ResponsivePositionOffsetValue);
      }
    }
  }, [positionValue, offsetValue, onPositionChange, onOffsetChange]);

  const shouldShowOffsets = !isPositionStatic(currentPosition);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Position Control */}
      <div>
        <ResponsivePositionControl
          field={field || { label: 'Position' }}
          value={positionValue}
          onChange={handlePositionChange}
        />
      </div>

      {/* Conditional Offset Control */}
      {shouldShowOffsets && (
        <div>
          <ResponsivePositionOffsetControl
            field={{ label: 'Offsets' }}
            value={offsetValue}
            onChange={onOffsetChange}
          />
        </div>
      )}

      {/* Guidance for Static Position */}
      {isPositionStatic(currentPosition) && (
        <div
          style={{
            fontSize: '12px',
            color: 'var(--puck-color-grey-06)',
            padding: '8px',
            backgroundColor: 'var(--puck-color-grey-02)',
            borderRadius: '4px',
            borderLeft: '3px solid var(--puck-color-grey-04)',
          }}
        >
          Offset properties have no effect on <em>static</em> positioning.
        </div>
      )}

      {/* Guidance for Sticky Position */}
      {currentPosition === 'sticky' && (
        <div
          style={{
            fontSize: '12px',
            color: 'var(--puck-color-orange-03)',
            padding: '8px',
            backgroundColor: 'rgba(255, 165, 0, 0.1)',
            borderRadius: '4px',
            borderLeft: '3px solid var(--puck-color-orange-03)',
          }}
        >
          <strong>Important:</strong> Sticky positioning requires at least one offset property (top, right, bottom, or left) set to a value other than 'auto'.
        </div>
      )}

      {/* Guidance for Absolute/Fixed */}
      {(currentPosition === 'absolute' || currentPosition === 'fixed') && (
        <div
          style={{
            fontSize: '12px',
            color: 'var(--puck-color-blue-06)',
            padding: '8px',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderRadius: '4px',
            borderLeft: '3px solid var(--puck-color-blue-06)',
          }}
        >
          For meaningful positioning, set at least one offset value.
        </div>
      )}
    </div>
  );
}
