import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('@/shared/hooks', () => ({
  useTheme: () => ({
    theme: {
      theme_data: {
        typography: {
          fontSize: {
            base: '16px',
            xl: '24px',
          },
          fontWeight: {
            normal: '400',
            bold: '700',
          },
        },
        colors: {
          foreground: '#111827',
          muted: '#6b7280',
        },
        components: {
          text: {
            colors: {
              default: '#111827',
            },
          },
          link: {
            colors: {
              default: '#2563eb',
              hover: '#1d4ed8',
            },
          },
        },
      },
    },
    resolve: (token: string, fallback = '') => {
      const values: Record<string, string> = {
        'typography.fontSize.base': '16px',
        'typography.fontSize.xl': '24px',
        'typography.fontWeight.normal': '400',
        'typography.fontWeight.bold': '700',
        'colors.foreground': '#111827',
        'colors.muted': '#6b7280',
        'components.text.colors.default': '#111827',
        'components.link.colors.default': '#2563eb',
        'components.link.colors.hover': '#1d4ed8',
      };

      return values[token] || fallback;
    },
  }),
  usePuckEditMode: () => true,
}));

const getStyleText = () => Array.from(document.querySelectorAll('style')).map((node) => node.textContent || '').join('\n');

describe('Typography control audit', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  it('Text resolves theme font size and font weight into editor CSS', async () => {
    const module = await import('../components/content/Text');

    render(module.Text.render({
      ...(module.Text.defaultProps || {}),
      id: 'audit-text',
      content: 'Audit text',
      fontSize: { mobile: { type: 'theme', value: 'typography.fontSize.xl' } },
      fontWeight: { type: 'theme', value: 'typography.fontWeight.bold' },
    } as never));

    const css = getStyleText();

    expect(css).toContain('.text-audit-text');
    expect(css).toContain('font-size: 24px');
    expect(css).toContain('font-weight: 700');
  });

  it('Heading resolves theme font size and font weight into editor CSS', async () => {
    const module = await import('../components/content/Heading');

    render(module.Heading.render({
      ...(module.Heading.defaultProps || {}),
      id: 'audit-heading',
      text: 'Audit heading',
      level: '2',
      fontSize: { mobile: { type: 'theme', value: 'typography.fontSize.xl' } },
      fontWeight: { type: 'theme', value: 'typography.fontWeight.bold' },
    } as never));

    const css = getStyleText();

    expect(css).toContain('.heading-audit-heading');
    expect(css).toContain('font-size: 24px');
    expect(css).toContain('font-weight: 700');
  });

  it('Link applies theme font size and font weight in editor CSS', async () => {
    const module = await import('../components/content/Link');

    render(module.Link.render({
      ...(module.Link.defaultProps || {}),
      id: 'audit-link',
      label: 'Audit link',
      linkType: 'external',
      href: 'https://example.com',
      fontSize: { mobile: { type: 'theme', value: 'typography.fontSize.xl' } },
      fontWeight: { type: 'theme', value: 'typography.fontWeight.bold' },
    } as never));

    const css = getStyleText();

    expect(css).toContain('.link-audit-link');
    expect(css).toContain('font-size: 24px');
    expect(css).toContain('font-weight: 700');
  });

  it('applies custom font weight values in editor CSS for all typography blocks', async () => {
    const [textModule, headingModule, linkModule] = await Promise.all([
      import('../components/content/Text'),
      import('../components/content/Heading'),
      import('../components/content/Link'),
    ]);

    render(textModule.Text.render({
      ...(textModule.Text.defaultProps || {}),
      id: 'audit-text-custom-weight',
      content: 'Custom weight text',
      fontWeight: { type: 'custom', value: '650' },
    } as never));

    render(headingModule.Heading.render({
      ...(headingModule.Heading.defaultProps || {}),
      id: 'audit-heading-custom-weight',
      text: 'Custom weight heading',
      level: '2',
      fontWeight: { type: 'custom', value: '650' },
    } as never));

    render(linkModule.Link.render({
      ...(linkModule.Link.defaultProps || {}),
      id: 'audit-link-custom-weight',
      label: 'Custom weight link',
      linkType: 'external',
      href: 'https://example.com',
      fontWeight: { type: 'custom', value: '650' },
    } as never));

    const css = getStyleText();

    expect(css).toContain('.text-audit-text-custom-weight');
    expect(css).toContain('.heading-audit-heading-custom-weight');
    expect(css).toContain('.link-audit-link-custom-weight');
    expect(css).toContain('font-weight: 650');
  });
});
