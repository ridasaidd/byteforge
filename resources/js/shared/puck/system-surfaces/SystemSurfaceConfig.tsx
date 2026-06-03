import { type ReactNode, lazy, Suspense } from 'react';
import { type Config, type Data } from '@puckeditor/core';
import { Logo } from '@/shared/components/atoms/Logo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { TenantLoginFormCard } from '@/apps/tenant/components/auth/TenantLoginFormCard';

const PageEditorPreview = lazy(() =>
  import('@/shared/components/organisms/PageEditorPreview').then((m) => ({ default: m.PageEditorPreview }))
);
import { GuestPortalExperience } from '@/apps/public/components/GuestPortalExperience';
import { GuestPortalWidgetZoneRuntimeWrapper } from '@/apps/public/components/GuestPortalWidgetZoneRuntimeWrapper';
import { usePuckEditMode } from '@/shared/hooks';
import {
  Box,
  Heading,
  Text,
  Divider,
  Logo as LogoBlock,
  RichText,
  Button,
  Link,
  Image,
} from '@/shared/puck/components';
import {
  backgroundFields,
  backgroundImageFields,
  fontFamilyField,
  textColorField,
  spacingFields,
} from '@/shared/puck/fields/fieldGroups';
import { buildLayoutCSS } from '@/shared/puck/fields/cssBuilder';
import type { ColorValue, ResponsiveSpacingValue } from '@/shared/puck/fields';
import { getSystemSurfaceAdminTitle } from './systemSurfaceLabels';
import { GUEST_PORTAL_POST_AUTH_ZONE } from './guestPortalWidgetZone';

export type SystemSurfaceKey = 'tenant_login' | 'register' | 'forgot_password' | 'reset_password' | 'guest_portal';

const guestFacingSurfaceKeys = new Set<SystemSurfaceKey>([
  'register',
  'forgot_password',
  'reset_password',
  'guest_portal',
]);

const guestFacingComponents: Config['components'] = {
  Box: Box as Config['components'][string],
  Heading: Heading as Config['components'][string],
  Text: Text as Config['components'][string],
  Divider: Divider as Config['components'][string],
  Logo: LogoBlock as Config['components'][string],
  RichText: RichText as Config['components'][string],
  Button: Button as Config['components'][string],
  Link: Link as Config['components'][string],
  Image: Image as Config['components'][string],
};

const guestFacingCategories: Config['categories'] = {
  layout: {
    components: ['Box'],
    title: 'Layout',
    defaultExpanded: true,
  },
  content: {
    components: ['Heading', 'Text', 'Divider', 'Logo', 'RichText', 'Button', 'Link', 'Image'],
    title: 'Content',
    defaultExpanded: true,
  },
};

export { getSystemSurfaceAdminTitle };

export function isGuestFacingSurface(surfaceKey: SystemSurfaceKey): boolean {
  return guestFacingSurfaceKeys.has(surfaceKey);
}

interface SystemSurfaceChromeOptions {
  baseConfig: Config;
  previewConfig?: Config;
  headerData: Data | null;
  footerData: Data | null;
  onEditSection?: (section: 'header' | 'footer') => void;
}

export function getSystemSurfaceConfigWithChrome(
  surfaceKey: SystemSurfaceKey,
  options: SystemSurfaceChromeOptions,
): Config {
  if (!isGuestFacingSurface(surfaceKey)) {
    return options.baseConfig;
  }

  const { baseConfig, previewConfig, headerData, footerData, onEditSection } = options;

  return {
    ...baseConfig,
    root: {
      ...baseConfig.root,
      render: (props: SystemSurfaceRootProps & { children?: ReactNode }) => (
        <SystemSurfaceChromeRenderer
          {...props}
          headerData={headerData}
          footerData={footerData}
          previewConfig={previewConfig ?? baseConfig}
          onEditSection={onEditSection}
        />
      ),
    },
  };
}

