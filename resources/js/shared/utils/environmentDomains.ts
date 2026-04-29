function parseCsv(value: string | undefined, fallback: string[]): string[] {
  const entries = (value ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  return entries.length > 0 ? entries : fallback;
}

export function getCentralDomains(): string[] {
  return parseCsv(import.meta.env.VITE_CENTRAL_DOMAINS, ['localhost', '127.0.0.1']);
}

export function isCentralDomainHost(hostname: string): boolean {
  return getCentralDomains().includes(hostname.trim().toLowerCase());
}

export function isTenantDomainHost(hostname: string): boolean {
  const normalizedHost = hostname.trim().toLowerCase();

  return normalizedHost.length > 0 && !isCentralDomainHost(normalizedHost);
}
