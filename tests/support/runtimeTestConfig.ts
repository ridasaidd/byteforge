import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const loadedEnv = loadEnvFiles(process.env.PLAYWRIGHT_ENV_MODE?.trim() || process.env.NODE_ENV || 'development');

for (const [key, value] of Object.entries(loadedEnv)) {
  if ((process.env[key] ?? '').trim() === '' && value.trim() !== '') {
    process.env[key] = value;
  }
}

// This module is imported by both Playwright and Vitest. Keep env loading
// Vite-free here so jsdom workers don't pull esbuild into setup.
if ((process.env.PLAYWRIGHT_BASE_URL ?? '').trim() === '') {
  const centralBaseUrl = (process.env.VITE_TEST_BASE_URL ?? process.env.APP_URL ?? '').trim();

  if (centralBaseUrl !== '') {
    process.env.PLAYWRIGHT_BASE_URL = centralBaseUrl;
  }
}

if ((process.env.PLAYWRIGHT_TENANT_BASE_URL ?? '').trim() === '') {
  const derivedTenantBaseUrl = deriveTenantBaseUrl();

  if (derivedTenantBaseUrl !== '') {
    process.env.PLAYWRIGHT_TENANT_BASE_URL = derivedTenantBaseUrl;
  }
}

function loadEnvFiles(mode: string): Record<string, string> {
  const env: Record<string, string> = {};

  for (const filePath of envFilePaths(mode)) {
    if (!existsSync(filePath)) {
      continue;
    }

    for (const [key, value] of Object.entries(parseEnvFile(filePath))) {
      env[key] = value;
    }
  }

  return env;
}

function envFilePaths(mode: string): string[] {
  const normalizedMode = mode.trim();
  const cwd = process.cwd();
  const paths = [
    resolve(cwd, '.env'),
    resolve(cwd, '.env.local'),
  ];

  if (normalizedMode !== '') {
    paths.push(
      resolve(cwd, `.env.${normalizedMode}`),
      resolve(cwd, `.env.${normalizedMode}.local`),
    );
  }

  return paths;
}

function parseEnvFile(filePath: string): Record<string, string> {
  const entries: Record<string, string> = {};
  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === '' || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');

    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim().replace(/^export\s+/, '');
    const rawValue = trimmed.slice(separatorIndex + 1).trim();

    if (key === '') {
      continue;
    }

    entries[key] = normalizeEnvValue(rawValue);
  }

  return entries;
}

function normalizeEnvValue(value: string): string {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  return value;
}

function normalizeUrl(value: string | undefined, fallback: string): string {
  const candidate = (value ?? '').trim();

  return candidate !== '' ? candidate.replace(/\/$/, '') : fallback;
}

function deriveTenantBaseUrl(): string {
  const tenantDomainTemplate = (process.env.TENANCY_FALLBACK_TENANT_DOMAIN_TEMPLATE ?? '').trim();
  const tenantKey = (process.env.PLAYWRIGHT_TENANT_KEY ?? process.env.PLAYWRIGHT_TENANT_SLUG ?? 'tenant-one').trim();

  if (tenantDomainTemplate === '' || tenantKey === '') {
    return '';
  }

  const tenantHost = tenantDomainTemplate.replace(':tenant', tenantKey).trim();

  if (tenantHost === '') {
    return '';
  }

  const centralBaseUrl = normalizeUrl(
    process.env.PLAYWRIGHT_BASE_URL
      ?? process.env.VITE_TEST_BASE_URL
      ?? process.env.APP_URL,
    '',
  );

  try {
    const protocol = new URL(centralBaseUrl).protocol || 'http:';

    return `${protocol}//${tenantHost}`.replace(/\/$/, '');
  } catch {
    return `http://${tenantHost}`;
  }
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
      ?? process.env.VITE_TEST_TENANT_BASE_URL
      ?? deriveTenantBaseUrl(),
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
