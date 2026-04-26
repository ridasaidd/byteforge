import { useEffect, useState } from 'react';
import { Render } from '@puckeditor/core';
import { Logo } from '@/shared/components/atoms/Logo';
import { TenantLoginFormCard } from '@/apps/tenant/components/auth/TenantLoginFormCard';
import { tenantSystemSurfaces } from '@/shared/services/api/systemSurfaces';
import type { SystemSurface } from '@/shared/services/api/types';
import { buildSystemSurfaceData, systemSurfaceConfig } from '@/shared/puck/system-surfaces/SystemSurfaceConfig';

export function LoginPage() {
  const [surface, setSurface] = useState<SystemSurface | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadSurface = async () => {
      try {
        const response = await tenantSystemSurfaces.publicGet('tenant_login');

        if (!cancelled) {
          setSurface(response.data);
        }
      } catch {
        if (!cancelled) {
          setSurface(null);
        }
      }
    };

    void loadSurface();

    return () => {
      cancelled = true;
    };
  }, []);

  if (surface?.puck_data) {
    return <Render config={systemSurfaceConfig} data={buildSystemSurfaceData('tenant_login', surface.puck_data)} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Logo size="lg" />
        </div>
        <TenantLoginFormCard />
      </div>
    </div>
  );
}
