import { describe, expect, it } from 'vitest';
import { buildSystemSurfaceData, getSystemSurfaceConfig, getSystemSurfaceConfigWithChrome, isGuestFacingSurface } from './SystemSurfaceConfig';

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

  it('preserves guest blocks while stripping legacy guest text root props', () => {
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
    expect((data.root as { props?: Record<string, unknown> }).props?.title).toBeUndefined();
  });

  it('forces the requested surfaceKey even when stored root props contain a stale value', () => {
    const data = buildSystemSurfaceData('guest_portal', {
      content: [],
      root: {
        props: {
          surfaceKey: 'tenant_login',
        },
      },
    } as Record<string, unknown>);

    expect((data.root as { props?: Record<string, unknown> }).props?.surfaceKey).toBe('guest_portal');
  });

  it('strips legacy guest text root props while preserving guest slot controls', () => {
    const data = buildSystemSurfaceData('guest_portal', {
      content: [],
      root: {
        props: {
          showLogo: true,
          title: 'Old guest title',
          description: 'Old guest description',
          panelDescription: 'Old panel description',
          shellSlotTarget: 'panel',
          panelSlotEnabled: true,
        },
      },
    } as Record<string, unknown>);

    const props = (data.root as { props?: Record<string, unknown> }).props ?? {};

    expect(props.showLogo).toBeUndefined();
    expect(props.title).toBeUndefined();
    expect(props.description).toBeUndefined();
    expect(props.panelDescription).toBeUndefined();
    expect(props.shellSlotTarget).toBeUndefined();
    expect(props.panelSlotEnabled).toBeUndefined();
  });

  it('applies guest-portal root defaults instead of tenant-login defaults', () => {
    const config = getSystemSurfaceConfig('guest_portal');
    const rootDefaults = (config.root?.defaultProps ?? {}) as Record<string, unknown>;

    expect(rootDefaults.surfaceKey).toBe('guest_portal');
    expect(rootDefaults.title).toBeUndefined();
    expect(rootDefaults.description).toBeUndefined();
    expect(rootDefaults.eyebrow).toBeUndefined();
    expect(rootDefaults.panelTitle).toBeUndefined();
    expect(rootDefaults.panelDescription).toBeUndefined();
    expect(rootDefaults.supportText).toBeUndefined();
  });

  it('preserves tenant-login static text defaults', () => {
    const config = getSystemSurfaceConfig('tenant_login');
    const rootDefaults = (config.root?.defaultProps ?? {}) as Record<string, unknown>;

    expect(rootDefaults.surfaceKey).toBe('tenant_login');
    expect(rootDefaults.title).toBe('Welcome back');
    expect(rootDefaults.description).toBe('Sign in to access your tenant dashboard and continue managing your site.');
    expect(rootDefaults.eyebrow).toBe('Tenant access');
    expect(rootDefaults.panelTitle).toBe('Tenant login');
    expect(rootDefaults.panelDescription).toBe('Use your tenant credentials to continue.');
    expect(rootDefaults.supportText).toBe('Need help signing in? Contact the site owner or your workspace administrator.');
  });

  it('removes static text defaults from register surface', () => {
    const config = getSystemSurfaceConfig('register');
    const rootDefaults = (config.root?.defaultProps ?? {}) as Record<string, unknown>;

    expect(rootDefaults.surfaceKey).toBe('register');
    expect(rootDefaults.title).toBeUndefined();
    expect(rootDefaults.description).toBeUndefined();
    expect(rootDefaults.eyebrow).toBeUndefined();
    expect(rootDefaults.panelTitle).toBeUndefined();
    expect(rootDefaults.panelDescription).toBeUndefined();
    expect(rootDefaults.supportText).toBeUndefined();
  });

  it('removes static text defaults from forgot_password surface', () => {
    const config = getSystemSurfaceConfig('forgot_password');
    const rootDefaults = (config.root?.defaultProps ?? {}) as Record<string, unknown>;

    expect(rootDefaults.surfaceKey).toBe('forgot_password');
    expect(rootDefaults.title).toBeUndefined();
    expect(rootDefaults.description).toBeUndefined();
    expect(rootDefaults.eyebrow).toBeUndefined();
    expect(rootDefaults.panelTitle).toBeUndefined();
    expect(rootDefaults.panelDescription).toBeUndefined();
    expect(rootDefaults.supportText).toBeUndefined();
  });

  it('removes static text defaults from reset_password surface', () => {
    const config = getSystemSurfaceConfig('reset_password');
    const rootDefaults = (config.root?.defaultProps ?? {}) as Record<string, unknown>;

    expect(rootDefaults.surfaceKey).toBe('reset_password');
    expect(rootDefaults.title).toBeUndefined();
    expect(rootDefaults.description).toBeUndefined();
    expect(rootDefaults.eyebrow).toBeUndefined();
    expect(rootDefaults.panelTitle).toBeUndefined();
    expect(rootDefaults.panelDescription).toBeUndefined();
    expect(rootDefaults.supportText).toBeUndefined();
  });

  it('does not expose legacy text controls for guest-facing surfaces', () => {
    const config = getSystemSurfaceConfig('guest_portal');
    const rootFields = config.root?.fields ?? {};

    expect(rootFields.showLogo).toBeUndefined();
    expect(rootFields.eyebrow).toBeUndefined();
    expect(rootFields.title).toBeUndefined();
    expect(rootFields.description).toBeUndefined();
    expect(rootFields.panelTitle).toBeUndefined();
    expect(rootFields.panelDescription).toBeUndefined();
    expect(rootFields.supportText).toBeUndefined();
  });

  it('does not expose slot target controls for guest-facing surfaces', () => {
    const config = getSystemSurfaceConfig('guest_portal');
    const rootFields = config.root?.fields ?? {};

    expect(rootFields.shellSlotTarget).toBeUndefined();
    expect(rootFields.panelSlotEnabled).toBeUndefined();
  });

  it('exposes legacy text controls for tenant_login surface', () => {
    const config = getSystemSurfaceConfig('tenant_login');
    const rootFields = config.root?.fields ?? {};

    expect(rootFields.showLogo).toBeDefined();
    expect(rootFields.eyebrow).toBeDefined();
    expect(rootFields.title).toBeDefined();
    expect(rootFields.description).toBeDefined();
    expect(rootFields.panelTitle).toBeDefined();
    expect(rootFields.panelDescription).toBeDefined();
    expect(rootFields.supportText).toBeDefined();
  });

  it('does not expose slot controls for tenant_login surface', () => {
    const config = getSystemSurfaceConfig('tenant_login');
    const rootFields = config.root?.fields ?? {};

    expect(rootFields.shellSlotTarget).toBeUndefined();
    expect(rootFields.panelSlotEnabled).toBeUndefined();
  });

  it('does not set legacy slot-target defaults for guest-facing surfaces', () => {
    const config = getSystemSurfaceConfig('guest_portal');
    const rootDefaults = (config.root?.defaultProps ?? {}) as Record<string, unknown>;

    expect(rootDefaults.shellSlotTarget).toBeUndefined();
    expect(rootDefaults.panelSlotEnabled).toBeUndefined();
  });

  it('does not set slot defaults for tenant_login surface', () => {
    const config = getSystemSurfaceConfig('tenant_login');
    const rootDefaults = (config.root?.defaultProps ?? {}) as Record<string, unknown>;

    expect(rootDefaults.shellSlotTarget).toBeUndefined();
    expect(rootDefaults.panelSlotEnabled).toBeUndefined();
  });
});

