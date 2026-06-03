import { useEffect, useState } from 'react';
import { GuestPortalWidgetZoneRuntime } from '@/shared/puck/system-surfaces/guestPortalWidgetZone';
import { guestPortalService, type GuestPortalGuest } from '../services/guestPortal';

export function GuestPortalWidgetZoneRuntimeWrapper() {
  const [guest, setGuest] = useState<GuestPortalGuest | null>(null);

  useEffect(() => {
    let cancelled = false;

    guestPortalService.restoreSession().then((g) => {
      if (!cancelled) {
        setGuest(g);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!guest) {
    return null;
  }

  return (
    <GuestPortalWidgetZoneRuntime
      guestId={guest.id}
      guestEmail={guest.email}
      guestName={guest.name}
    />
  );
}
