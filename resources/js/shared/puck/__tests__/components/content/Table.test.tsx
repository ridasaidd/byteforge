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
  id: 'test-table',
  rows: [
    { cells: ['Header 1', 'Header 2', 'Header 3'] },
    { cells: ['Data 1', 'Data 2', 'Data 3'] },
    { cells: ['Data 4', 'Data 5', 'Data 6'] },
  ],
};

defineBlockTestSuite({
  name: 'Table',
  load: async () => {
    const module = await import('../../../components/content/Table');
    return {
      componentConfig: module.Table,
      componentRender: module.Table.render,
    };
  },
  defaultProps,
  className: 'table-test-table',
  rootTag: 'div',
  allowedHardcodedValues: ['0px', 'none', 'collapse', 'block', 'left', '12px', '600', '100%', '#f3f4f6', '#000000', '#f9fafb', '#e5e7eb'],
  supportsPadding: true,
  supportsMargin: true,
  supportsBorder: true,
  supportsShadow: true,
  extraTests: ({ renderWithDefaults }) => {
    describe('Table-specific tests', () => {
      it('summarizes a new row without crashing', async () => {
        const module = await import('../../../components/content/Table');
        const rowsField = module.Table.fields.rows as { getItemSummary: (item: unknown) => string };

        expect(rowsField.getItemSummary(undefined)).toBe('New row');
        expect(rowsField.getItemSummary({})).toBe('New row');
      });

      it('summarizes a new cell without crashing', async () => {
        const module = await import('../../../components/content/Table');
        const rowsField = module.Table.fields.rows as {
          arrayFields: {
            cells: {
              getItemSummary: (item: unknown) => string;
            };
          };
        };

        expect(rowsField.arrayFields.cells.getItemSummary(undefined)).toBe('Empty cell');
        expect(rowsField.arrayFields.cells.getItemSummary({})).toBe('Empty cell');
        expect(rowsField.arrayFields.cells.getItemSummary({ '': 'Cell value' })).toBe('Cell value');
      });

      it('renders table with header row', () => {
        const { container } = renderWithDefaults({ hasHeader: true });
        const thead = container.querySelector('thead');
        expect(thead).toBeInTheDocument();
        expect(thead?.querySelectorAll('th').length).toBe(3);
      });

      it('renders table without header row when disabled', () => {
        const { container } = renderWithDefaults({ hasHeader: false });
        const thead = container.querySelector('thead');
        expect(thead).not.toBeInTheDocument();
      });

      it('renders all data rows', () => {
        const { container } = renderWithDefaults();
        const tbody = container.querySelector('tbody');
        const rows = tbody?.querySelectorAll('tr');
        expect(rows?.length).toBeGreaterThan(0);
      });

      it('renders incomplete rows without crashing', () => {
        const { container } = renderWithDefaults({ rows: [{} as any] });
        const cells = container.querySelectorAll('td, th');
        expect(cells.length).toBe(3);
      });

      it('renders object-backed cells without crashing', () => {
        const { container } = renderWithDefaults({ rows: [{ cells: [{ '': 'Header' }, {}] } as any] });
        const headerCells = container.querySelectorAll('th');
        expect(headerCells.length).toBe(2);
        expect(headerCells[0]?.textContent).toBe('Header');
      });

      it('renders a dedicated inner table class for full-width layout', () => {
        const { container, css } = renderWithDefaults();
        const table = container.querySelector('.table-test-table-table');
        expect(table).toBeInTheDocument();
        expect(css).toContain('.table-test-table-table');
        expect(css).toContain('min-width: 100%');
      });

      it('applies custom cell padding in editor CSS', () => {
        const { css } = renderWithDefaults({
          cellPadding: {
            mobile: { top: '20', right: '16', bottom: '20', left: '16', unit: 'px', linked: false },
          },
        });

        expect(css).toContain('padding: 20px 16px 20px 16px');
      });

      it('applies striped styling when enabled', () => {
        const { css } = renderWithDefaults({ striped: true });
        expect(css).toContain('nth-child(odd)');
        expect(css).toContain('background-color');
      });

      it('applies bordered styling by default', () => {
        const { css } = renderWithDefaults({ bordered: true });
        expect(css).toContain('border: 1px solid');
      });

      it('removes border styling when disabled', () => {
        const { css } = renderWithDefaults({ bordered: false });
        expect(css).toContain('border: none');
      });

      it('generates storefront CSS through the layout aggregator', async () => {
        const { extractLayoutComponentsCss } = await import('../../../services/PuckCssAggregator');

        const css = extractLayoutComponentsCss({
          content: [{
            type: 'Table',
            props: {
              id: 'table-storefront',
              rows: [
                { cells: ['Col 1', 'Col 2'] },
                { cells: ['Data 1', 'Data 2'] },
              ],
              display: { mobile: 'block' },
              width: { mobile: { value: '100', unit: '%' } },
              hasHeader: true,
              striped: true,
              bordered: true,
              cellPadding: {
                mobile: { top: '10', right: '14', bottom: '10', left: '14', unit: 'px', linked: false },
              },
            },
          }],
        } as any);

        expect(css).toContain('.table-table-storefront');
        expect(css).toContain('.table-table-storefront-table');
        expect(css).toContain('border-collapse');
        expect(css).toContain('padding: 10px 14px 10px 14px');
        expect(css).toContain('nth-child(odd)');
      });
    });
  },
});
