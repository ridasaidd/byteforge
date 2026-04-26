import { type Config, type Data } from '@puckeditor/core';
import { Logo } from '@/shared/components/atoms/Logo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { TenantLoginFormCard } from '@/apps/tenant/components/auth/TenantLoginFormCard';
import { GuestPortalExperience } from '@/apps/public/components/GuestPortalExperience';
import { usePuckEditMode } from '@/shared/hooks';

export type SystemSurfaceKey = 'tenant_login' | 'register' | 'forgot_password' | 'reset_password' | 'guest_portal';

interface SystemSurfaceRootProps {
  surfaceKey?: SystemSurfaceKey;
  showLogo?: boolean;
  eyebrow?: string;
  title?: string;
  description?: string;
  panelTitle?: string;
  panelDescription?: string;
  supportText?: string;
  backgroundStyle?: 'soft' | 'contrast' | 'muted';
  contentAlignment?: 'left' | 'center';
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
    showLogo: true,
    eyebrow: 'Registration',
    title: 'Create your account',
    description: 'Introduce the benefits of account creation and keep required form logic fixed in code.',
    panelTitle: 'Register',
    panelDescription: 'Preview of the locked account creation form.',
    supportText: 'You can edit the surrounding presentation here. The required registration fields stay fixed.',
    backgroundStyle: 'soft',
    contentAlignment: 'left',
  },
  forgot_password: {
    showLogo: true,
    eyebrow: 'Password recovery',
    title: 'Recover access quickly',
    description: 'Explain how password recovery works and reassure the user before they submit their email.',
    panelTitle: 'Forgot password',
    panelDescription: 'Preview of the locked recovery form.',
    supportText: 'The recovery field and submit action remain required. This surface only controls the presentation shell.',
    backgroundStyle: 'muted',
    contentAlignment: 'left',
  },
  reset_password: {
    showLogo: true,
    eyebrow: 'Secure reset',
    title: 'Choose a new password',
    description: 'Set expectations around password rules and reassure users that their reset link is secure.',
    panelTitle: 'Reset password',
    panelDescription: 'Preview of the locked reset form.',
    supportText: 'Token validation and password submission remain route-owned and cannot be removed here.',
    backgroundStyle: 'contrast',
    contentAlignment: 'left',
  },
  guest_portal: {
    showLogo: true,
    eyebrow: 'Guest portal',
    title: 'A single place for guest activity',
    description: 'Set the introduction and supporting shell copy for the authenticated guest area.',
    panelTitle: 'Portal shell preview',
    panelDescription: 'Future widgets like bookings, quotes, and estimates will live inside this route-owned shell.',
    supportText: 'This editor currently controls the shell presentation. Runtime widget zones come in a later slice.',
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
}: {
  title?: string;
  description?: string;
  fields: string[];
  actionLabel: string;
}) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
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

function GuestPortalPreviewCard({ title, description }: { title?: string; description?: string }) {
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
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-500">
          Widget zone preview
        </div>
      </CardContent>
    </Card>
  );
}

function LockedSurfacePanel({
  surfaceKey,
  panelTitle,
  panelDescription,
}: {
  surfaceKey: SystemSurfaceKey;
  panelTitle?: string;
  panelDescription?: string;
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
        />
      );
    case 'forgot_password':
      return (
        <PlaceholderSurfaceCard
          title={panelTitle}
          description={panelDescription}
          fields={['Email']}
          actionLabel="Send recovery link"
        />
      );
    case 'reset_password':
      return (
        <PlaceholderSurfaceCard
          title={panelTitle}
          description={panelDescription}
          fields={['New password', 'Confirm password']}
          actionLabel="Update password"
        />
      );
    case 'guest_portal':
      return isEditing
        ? <GuestPortalPreviewCard title={panelTitle} description={panelDescription} />
        : <GuestPortalExperience variant="embedded" />;
    default:
      return null;
  }
}

function SystemSurfaceRootRenderer({
  surfaceKey = 'tenant_login',
  showLogo = true,
  eyebrow,
  title,
  description,
  panelTitle,
  panelDescription,
  supportText,
  backgroundStyle = 'soft',
  contentAlignment = 'left',
}: SystemSurfaceRootProps) {
  const colors = palette(backgroundStyle);
  const isGuestPortal = surfaceKey === 'guest_portal';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: colors.pageBackground,
        color: colors.textColor,
        padding: 'clamp(1.5rem, 4vw, 3rem)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1280px',
          margin: '0 auto',
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
            <p style={{ margin: 0, fontSize: '1.05rem', lineHeight: 1.8, color: colors.mutedColor, maxWidth: '42rem' }}>
              {description}
            </p>
          ) : null}
          {supportText ? (
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.95rem', lineHeight: 1.7, color: colors.mutedColor, maxWidth: '38rem' }}>
              {supportText}
            </p>
          ) : null}
        </section>

        <section style={{ display: 'flex', justifyContent: 'center' }}>
          <div
            style={{
              width: '100%',
              maxWidth: isGuestPortal ? '64rem' : '40rem',
              background: isGuestPortal ? 'transparent' : colors.panelBackground,
              borderRadius: isGuestPortal ? 0 : '1.5rem',
              boxShadow: isGuestPortal ? 'none' : '0 30px 80px rgba(15, 23, 42, 0.14)',
              padding: 0,
            }}
          >
            <LockedSurfacePanel
              surfaceKey={surfaceKey}
              panelTitle={panelTitle}
              panelDescription={panelDescription}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

export function buildSystemSurfaceData(surfaceKey: SystemSurfaceKey, puckData?: Record<string, unknown> | null): Data {
  const input = (puckData ?? {}) as Data;
  const inputRoot = (input.root ?? {}) as { props?: Record<string, unknown> };

  return {
    content: Array.isArray(input.content) ? input.content : [],
    root: {
      ...inputRoot,
      props: {
        surfaceKey,
        ...surfaceDefaults[surfaceKey],
        ...(inputRoot.props ?? {}),
      },
    },
  } as unknown as Data;
}

export const systemSurfaceConfig: Config = {
  components: {},
  categories: {},
  root: {
    fields: {
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
      surfaceKey: 'tenant_login',
      ...surfaceDefaults.tenant_login,
    },
    render: SystemSurfaceRootRenderer as any,
  },
};