describe('isGuestFacingSurface', () => {
  it('returns true for guest_portal', () => {
    expect(isGuestFacingSurface('guest_portal')).toBe(true);
  });

  it('returns true for reserved guest-account surfaces', () => {
    expect(isGuestFacingSurface('register')).toBe(true);
    expect(isGuestFacingSurface('forgot_password')).toBe(true);
    expect(isGuestFacingSurface('reset_password')).toBe(true);
  });

  it('returns false for tenant_login', () => {
    expect(isGuestFacingSurface('tenant_login')).toBe(false);
  });
});

describe('getSystemSurfaceConfigWithChrome', () => {
  it('returns the base config unchanged for non-guest surfaces', () => {
    const baseConfig = getSystemSurfaceConfig('tenant_login');
    const configWithChrome = getSystemSurfaceConfigWithChrome('tenant_login', {
      baseConfig,
      headerData: null,
      footerData: null,
    });

    expect(configWithChrome).toBe(baseConfig);
  });

  it('returns a config with a root render function for guest-facing surfaces', () => {
    const baseConfig = getSystemSurfaceConfig('guest_portal');
    const configWithChrome = getSystemSurfaceConfigWithChrome('guest_portal', {
      baseConfig,
      headerData: null,
      footerData: null,
    });

    expect(configWithChrome.root?.render).toBeDefined();
    expect(typeof configWithChrome.root?.render).toBe('function');
  });

  it('preserves the guest-facing components and categories', () => {
    const baseConfig = getSystemSurfaceConfig('guest_portal');
    const configWithChrome = getSystemSurfaceConfigWithChrome('guest_portal', {
      baseConfig,
      headerData: { content: [{ type: 'Heading', props: { id: 'h1', title: 'Site Header' } }], root: {} },
      footerData: { content: [{ type: 'Text', props: { id: 'f1', text: 'Footer text' } }], root: {} },
    });

    expect(Object.keys(configWithChrome.components ?? {})).toEqual(
      expect.arrayContaining(['Box', 'Heading', 'Text']),
    );
    expect(configWithChrome.categories?.content).toBeDefined();
  });

  it('does not mutate the base config', () => {
    const baseConfig = getSystemSurfaceConfig('guest_portal');
    const originalRender = baseConfig.root?.render;

    getSystemSurfaceConfigWithChrome('guest_portal', {
      baseConfig,
      headerData: null,
      footerData: null,
    });

    expect(baseConfig.root?.render).toBe(originalRender);
  });
});
