import { describe, it, expect } from 'vitest';
import {
  hasDisplayModeInAnyBreakpoint,
  hasFlexInAnyBreakpoint,
  hasGridInAnyBreakpoint,
  createConditionalResolver,
  extractDefaults,
} from '../../fields/conditionalFields';

describe('conditionalFields', () => {
  describe('hasDisplayModeInAnyBreakpoint', () => {
    it('returns false for undefined display', () => {
      expect(hasDisplayModeInAnyBreakpoint(undefined, ['flex'])).toBe(false);
    });

    it('returns true for simple string value matching mode', () => {
      expect(hasDisplayModeInAnyBreakpoint('flex', ['flex', 'inline-flex'])).toBe(true);
    });

    it('returns false for simple string value not matching mode', () => {
      expect(hasDisplayModeInAnyBreakpoint('block', ['flex', 'inline-flex'])).toBe(false);
    });

    it('returns true when mobile matches', () => {
      expect(
        hasDisplayModeInAnyBreakpoint({ mobile: 'flex' }, ['flex', 'inline-flex'])
      ).toBe(true);
    });

    it('returns true when tablet matches', () => {
      expect(
        hasDisplayModeInAnyBreakpoint(
          { mobile: 'block', tablet: 'flex' },
          ['flex', 'inline-flex']
        )
      ).toBe(true);
    });

    it('returns true when desktop matches', () => {
      expect(
        hasDisplayModeInAnyBreakpoint(
          { mobile: 'block', desktop: 'flex' },
          ['flex', 'inline-flex']
        )
      ).toBe(true);
    });

    it('returns false when no breakpoint matches', () => {
      expect(
        hasDisplayModeInAnyBreakpoint(
          { mobile: 'block', tablet: 'block', desktop: 'block' },
          ['flex', 'inline-flex']
        )
      ).toBe(false);
    });

    it('handles all display modes', () => {
      expect(hasDisplayModeInAnyBreakpoint('inline-block', ['inline-block'])).toBe(true);
      expect(hasDisplayModeInAnyBreakpoint('none', ['none'])).toBe(true);
    });

    it('handles empty modes array', () => {
      expect(hasDisplayModeInAnyBreakpoint('flex', [])).toBe(false);
    });
  });

  describe('hasFlexInAnyBreakpoint', () => {
    it('returns true for flex display', () => {
      expect(hasFlexInAnyBreakpoint({ mobile: 'flex' })).toBe(true);
    });

    it('returns true for inline-flex display', () => {
      expect(hasFlexInAnyBreakpoint({ mobile: 'inline-flex' })).toBe(true);
    });

    it('returns false for grid display', () => {
      expect(hasFlexInAnyBreakpoint({ mobile: 'grid' })).toBe(false);
    });

    it('returns true when any breakpoint uses flex', () => {
      expect(hasFlexInAnyBreakpoint({ mobile: 'block', desktop: 'flex' })).toBe(true);
    });

    it('returns false for undefined', () => {
      expect(hasFlexInAnyBreakpoint(undefined)).toBe(false);
    });
  });

  describe('hasGridInAnyBreakpoint', () => {
    it('returns true for grid display', () => {
      expect(hasGridInAnyBreakpoint({ mobile: 'grid' })).toBe(true);
    });

    it('returns true for inline-grid display', () => {
      expect(hasGridInAnyBreakpoint({ mobile: 'inline-grid' })).toBe(true);
    });

    it('returns false for flex display', () => {
      expect(hasGridInAnyBreakpoint({ mobile: 'flex' })).toBe(false);
    });

    it('returns true when any breakpoint uses grid', () => {
      expect(hasGridInAnyBreakpoint({ mobile: 'block', tablet: 'grid' })).toBe(true);
    });

    it('returns false for undefined', () => {
      expect(hasGridInAnyBreakpoint(undefined)).toBe(false);
    });
  });

  describe('createConditionalResolver', () => {
    it('returns only base fields when no conditions match', () => {
      const resolver = createConditionalResolver(['field1', 'field2'], []);
      const fields = {
        field1: { type: 'text' },
        field2: { type: 'text' },
        field3: { type: 'text' },
      };

      const result = resolver({ props: {} }, { fields });

      expect(result).toHaveProperty('field1');
      expect(result).toHaveProperty('field2');
      expect(result).not.toHaveProperty('field3');
    });

    it('includes conditional fields when condition is true', () => {
      const resolver = createConditionalResolver(
        ['base'],
        [
          {
            condition: (props) => props.showExtra === true,
            fieldKeys: ['extra'],
          },
        ]
      );
      const fields = {
        base: { type: 'text' },
        extra: { type: 'text' },
      };

      const result = resolver({ props: { showExtra: true } }, { fields });

      expect(result).toHaveProperty('base');
      expect(result).toHaveProperty('extra');
    });

    it('excludes conditional fields when condition is false', () => {
      const resolver = createConditionalResolver(
        ['base'],
        [
          {
            condition: (props) => props.showExtra === true,
            fieldKeys: ['extra'],
          },
        ]
      );
      const fields = {
        base: { type: 'text' },
        extra: { type: 'text' },
      };

      const result = resolver({ props: { showExtra: false } }, { fields });

      expect(result).toHaveProperty('base');
      expect(result).not.toHaveProperty('extra');
    });

    it('handles multiple conditional groups', () => {
      const resolver = createConditionalResolver(
        ['base'],
        [
          {
            condition: (props) => hasFlexInAnyBreakpoint(props.display),
            fieldKeys: ['flexField'],
          },
          {
            condition: (props) => hasGridInAnyBreakpoint(props.display),
            fieldKeys: ['gridField'],
          },
        ]
      );
      const fields = {
        base: { type: 'text' },
        flexField: { type: 'text' },
        gridField: { type: 'text' },
      };

      const result = resolver(
        { props: { display: { mobile: 'flex', tablet: 'grid' } } },
        { fields }
      );

      expect(result).toHaveProperty('base');
      expect(result).toHaveProperty('flexField');
      expect(result).toHaveProperty('gridField');
    });

    it('handles non-existent field keys gracefully', () => {
      const resolver = createConditionalResolver(['field1', 'nonExistent'], []);
      const fields = {
        field1: { type: 'text' },
      };

      const result = resolver({ props: {} }, { fields });

      expect(result).toHaveProperty('field1');
      expect(result).not.toHaveProperty('nonExistent');
    });
  });

  describe('extractDefaults', () => {
    it('extracts default values from single field group', () => {
      const fields = {
        field1: { type: 'text', defaultValue: 'hello' },
        field2: { type: 'number', defaultValue: 42 },
      };

      const defaults = extractDefaults(fields);

          expect(defaults).toEqual({
            field1: 'hello',
            field2: 42,
          });
        });
      });
    });

    it('extracts defaults from multiple field groups', () => {
      const group1 = {
        field1: { type: 'text', defaultValue: 'hello' },
      };
      const group2 = {
        field2: { type: 'number', defaultValue: 42 },
      };

      const defaults = extractDefaults(group1, group2);

      expect(defaults).toEqual({
        field1: 'hello',
        field2: 42,
      });
    });