interface SystemSurfaceRootProps {
  _rootId?: string;
  surfaceKey?: SystemSurfaceKey;
  children?: ReactNode;
  showLogo?: boolean;
  eyebrow?: string;
  title?: string;
  description?: string;
  panelTitle?: string;
  panelDescription?: string;
  supportText?: string;
  backgroundStyle?: 'soft' | 'contrast' | 'muted';
  contentAlignment?: 'left' | 'center';
  backgroundColor?: ColorValue;
  backgroundImage?: string;
  backgroundSize?: string;
  backgroundPosition?: string;
  backgroundRepeat?: string;
  color?: ColorValue;
  fontFamily?: string;
  maxWidth?: string;
  minHeight?: string;
  padding?: ResponsiveSpacingValue;
  margin?: ResponsiveSpacingValue;
  puck?: {
    renderDropZone?: (props: {
      zone: string;
      minEmptyHeight?: string | number;
      className?: string;
    }) => ReactNode;
  };
}

const legacyGuestRootTextKeys: string[] = [
  'showLogo',
  'eyebrow',
  'title',
  'description',
  'panelTitle',
  'panelDescription',
  'supportText',
  'shellSlotTarget',
  'panelSlotEnabled',
];

function stripLegacyGuestRootTextProps(inputProps: Record<string, unknown>): Record<string, unknown> {
  const next = { ...inputProps };
  for (const key of legacyGuestRootTextKeys) {
    delete next[key];
  }
  return next;
}

const surfaceDefaults: Record<SystemSurfaceKey, Omit<SystemSurfaceRootProps, 'surfaceKey'>> = {
  tenant_login: {
    showLogo: true,
    eyebrow: 'Tenant access',
    title: 'Welcome back',
    description: 'Sign in to access your tenant dashboard and continue managing your site.',
    panelTitle: 'Tenant login',
    panelDescription: 'Use your tenant credentials to continue.',
    supportText: 'Need help signing in? Contact the site owner or your workspace administrator.',
    backgroundStyle: 'soft',
    contentAlignment: 'left',
  },
  register: {
    backgroundStyle: 'soft',
    contentAlignment: 'left',
  },
  forgot_password: {
    backgroundStyle: 'muted',
    contentAlignment: 'left',
  },
  reset_password: {
    backgroundStyle: 'contrast',
    contentAlignment: 'left',
  },
  guest_portal: {
    backgroundStyle: 'soft',
    contentAlignment: 'left',
  },
};

function palette(backgroundStyle: SystemSurfaceRootProps['backgroundStyle']) {
  switch (backgroundStyle) {
    case 'contrast':
      return {
        pageBackground: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        textColor: '#f8fafc',
        mutedColor: 'rgba(248,250,252,0.78)',
        panelBackground: '#ffffff',
      };
    case 'muted':
      return {
        pageBackground: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)',
        textColor: '#0f172a',
        mutedColor: '#475569',
        panelBackground: '#ffffff',
      };
    case 'soft':
    default:
      return {
        pageBackground: 'linear-gradient(135deg, #fff7ed 0%, #ffffff 55%, #eff6ff 100%)',
        textColor: '#0f172a',
        mutedColor: '#475569',
        panelBackground: '#ffffff',
      };
  }
}

function PlaceholderSurfaceCard({
  title,
  description,
  fields,
  actionLabel,
  panelSlotContent,
}: {
  title?: string;
  description?: string;
  fields: string[];
  actionLabel: string;
  panelSlotContent?: ReactNode;
}) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {panelSlotContent ? (
          <div className="pb-3 border-b mb-3">
            {panelSlotContent}
          </div>
        ) : null}
        {fields.map((field) => (
          <div key={field} className="space-y-2">
            <div className="text-sm font-medium text-slate-700">{field}</div>
            <div className="h-10 rounded-md border bg-slate-50" />
          </div>
        ))}
        <div className="h-10 rounded-md bg-slate-900 text-white flex items-center justify-center text-sm font-medium">
          {actionLabel}
        </div>
      </CardContent>
    </Card>
  );
}

