import { describe, expect, it } from 'vitest';
import { buildSystemSurfaceData, getSystemSurfaceConfig } from './SystemSurfaceConfig';

describe('SystemSurfaceConfig', () => {
  it('keeps the tenant staff login surface locked to root-shell controls', () => {
    const config = getSystemSurfaceConfig('tenant_login');

    expect(Object.keys(config.components ?? {})).toHaveLength(0);
    expect(Object.keys(config.categories ?? {})).toHaveLength(0);
  });

  it('exposes a curated shared block subset for guest-facing surfaces', () => {
    const config = getSystemSurfaceConfig('guest_portal');

    expect(Object.keys(config.components ?? {})).toEqual(expect.arrayContaining([
      'Box',
      'Heading',
      'Text',
      'Divider',
      'Logo',
      'RichText',
      'Button',
      'Link',
      'Image',
    ]));
    expect(config.categories?.content?.components).toEqual(expect.arrayContaining([
      'Heading',
      'Text',
      'Divider',
      'Logo',
      'RichText',
      'Button',
      'Link',
      'Image',
    ]));
    expect(config.categories?.forms).toBeUndefined();
  });

  it('preserves authored guest content while applying surface defaults', () => {
    const data = buildSystemSurfaceData('guest_portal', {
      content: [
        {
          type: 'Heading',
          props: {
            id: 'guest-heading',
            title: 'Welcome guests',
          },
        },
      ],
      root: {
        props: {
          title: 'Customized portal shell',
        },
      },
    } as Record<string, unknown>);

    expect(data.content).toHaveLength(1);
    expect((data.root as { props?: Record<string, unknown> }).props?.surfaceKey).toBe('guest_portal');
    expect((data.root as { props?: Record<string, unknown> }).props?.title).toBe('Customized portal shell');
  });
});
