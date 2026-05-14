import { fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { defineBlockTestSuite } from '../../blockTestFactory';
import { mockThemeResolver } from '../../testUtils';

vi.mock('@/shared/hooks', () => ({
  useTheme: () => ({
    theme: {},
    resolve: mockThemeResolver(),
  }),
  usePuckEditMode: () => true,
  useQuery: vi.fn(() => ({ data: null })),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: null })),
}));

const defaultProps = {
  id: 'test-accordion',
  items: [
    { title: 'Item 1', content: 'Content 1', expanded: false },
    { title: 'Item 2', content: 'Content 2', expanded: false },
  ],
};

defineBlockTestSuite({
  name: 'Accordion',
  load: async () => {
    const module = await import('../../../components/content/Accordion');
    return {
      componentConfig: module.Accordion,
      componentRender: module.Accordion.render,
    };
  },
  defaultProps,
  className: 'accordion-test-accordion',
  rootTag: 'div',
  allowedHardcodedValues: ['0px', 'none', 'block', 'left', 'span', '6px', '12px', '16px', '20px', '0.2s', 'ease', '180deg', '600', '100%', '#f3f4f6', '#000000', '#ffffff', '#e5e7eb', 'user-select'],
  supportsPadding: true,
  supportsMargin: true,
  supportsBorder: true,
  supportsShadow: true,
  extraTests: ({ renderWithDefaults }) => {
    describe('Accordion-specific tests', () => {
      it('summarizes a new item without crashing', async () => {
        const module = await import('../../../components/content/Accordion');
        const itemsField = module.Accordion.fields.items as { getItemSummary: (item: unknown) => string };

        expect(itemsField.getItemSummary(undefined)).toBe('Item');
        expect(itemsField.getItemSummary({})).toBe('Item');
      });

      it('renders all accordion items', () => {
        const { container } = renderWithDefaults();
        const items = container.querySelectorAll('.accordion-test-accordion-item');
        expect(items.length).toBe(2);
      });

      it('renders item titles', () => {
        const { container } = renderWithDefaults();
        const titles = container.querySelectorAll('.accordion-test-accordion-title');
        expect(titles.length).toBe(2);
        expect(titles[0]?.textContent).toContain('Item 1');
        expect(titles[1]?.textContent).toContain('Item 2');
      });

      it('renders item content', () => {
        const { container } = renderWithDefaults();
        const contents = container.querySelectorAll('.accordion-test-accordion-content');
        expect(contents.length).toBe(2);
      });

      it('toggles item expansion when title button is clicked', () => {
        const { container } = renderWithDefaults();
        const button = container.querySelector('.accordion-test-accordion-title');
        const item = container.querySelector('.accordion-test-accordion-item');

        expect(button).toHaveAttribute('aria-expanded', 'false');
        expect(item?.className).not.toContain('expanded');

        fireEvent.click(button as HTMLButtonElement);

        expect(button).toHaveAttribute('aria-expanded', 'true');
        expect(item?.className).toContain('expanded');
      });

      it('keeps only one item expanded when allowMultiple is disabled', () => {
        const { container } = renderWithDefaults({ allowMultiple: false });
        const buttons = Array.from(container.querySelectorAll('.accordion-test-accordion-title')) as HTMLButtonElement[];
        const items = Array.from(container.querySelectorAll('.accordion-test-accordion-item'));

        fireEvent.click(buttons[0]);
        fireEvent.click(buttons[1]);

        expect(items[0]?.className).not.toContain('expanded');
        expect(items[1]?.className).toContain('expanded');
      });

      it('renders incomplete items without crashing', () => {
        const { container } = renderWithDefaults({ items: [{} as any] });
        const items = container.querySelectorAll('.accordion-test-accordion-item');
        expect(items.length).toBe(1);
      });

      it('applies title styling', () => {
        const { css } = renderWithDefaults();
        expect(css).toContain('.accordion-test-accordion-title');
        expect(css).toContain('background-color');
        expect(css).toContain('cursor: pointer');
        expect(css).toContain('font-weight: 600');
      });

      it('applies hover styling to title', () => {
        const { css } = renderWithDefaults();
        expect(css).toContain('.accordion-test-accordion-title:hover');
      });

      it('applies expanded state CSS', () => {
        const { css } = renderWithDefaults();
        expect(css).toContain('.accordion-test-accordion-item.expanded');
      });

      it('applies icon rotation on expand', () => {
        const { css } = renderWithDefaults();
        expect(css).toContain('.accordion-test-accordion-item.expanded .accordion-test-accordion-icon');
        expect(css).toContain('rotate(180deg)');
      });

      it('applies allowMultiple setting', () => {
        const { css: singleCss } = renderWithDefaults({ allowMultiple: false });
        const { css: multipleCss } = renderWithDefaults({ allowMultiple: true });
        expect(singleCss).toBeDefined();
        expect(multipleCss).toBeDefined();
      });

      it('generates storefront CSS through the layout aggregator', async () => {
        const { extractLayoutComponentsCss } = await import('../../../services/PuckCssAggregator');

        const css = extractLayoutComponentsCss({
          content: [{
            type: 'Accordion',
            props: {
              id: 'accordion-storefront',
              items: [
                { title: 'Section 1', content: 'Content 1', expanded: false },
                { title: 'Section 2', content: 'Content 2', expanded: false },
              ],
              display: { mobile: 'block' },
              width: { mobile: { value: '100', unit: '%' } },
              allowMultiple: false,
              titleBackgroundColor: { type: 'custom', value: '#f3f4f6' },
              contentBackgroundColor: { type: 'custom', value: '#ffffff' },
            },
          }],
        } as any);

        expect(css).toContain('.accordion-accordion-storefront');
        expect(css).toContain('border-radius: 6px');
        expect(css).toContain('cursor: pointer');
        expect(css).toContain('font-weight: 600');
      });
    });
  },
});
