import { type ReactNode, Fragment } from 'react';

export const GUEST_PORTAL_POST_AUTH_ZONE = 'widgetZone' as const;

export interface GuestPortalWidgetRenderProps {
  guestId: number | null;
  guestEmail: string | null;
  guestName: string | null;
}

export interface GuestPortalWidgetDefinition {
  id: string;
  type: string;
  label: string;
  description: string;
  featureFlag?: string;
  render: (props: GuestPortalWidgetRenderProps) => ReactNode;
}

export type GuestPortalWidgetZoneState = {
  widgetIds: string[];
};

export type GuestPortalWidgetGatingFn = (
  widget: GuestPortalWidgetDefinition,
  tenantId?: string | null,
) => boolean;

let guestPortalWidgetGating: GuestPortalWidgetGatingFn = () => true;

export function setGuestPortalWidgetGating(fn: GuestPortalWidgetGatingFn): void {
  guestPortalWidgetGating = fn;
}

export function getGuestPortalWidgetGating(): GuestPortalWidgetGatingFn {
  return guestPortalWidgetGating;
}

export function canRenderGuestPortalWidget(
  widget: GuestPortalWidgetDefinition,
  tenantId?: string | null,
): boolean {
  return guestPortalWidgetGating(widget, tenantId);
}

const guestPortalWidgetRegistry = new Map<string, GuestPortalWidgetDefinition>();

export function registerGuestPortalWidget(definition: GuestPortalWidgetDefinition): void {
  guestPortalWidgetRegistry.set(definition.id, definition);
}

export function getGuestPortalWidget(id: string): GuestPortalWidgetDefinition | undefined {
  return guestPortalWidgetRegistry.get(id);
}

export function getRegisteredGuestPortalWidgets(): GuestPortalWidgetDefinition[] {
  return Array.from(guestPortalWidgetRegistry.values());
}

export function clearGuestPortalWidgetRegistry(): void {
  guestPortalWidgetRegistry.clear();
}

export function GuestPortalWidgetZoneRuntime({
  guestId,
  guestEmail,
  guestName,
}: GuestPortalWidgetRenderProps) {
  const widgets = getRegisteredGuestPortalWidgets();
  const eligible = widgets.filter((widget) =>
    canRenderGuestPortalWidget(widget, null),
  );

  if (eligible.length === 0) {
    return null;
  }

  return (
    <>
      {eligible.map((widget) => (
        <Fragment key={widget.id}>
          {widget.render({ guestId, guestEmail, guestName })}
        </Fragment>
      ))}
    </>
  );
}
