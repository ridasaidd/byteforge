import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock useTheme hook
vi.mock('@/shared/hooks', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        primary: '#3b82f6',
        background: '#ffffff',
        foreground: '#000000',
      },
    },
    resolve: (token: string, fallback: string) => {
      const colors: Record<string, string> = {
        primary: '#3b82f6',
        background: '#ffffff',
        foreground: '#000000',
      };
      return colors[token] || fallback;
    },
  }),
}));

// Mock matchMedia
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

// Dynamic import to ensure mock is applied
const getHeading = async () => {
  const module = await import('../components/content/Heading');
  return module.Heading;
};

describe('Heading Component', () => {
  let HeadingRender: (props: any) => JSX.Element;

  beforeEach(async () => {
    const Heading = await getHeading();
    HeadingRender = Heading.render;
  });

  const defaultProps = {
    id: 'test-heading',
    text: 'Hello World',
    level: 1,
    align: 'left' as const,
    color: { type: 'theme' as const, value: 'foreground' },
    fontSize: {
      desktop: '48px',
      tablet: '36px',
      mobile: '24px',
    },
    fontWeight: { value: '700', token: '' },
    lineHeight: { mobile: { value: 1.2, unit: 'unitless' as const } },
    letterSpacing: { mobile: { value: 0, unit: 'px' as const } },
    margin: {
      mobile: { top: '0', right: '0', bottom: '16', left: '0', unit: 'px' as const, linked: false },
    },
  };

  it('renders heading text', () => {
    render(<HeadingRender {...defaultProps} />);

    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('renders correct heading tag', () => {
    const { rerender } = render(<HeadingRender {...defaultProps} level={1} />);

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();

    rerender(<HeadingRender {...defaultProps} level={2} />);
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();

    rerender(<HeadingRender {...defaultProps} level={3} />);
    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();

    rerender(<HeadingRender {...defaultProps} level={4} />);
    expect(screen.getByRole('heading', { level: 4 })).toBeInTheDocument();

    rerender(<HeadingRender {...defaultProps} level={5} />);
    expect(screen.getByRole('heading', { level: 5 })).toBeInTheDocument();

    rerender(<HeadingRender {...defaultProps} level={6} />);
    expect(screen.getByRole('heading', { level: 6 })).toBeInTheDocument();
  });

  it('applies text alignment', () => {
    const { rerender } = render(<HeadingRender {...defaultProps} textAlign="left" />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();

    rerender(<HeadingRender {...defaultProps} textAlign="center" />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();

    rerender(<HeadingRender {...defaultProps} textAlign="right" />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('applies theme colors', () => {
    render(
      <Heading
        {...defaultProps}
        color={{ type: 'theme', value: 'primary' }}
      />
    );

    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('applies custom colors', () => {
    render(
      <Heading
        {...defaultProps}
        color={{ type: 'custom', value: '#ff0000' }}
      />
    );

    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('handles responsive font sizes', () => {
    render(
      <Heading
        {...defaultProps}
        fontSize={{
          desktop: '64px',
          tablet: '48px',
          mobile: '32px',
        }}
      />
    );

    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('applies font weight', () => {
    const { rerender } = render(<HeadingRender {...defaultProps} fontWeight="400" />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();

    rerender(<HeadingRender {...defaultProps} fontWeight="700" />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();

    rerender(<HeadingRender {...defaultProps} fontWeight="900" />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('applies line height', () => {
    render(<HeadingRender {...defaultProps} lineHeight="1.5" />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('applies letter spacing', () => {
    render(<HeadingRender {...defaultProps} letterSpacing="2px" />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('renders empty text gracefully', () => {
    render(<HeadingRender {...defaultProps} text="" />);
    // Should render without crashing
    expect(screen.queryByRole('heading')).toBeInTheDocument();
  });

  it('handles special characters in text', () => {
    render(<HeadingRender {...defaultProps} text="Hello <World> & Friends!" />);
    expect(screen.getByText('Hello <World> & Friends!')).toBeInTheDocument();
  });
});
