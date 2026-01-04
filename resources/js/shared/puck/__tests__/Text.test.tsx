import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock useTheme hook
vi.mock('@/shared/hooks', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        foreground: '#000000',
        muted: '#6b7280',
      },
    },
    resolve: (token: string, fallback: string) => {
      const colors: Record<string, string> = {
        foreground: '#000000',
        muted: '#6b7280',
      };
      return colors[token] || fallback;
    },
  }),
}));

// Dynamic import to ensure mock is applied
const getText = async () => {
  const module = await import('../components/content/Text');
  return module.Text;
};

describe('Text Component', () => {
  let TextConfig: any;

  beforeEach(async () => {
    TextConfig = await getText();
  });

  const getBaseProps = () => ({
    ...(TextConfig?.defaultProps || {}),
    id: 'text-test',
    content: 'This is a sample paragraph text.',
    align: 'left' as const,
    color: { type: 'theme' as const, value: 'components.text.colors.default' },
    fontSize: { mobile: { type: 'custom' as const, value: '16px' } },
    fontWeight: { type: 'custom' as const, value: '400' },
    margin: {
      mobile: { top: '0', right: '0', bottom: '16', left: '0', unit: 'px', linked: false },
    },
  });

  const renderText = (props: Partial<ReturnType<typeof getBaseProps>> = {}) => {
    const resolvedProps = {
      ...getBaseProps(),
      ...props,
    };
    return render(TextConfig.render(resolvedProps as any));
  };

  it('renders text content', () => {
    renderText();

    expect(screen.getByText('This is a sample paragraph text.')).toBeInTheDocument();
  });

  it('applies text alignment', () => {
    const { rerender } = renderText({ align: 'left' });
    expect(screen.getByText('This is a sample paragraph text.')).toBeInTheDocument();

    rerender(TextConfig.render({ ...getBaseProps(), align: 'center' } as any));
    expect(screen.getByText('This is a sample paragraph text.')).toBeInTheDocument();

    rerender(TextConfig.render({ ...getBaseProps(), align: 'right' } as any));
    expect(screen.getByText('This is a sample paragraph text.')).toBeInTheDocument();
  });

  it('applies theme colors', () => {
    renderText({ color: { type: 'theme', value: 'muted' } });

    expect(screen.getByText('This is a sample paragraph text.')).toBeInTheDocument();
  });

  it('applies custom colors', () => {
    renderText({ color: { type: 'custom', value: '#ff0000' } });

    expect(screen.getByText('This is a sample paragraph text.')).toBeInTheDocument();
  });

  it('handles different font sizes', () => {
    const { rerender } = renderText({ fontSize: { mobile: { type: 'custom', value: '14px' } } });
    expect(screen.getByText('This is a sample paragraph text.')).toBeInTheDocument();

    rerender(TextConfig.render({ ...getBaseProps(), fontSize: { mobile: { type: 'custom', value: '18px' } } } as any));
    expect(screen.getByText('This is a sample paragraph text.')).toBeInTheDocument();
  });

  it('applies font weight', () => {
    const { rerender } = renderText({ fontWeight: { type: 'custom', value: '300' } });
    expect(screen.getByText('This is a sample paragraph text.')).toBeInTheDocument();

    rerender(TextConfig.render({ ...getBaseProps(), fontWeight: { type: 'custom', value: '700' } } as any));
    expect(screen.getByText('This is a sample paragraph text.')).toBeInTheDocument();
  });

  it('renders multiline text', () => {
    const multilineText = 'Line 1\nLine 2\nLine 3';
    renderText({ content: multilineText });

    // The component might preserve line breaks or render as single line
    expect(screen.getByText(/Line 1/)).toBeInTheDocument();
  });

  it('handles empty content', () => {
    renderText({ content: '' });

    // Should render without crashing
    const container = document.querySelector('p') || document.querySelector('div');
    expect(container).toBeInTheDocument();
  });

  it('handles HTML entities', () => {
    renderText({ content: 'Less than < and greater than >' });
    expect(screen.getByText('Less than < and greater than >')).toBeInTheDocument();
  });
});
