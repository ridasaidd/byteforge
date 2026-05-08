function normalizeUrl(value: string | undefined, fallback: string): string {
  const candidate = (value ?? '').trim();

  return candidate !== '' ? candidate.replace(/\/$/, '') : fallback;
}

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'localhost';
  }
}

function resolveEmailDomain(hostname: string): string {
  const normalizedHost = hostname.trim().toLowerCase();

  if (normalizedHost === '' || normalizedHost === 'localhost' || normalizedHost === '127.0.0.1') {
    return process.env.TEST_EMAIL_DOMAIN?.trim() || 'byteforge.se';
  }

  return normalizedHost;
}

export function getCentralBaseUrl(): string {
  return normalizeUrl(
    process.env.PLAYWRIGHT_BASE_URL
      ?? process.env.VITE_TEST_BASE_URL
      ?? process.env.APP_URL,
    'http://localhost',
  );
}

export function getCentralApiBaseUrl(): string {
  return `${getCentralBaseUrl()}/api`;
}

export function getCentralHost(): string {
  return hostnameFromUrl(getCentralBaseUrl());
}

export function getCentralEmail(localPart: string): string {
  return `${localPart}@${resolveEmailDomain(getCentralHost())}`;
}

export function getCentralSuperadminEmail(): string {
  return process.env.TEST_SUPERADMIN_EMAIL?.trim() || getCentralEmail('superadmin');
}

export function getCentralAdminEmail(): string {
  return process.env.TEST_ADMIN_EMAIL?.trim() || getCentralEmail('admin');
}

export function getTenantBaseUrl(): string {
  return normalizeUrl(
    process.env.PLAYWRIGHT_TENANT_BASE_URL
      ?? process.env.VITE_TEST_TENANT_BASE_URL,
    '',
  );
}

export function getTenantHost(): string {
  const tenantBaseUrl = getTenantBaseUrl();

  return tenantBaseUrl !== '' ? hostnameFromUrl(tenantBaseUrl) : '';
}

export function getTenantRoleEmail(role: 'owner' | 'editor' | 'viewer'): string {
  const tenantHost = getTenantHost();

  if (tenantHost !== '') {
    return `${role}@${resolveEmailDomain(tenantHost)}`;
  }

  return `${role}@tenant-one.byteforge.se`;
}