function GuestPortalPreviewCard({ title, description, panelSlotContent }: { title?: string; description?: string; panelSlotContent?: ReactNode }) {
  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Badge variant="outline">Locked shell</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-slate-50 p-4">
          <div className="text-sm font-medium text-slate-700">Signed in as</div>
          <div className="mt-2 text-sm text-slate-500">guest@example.com</div>
        </div>
        {panelSlotContent ? (
          <div className="rounded-lg border p-4">
            {panelSlotContent}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-500">
            Widget zone preview
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LockedSurfacePanel({
  surfaceKey,
  panelTitle,
  panelDescription,
  panelSlotContent,
}: {
  surfaceKey: SystemSurfaceKey;
  panelTitle?: string;
  panelDescription?: string;
  panelSlotContent?: ReactNode;
}) {
  const isEditing = usePuckEditMode();

  switch (surfaceKey) {
    case 'tenant_login':
      return <TenantLoginFormCard title={panelTitle} description={panelDescription} />;
    case 'register':
      return (
        <PlaceholderSurfaceCard
          title={panelTitle}
          description={panelDescription}
          fields={['Full name', 'Email', 'Password']}
          actionLabel="Create account"
          panelSlotContent={panelSlotContent}
        />
      );
    case 'forgot_password':
      return (
        <PlaceholderSurfaceCard
          title={panelTitle}
          description={panelDescription}
          fields={['Email']}
          actionLabel="Send recovery link"
          panelSlotContent={panelSlotContent}
        />
      );
    case 'reset_password':
      return (
        <PlaceholderSurfaceCard
          title={panelTitle}
          description={panelDescription}
          fields={['New password', 'Confirm password']}
          actionLabel="Update password"
          panelSlotContent={panelSlotContent}
        />
      );
    case 'guest_portal':
      return isEditing
        ? <GuestPortalPreviewCard title={panelTitle} description={panelDescription} panelSlotContent={panelSlotContent} />
        : <GuestPortalExperience variant="embedded" />;
    default:
      return null;
  }
}

function SystemSurfaceRootRenderer({
  _rootId,
  surfaceKey = 'tenant_login',
  children,
  showLogo = false,
  eyebrow,
  title,
  description,
  panelTitle,
  panelDescription,
  supportText,
  backgroundStyle = 'soft',
  contentAlignment = 'left',
  backgroundColor,
  backgroundImage,
  backgroundSize,
  backgroundPosition,
  backgroundRepeat,
  color,
  fontFamily,
  maxWidth,
  minHeight,
  padding,
  margin,
  puck,
}: SystemSurfaceRootProps) {
  const paletteColors = palette(backgroundStyle);
  const isGuestPortal = surfaceKey === 'guest_portal';
  const isGuestFacing = guestFacingSurfaceKeys.has(surfaceKey);
  const isEditing = usePuckEditMode();
  const outerClass = _rootId ? `system-surface-root-${_rootId}` : 'system-surface-root';
  const innerClass = _rootId ? `system-surface-root-${_rootId}-inner` : 'system-surface-root-inner';

  const renderDropZone = puck?.renderDropZone;
  const heroSlotContent = isGuestFacing
    ? (renderDropZone?.({
      zone: 'hero',
      minEmptyHeight: 120,
      className: 'system-surface-hero-slot',
    }) ?? (children ? <div>{children}</div> : null))
    : null;
  const panelSlotContent = isGuestFacing
    ? (renderDropZone?.({
      zone: 'panel',
      minEmptyHeight: 110,
      className: 'system-surface-panel-slot',
    }) ?? null)
    : null;
  const panelSlotPlaceholder = (isGuestFacing && isEditing && !panelSlotContent)
    ? (
      <div className="rounded-lg border border-dashed p-4 text-sm text-slate-500">
        Panel slot active. Add blocks to place content in this panel area.
      </div>
    )
    : null;
  const resolvedPanelSlotContent = panelSlotContent ?? panelSlotPlaceholder;

  const puckWidgetZoneContent = isGuestPortal
    ? (renderDropZone?.({
      zone: GUEST_PORTAL_POST_AUTH_ZONE,
      minEmptyHeight: 200,
      className: 'system-surface-widget-zone',
    }) ?? null)
    : null;
  const widgetZonePlaceholder = (isGuestPortal && isEditing && !puckWidgetZoneContent)
    ? (
      <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center">
        <p className="text-sm font-medium text-slate-600">Guest portal widget zone</p>
        <p className="mt-2 text-xs text-slate-500">
          Drag add-on portal widgets here. Widgets will appear below the guest session shell
          for authenticated guests.
        </p>
      </div>
    )
    : null;

  const editorWidgetZoneContent = isEditing
    ? (puckWidgetZoneContent ?? widgetZonePlaceholder)
    : null;

  const runtimeWidgetZoneContent = !isEditing && isGuestPortal
    ? <GuestPortalWidgetZoneRuntimeWrapper />
    : null;

  const resolvedWidgetZoneContent = isEditing
    ? editorWidgetZoneContent
    : runtimeWidgetZoneContent;

  const resolveColorValue = (value: ColorValue | undefined, fallback: string) => {
    if (!value) return fallback;
    if (typeof value === 'string') return value;
    if (value.type === 'theme' && value.value) {
      return `var(--${value.value.replace(/\./g, '-')}, ${fallback})`;
    }
    return value.value || fallback;
  };

  const pageBackground = backgroundImage
    ? `url(${backgroundImage})`
    : resolveColorValue(backgroundColor, paletteColors.pageBackground);
  const textColor = resolveColorValue(color, paletteColors.textColor);
  const mutedColor = textColor === paletteColors.textColor
    ? paletteColors.mutedColor
    : textColor;
  const outerRules: string[] = [
    `background: ${pageBackground}`,
    `color: ${textColor}`,
    `font-family: ${fontFamily || 'var(--font-family-sans, system-ui, sans-serif)'}`,
    `padding: clamp(1.5rem, 4vw, 3rem)`,
  ];

  if (backgroundImage) {
    outerRules.push(`background-size: ${backgroundSize || 'cover'}`);
    outerRules.push(`background-position: ${backgroundPosition || 'center'}`);
    outerRules.push(`background-repeat: ${backgroundRepeat || 'no-repeat'}`);
  }

  if (minHeight && minHeight !== 'auto') {
    outerRules.push(`min-height: ${minHeight}`);
  } else {
    outerRules.push('min-height: 100vh');
  }

  const innerLayoutCss = buildLayoutCSS({ className: innerClass, padding, margin });
  const rootCss = [
    `.${outerClass} { ${outerRules.join('; ')}; }`,
    `.${innerClass} { width: 100%; max-width: ${maxWidth || '1280px'}; margin: 0 auto; }`,
    innerLayoutCss,
  ].join('\n');

  return (
    <div
      className={outerClass}
    >
      {(isEditing || backgroundImage || backgroundColor || color || fontFamily || maxWidth || minHeight || padding || margin)
        ? <style>{rootCss}</style>
        : null}
      <div
        className={innerClass}
        style={{
          display: 'grid',
          gap: '2rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          alignItems: isGuestPortal ? 'start' : 'center',
          minHeight: 'calc(100vh - 6rem)',
        }}
      >
        <section
          style={{
            textAlign: contentAlignment,
            display: 'grid',
            gap: '1rem',
            alignContent: 'center',
          }}
        >
          {showLogo ? (
            <div style={{ display: 'flex', justifyContent: contentAlignment === 'center' ? 'center' : 'flex-start' }}>
              <Logo size="lg" />
            </div>
          ) : null}
          {eyebrow ? (
            <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {eyebrow}
            </p>
          ) : null}
          {title ? (
            <h1 style={{ margin: 0, fontSize: 'clamp(2.5rem, 6vw, 4.75rem)', lineHeight: 0.95, letterSpacing: '-0.04em' }}>
              {title}
            </h1>
          ) : null}
          {description ? (
            <p style={{ margin: 0, fontSize: '1.05rem', lineHeight: 1.8, color: mutedColor, maxWidth: '42rem' }}>
              {description}
            </p>
          ) : null}
          {supportText ? (
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.95rem', lineHeight: 1.7, color: mutedColor, maxWidth: '38rem' }}>
              {supportText}
            </p>
          ) : null}
          {heroSlotContent ? (
            <div style={{ width: '100%', maxWidth: '42rem' }}>
              {heroSlotContent}
            </div>
          ) : null}
        </section>

        <section style={{ display: 'flex', justifyContent: 'center' }}>
          <div
            style={{
              width: '100%',
              maxWidth: isGuestPortal ? '64rem' : '40rem',
              background: isGuestPortal ? 'transparent' : paletteColors.panelBackground,
              borderRadius: isGuestPortal ? 0 : '1.5rem',
              boxShadow: isGuestPortal ? 'none' : '0 30px 80px rgba(15, 23, 42, 0.14)',
              padding: 0,
            }}
          >
            <LockedSurfacePanel
              surfaceKey={surfaceKey}
              panelTitle={panelTitle}
              panelDescription={panelDescription}
              panelSlotContent={resolvedPanelSlotContent}
            />
          </div>
        </section>
      </div>
      {resolvedWidgetZoneContent ? (
        <div
          style={{
            width: '100%',
            maxWidth: '1280px',
            margin: '3rem auto 0',
            padding: '0',
          }}
        >
          {resolvedWidgetZoneContent}
        </div>
      ) : null}
    </div>
  );
}

function SystemSurfaceChromeRenderer({
  children,
  headerData,
  footerData,
  previewConfig,
  onEditSection,
  ...rootProps
}: SystemSurfaceRootProps & {
  children?: ReactNode;
  headerData: Data | null;
  footerData: Data | null;
  previewConfig: Config;
  onEditSection?: (section: 'header' | 'footer') => void;
}) {
  return (
    <Suspense fallback={<SystemSurfaceRootRenderer {...rootProps}>{children}</SystemSurfaceRootRenderer>}>
      <PageEditorPreview
        headerData={headerData}
        footerData={footerData}
        config={previewConfig}
        onEditSection={onEditSection}
      >
        <SystemSurfaceRootRenderer {...rootProps}>
          {children}
        </SystemSurfaceRootRenderer>
      </PageEditorPreview>
    </Suspense>
  );
}

export function buildSystemSurfaceData(surfaceKey: SystemSurfaceKey, puckData?: Record<string, unknown> | null): Data {
  const input = (puckData ?? {}) as Data;
  const inputRoot = (input.root ?? {}) as { props?: Record<string, unknown> };
  const rawInputProps = inputRoot.props ?? {};
  const inputProps = isGuestFacingSurface(surfaceKey)
    ? stripLegacyGuestRootTextProps(rawInputProps)
    : rawInputProps;

  return {
    content: Array.isArray(input.content) ? input.content : [],
    root: {
      ...inputRoot,
      props: {
        ...surfaceDefaults[surfaceKey],
        ...inputProps,
        surfaceKey,
      },
    },
  } as unknown as Data;
}

let cachedSystemSurfaceConfig: Config | null = null;
let cachedStaffLoginSystemSurfaceConfig: Config | null = null;
let cachedGuestFacingSystemSurfaceConfig: Config | null = null;

function createBaseSystemSurfaceConfig(): Config {
  const sharedRootFields = {
    ...backgroundFields,
    ...backgroundImageFields,
    ...textColorField,
    ...fontFamilyField('sans'),
    maxWidth: {
      type: 'select',
      label: 'Max Width',
      options: [
        { label: 'Full', value: '100%' },
        { label: '1440px', value: '1440px' },
        { label: '1280px', value: '1280px' },
        { label: '1024px', value: '1024px' },
        { label: '768px', value: '768px' },
      ],
    },
    minHeight: {
      type: 'select',
      label: 'Min Height',
      options: [
        { label: 'Auto', value: 'auto' },
        { label: '100vh (Full Screen)', value: '100vh' },
        { label: '75vh', value: '75vh' },
        { label: '50vh', value: '50vh' },
      ],
    },
    ...spacingFields,
  };

  const sharedRootDefaults = {
    backgroundColor: { type: 'custom', value: '#ffffff' },
    backgroundImage: '',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    color: { type: 'theme', value: 'colors.foreground' },
    fontFamily: undefined,
    maxWidth: '100%',
    minHeight: 'auto',
    padding: {
      mobile: { top: '0', right: '0', bottom: '0', left: '0', unit: 'px', linked: true },
    },
    margin: {
      mobile: { top: '0', right: '0', bottom: '0', left: '0', unit: 'px', linked: true },
    },
  } as Record<string, unknown>;

  return {
    components: {},
    categories: {},
    root: {
      fields: {
        ...sharedRootFields,
        backgroundStyle: {
          type: 'select',
          label: 'Background style',
          options: [
            { label: 'Soft', value: 'soft' },
            { label: 'Contrast', value: 'contrast' },
            { label: 'Muted', value: 'muted' },
          ],
        },
        contentAlignment: {
          type: 'select',
          label: 'Content alignment',
          options: [
            { label: 'Left', value: 'left' },
            { label: 'Center', value: 'center' },
          ],
        },
      },
      defaultProps: {
        ...sharedRootDefaults,
      },
      render: SystemSurfaceRootRenderer as any,
    },
  };
}

function createStaffLoginSystemSurfaceConfig(baseConfig: Config): Config {
  return {
    ...baseConfig,
    root: {
      ...baseConfig.root,
      fields: {
        ...baseConfig.root?.fields,
        showLogo: {
          type: 'radio',
          label: 'Show logo',
          options: [
            { label: 'Yes', value: true },
            { label: 'No', value: false },
          ],
        },
        eyebrow: {
          type: 'text',
          label: 'Eyebrow',
        },
        title: {
          type: 'text',
          label: 'Main title',
        },
        description: {
          type: 'textarea',
          label: 'Description',
        },
        panelTitle: {
          type: 'text',
          label: 'Panel title',
        },
        panelDescription: {
          type: 'textarea',
          label: 'Panel description',
        },
        supportText: {
          type: 'textarea',
          label: 'Support text',
        },
      },
    },
  };
}

function createGuestFacingSystemSurfaceConfig(baseConfig: Config): Config {
  return {
    ...baseConfig,
    components: guestFacingComponents,
    categories: guestFacingCategories,
  };
}

function applySurfaceRootDefaults(config: Config, surfaceKey: SystemSurfaceKey): Config {
  const root = config.root;
  const defaultProps = (root?.defaultProps ?? {}) as Record<string, unknown>;

  return {
    ...config,
    root: {
      ...root,
      defaultProps: {
        ...defaultProps,
        ...surfaceDefaults[surfaceKey],
        surfaceKey,
      },
    },
  };
}

export function getSystemSurfaceConfig(surfaceKey: SystemSurfaceKey): Config {
  if (!cachedSystemSurfaceConfig) {
    cachedSystemSurfaceConfig = createBaseSystemSurfaceConfig();
  }

  if (surfaceKey === 'tenant_login') {
    if (!cachedStaffLoginSystemSurfaceConfig) {
      cachedStaffLoginSystemSurfaceConfig = createStaffLoginSystemSurfaceConfig(cachedSystemSurfaceConfig);
    }
    return applySurfaceRootDefaults(cachedStaffLoginSystemSurfaceConfig, surfaceKey);
  }

  if (!cachedGuestFacingSystemSurfaceConfig) {
    cachedGuestFacingSystemSurfaceConfig = createGuestFacingSystemSurfaceConfig(cachedSystemSurfaceConfig);
  }

  return applySurfaceRootDefaults(cachedGuestFacingSystemSurfaceConfig, surfaceKey);
}
