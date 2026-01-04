import { describe, it, expect, vi } from 'vitest';
import { defineBlockTestSuite } from '../../blockTestFactory';
import { mockThemeResolver } from '../../testUtils';

// Mock the theme hook
vi.mock('@/shared/hooks', () => ({
  useTheme: () => ({
    resolve: mockThemeResolver()
  })
}));

// Mock FormContext
vi.mock('../../../components/forms/FormContext', () => ({
  useFormField: vi.fn((name: string) => ({
    value: '',
    error: null,
    onChange: vi.fn(),
    onBlur: vi.fn(),
  })),
}));

const defaultProps = {
  id: 'radiogroup-1',
  name: 'size',
  label: 'Size',
  required: false,
  helpText: 'Choose your size',
  options: [
    { label: 'Small', value: 'sm' },
    { label: 'Medium', value: 'md' },
    { label: 'Large', value: 'lg' },
  ],
  labelColor: { type: 'custom' as const, value: '#000000' },
  radioColor: { type: 'custom' as const, value: '#3b82f6' },
  errorColor: { type: 'custom' as const, value: '#ef4444' },
  size: 'md' as const,
};

defineBlockTestSuite({
  name: 'RadioGroup',
  load: async () => {
    const module = await import('../../../components/forms/RadioGroup');
    return { componentConfig: module.RadioGroup, componentRender: module.RadioGroup.render };
  },
  defaultProps,
  className: 'radiogroup-radiogroup-1',
  rootTag: 'div',
  allowedHardcodedValues: ['0.2s', '#3b82f6', '#000000', '#ef4444', '16px', '20px', '24px'],
  extraTests: ({ renderWithDefaults }) => {
    describe('RadioGroup-specific tests', () => {
      it('should render label', () => {
        const { container } = renderWithDefaults();
        expect(container.textContent).toContain('Size');
      });

      it('should render all radio options', () => {
        const { container } = renderWithDefaults();
        expect(container.textContent).toContain('Small');
        expect(container.textContent).toContain('Medium');
        expect(container.textContent).toContain('Large');
      });

      it('should apply small size', () => {
        const { css } = renderWithDefaults({ size: 'sm' });
        expect(css).toContain('width: 16px');
        expect(css).toContain('height: 16px');
      });

      it('should apply medium size', () => {
        const { css } = renderWithDefaults({ size: 'md' });
        expect(css).toContain('width: 20px');
        expect(css).toContain('height: 20px');
      });

      it('should apply large size', () => {
        const { css } = renderWithDefaults({ size: 'lg' });
        expect(css).toContain('width: 24px');
        expect(css).toContain('height: 24px');
      });

      it('should show asterisk for required fields', () => {
        const { container } = renderWithDefaults({ required: true });
        expect(container.textContent).toContain('*');
      });
    });
  },
});
