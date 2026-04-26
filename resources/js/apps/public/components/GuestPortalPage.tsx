import { useEffect, useState } from 'react';
import { Render } from '@puckeditor/core';
import { tenantSystemSurfaces } from '@/shared/services/api/systemSurfaces';
import { buildSystemSurfaceData, systemSurfaceConfig } from '@/shared/puck/system-surfaces/SystemSurfaceConfig';
import type { SystemSurface } from '@/shared/services/api/types';
import { GuestPortalExperience } from './GuestPortalExperience';

export function GuestPortalPage() {
  const [surface, setSurface] = useState<SystemSurface | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadSurface = async () => {
      try {
        const response = await tenantSystemSurfaces.publicGet('guest_portal');

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
    return <Render config={systemSurfaceConfig} data={buildSystemSurfaceData('guest_portal', surface.puck_data)} />;
  }

  return <GuestPortalExperience variant="standalone" />;
}
