import { lookup } from 'node:dns/promises';

export function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

export async function canResolveHostname(hostname: string): Promise<boolean> {
  if (!hostname) {
    return false;
  }

  try {
    await lookup(hostname);
    return true;
  } catch {
    return false;
  }
}
