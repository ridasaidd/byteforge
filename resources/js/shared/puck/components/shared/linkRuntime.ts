import { shouldUseSpaNavigation } from '@/shared/utils/routerNavigation';

export type SharedLinkType = 'none' | 'internal' | 'external';

export interface SharedLinkRuntimeOptions {
  linkType?: SharedLinkType;
  internalPage?: string;
  href?: string;
  openInNewTab?: boolean;
}

export function resolveSharedLinkDestination({
  linkType = 'none',
  internalPage,
  href,
}: SharedLinkRuntimeOptions): string | undefined {
  if (linkType === 'internal') {
    return internalPage;
  }

  if (linkType === 'external') {
    return href;
  }

  return undefined;
}

export function getSharedLinkAnchorProps(openInNewTab = false) {
  return {
    target: openInNewTab ? '_blank' : undefined,
    rel: openInNewTab ? 'noopener noreferrer' : undefined,
  };
}

export function shouldRenderSharedSpaLink({
  linkType = 'none',
  internalPage,
  href,
  openInNewTab = false,
}: SharedLinkRuntimeOptions): boolean {
  const destination = resolveSharedLinkDestination({ linkType, internalPage, href });

  return Boolean(
    destination
      && linkType === 'internal'
      && !openInNewTab
      && shouldUseSpaNavigation(destination),
  );
}
