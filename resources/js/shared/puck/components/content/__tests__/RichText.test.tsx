import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RichText } from '../RichText';
import { ThemeProvider } from '@/shared/contexts/ThemeContext';

// Mock hooks to enable edit mode for CSS injection
vi.mock('@/shared/hooks', () => ({
  useTheme: () => ({
    theme: {},
    resolve: (_path: string, fallback: string) => fallback,
  }),
  usePuckEditMode: () => true, // Enable edit mode for CSS injection in tests
}));

// Extract render function from ComponentConfig
const RichTextRender = RichText.render;

// Mock puck context
const mockPuckContext = {
  dragRef: () => {},
  isEditing: false,
} as any; // eslint-disable-line @typescript-eslint/no-explicit-any

// Helper to render with theme
const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
};

describe('RichText Component', () => {
  describe('Configuration', () => {
    it('should have correct label', () => {
      expect(RichText.label).toBe('Rich Text');
    });

    it('should have richtext field type', () => {
      expect(RichText?.fields?.content.type).toBe('richtext');
    });

    it('should have contentEditable enabled for inline editing', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((RichText?.fields?.content as any).contentEditable).toBe(true);
    });

    it('should restrict headings to h2-h4', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((RichText?.fields?.content as any).options?.heading).toEqual({ levels: [2, 3, 4] });
    });

    it('should have fontFamily field', () => {
      expect(RichText?.fields?.fontFamily).toBeDefined();
    });

    it('should have default content', () => {
      expect(RichText.defaultProps?.content).toBeDefined();
      expect(typeof RichText.defaultProps?.content).toBe('string');
    });
  });

  describe('Rendering', () => {
    it('should render with HTML string content', () => {
      const htmlContent = '<h2>Test Heading</h2><p>Test paragraph</p>';

      const { container } = renderWithTheme(
        <RichTextRender id="test" content={htmlContent} puck={mockPuckContext} />
      );

      expect(container.querySelector('h2')).toHaveTextContent('Test Heading');
      expect(container.querySelector('p')).toHaveTextContent('Test paragraph');
    });

    it('should render with React element content (from richtext field)', () => {
      const reactContent = (
        <>
          <h2>React Heading</h2>
          <p>React paragraph</p>
        </>
      );

      renderWithTheme(
        <RichTextRender id="test" content={reactContent} puck={mockPuckContext} />
      );

      expect(screen.getByText('React Heading')).toBeInTheDocument();
      expect(screen.getByText('React paragraph')).toBeInTheDocument();
    });

    it('should apply richtext-{id} className', () => {
      const { container } = renderWithTheme(
        <RichTextRender id="test-123" content="<p>Test</p>" puck={mockPuckContext} />
      );

      const richTextDiv = container.querySelector('.richtext-test-123');
      expect(richTextDiv).toBeInTheDocument();
    });

    it('should render dragRef attachment point', () => {
      const mockDragRef = () => {};

      const { container } = renderWithTheme(
        <RichTextRender
          id="test"
          content="<p>Test</p>"
          puck={{ ...mockPuckContext, dragRef: mockDragRef }}
        />
      );

      expect(container.querySelector('.richtext-test')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should inject CSS in edit mode', () => {
      const { container } = renderWithTheme(
        <RichTextRender id="test" content="<p>Test</p>" puck={mockPuckContext} />
      );

      const styles = container.querySelectorAll('style');
      expect(styles.length).toBeGreaterThan(0);
    });

    it('should include typography CSS rules', () => {
      const { container } = renderWithTheme(
        <RichTextRender id="test" content="<ul><li>Item</li></ul>" puck={mockPuckContext} />
      );

      const styleContent = Array.from(container.querySelectorAll('style'))
        .map(s => s.textContent)
        .join('\n');

      // Should include RichText typography rules
      expect(styleContent).toContain('.richtext-test');
      expect(styleContent).toMatch(/ul.*list-style/);
      expect(styleContent).toMatch(/h2.*font-size/);
    });

    it('should apply custom font family', () => {
      const { container } = renderWithTheme(
        <RichTextRender
          id="test"
          content="<p>Test</p>"
          fontFamily="Inter"
          puck={mockPuckContext}
        />
      );

      const styleContent = Array.from(container.querySelectorAll('style'))
        .map(s => s.textContent)
        .join('\n');

      expect(styleContent).toContain('font-family');
    });

    it('should fall back to theme font when fontFamily is empty', () => {
      const { container } = renderWithTheme(
        <RichTextRender
          id="test"
          content="<p>Test</p>"
          fontFamily={undefined}
          puck={mockPuckContext}
        />
      );

      const styleContent = Array.from(container.querySelectorAll('style'))
        .map(s => s.textContent)
        .join('\n');

      expect(styleContent).toContain('--font-family-sans');
    });
  });

  describe('Content Handling', () => {
    it('should handle empty content gracefully', () => {
      const { container } = renderWithTheme(
        <RichTextRender id="test" content="" puck={mockPuckContext} />
      );

      expect(container.querySelector('.richtext-test')).toBeInTheDocument();
    });

    it('should handle lists with proper nesting', () => {
      const htmlContent = `
        <ul>
          <li>Item 1</li>
          <li>Item 2
            <ul>
              <li>Nested item</li>
            </ul>
          </li>
        </ul>
      `;

      const { container } = renderWithTheme(
        <RichTextRender id="test" content={htmlContent} puck={mockPuckContext} />
      );

      const lists = container.querySelectorAll('ul');
      expect(lists.length).toBeGreaterThanOrEqual(2); // Parent and nested
    });

    it('should handle inline formatting (bold, italic, underline)', () => {
      const htmlContent = `
        <p>
          <strong>Bold</strong>
          <em>Italic</em>
          <u>Underline</u>
        </p>
      `;

      const { container } = renderWithTheme(
        <RichTextRender id="test" content={htmlContent} puck={mockPuckContext} />
      );

      expect(container.querySelector('strong')).toHaveTextContent('Bold');
      expect(container.querySelector('em')).toHaveTextContent('Italic');
      expect(container.querySelector('u')).toHaveTextContent('Underline');
    });

    it('should handle links', () => {
      const htmlContent = '<p><a href="https://example.com">Link text</a></p>';

      const { container } = renderWithTheme(
        <RichTextRender id="test" content={htmlContent} puck={mockPuckContext} />
      );

      const link = container.querySelector('a');
      expect(link).toHaveAttribute('href', 'https://example.com');
      expect(link).toHaveTextContent('Link text');
    });
  });

  describe('Theme Integration', () => {
    it('should use theme color values', () => {
      const { container } = renderWithTheme(
        <RichTextRender
          id="test"
          content="<p>Test</p>"
          color={{ type: 'theme', value: 'components.richtext.colors.default' }}
          puck={mockPuckContext}
        />
      );

      const styleContent = Array.from(container.querySelectorAll('style'))
        .map(s => s.textContent)
        .join('\n');

      expect(styleContent).toContain('--component-richtext-color-default');
    });

    it('should use custom color values', () => {
      const { container } = renderWithTheme(
        <RichTextRender
          id="test"
          content="<p>Test</p>"
          color={{ type: 'custom', value: '#ff0000' }}
          puck={mockPuckContext}
        />
      );

      const styleContent = Array.from(container.querySelectorAll('style'))
        .map(s => s.textContent)
        .join('\n');

      expect(styleContent).toContain('#ff0000');
    });
  });

  describe('Layout Props', () => {
    it('should accept and use display prop', () => {
      const { container } = renderWithTheme(
        <RichTextRender
          id="test"
          content="<p>Test</p>"
          display={{ mobile: 'block' }}
          puck={mockPuckContext}
        />
      );

      const styleContent = Array.from(container.querySelectorAll('style'))
        .map(s => s.textContent)
        .join('\n');

      expect(styleContent).toContain('display');
    });

    it('should accept and use spacing props', () => {
      const { container } = renderWithTheme(
        <RichTextRender
          id="test"
          content="<p>Test</p>"
          padding={{ mobile: { top: '16', right: '16', bottom: '16', left: '16', unit: 'px', linked: true } }}
          margin={{ mobile: { top: '8', right: '8', bottom: '8', left: '8', unit: 'px', linked: true } }}
          puck={mockPuckContext}
        />
      );

      const styleContent = Array.from(container.querySelectorAll('style'))
        .map(s => s.textContent)
        .join('\n');

      expect(styleContent).toMatch(/padding|margin/);
    });
  });
});
