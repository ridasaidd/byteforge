import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { BrowserContext } from '@playwright/test';

export const laravelBootstrapAvailable = existsSync(resolve(process.cwd(), 'vendor/autoload.php'))
  && existsSync(resolve(process.cwd(), 'bootstrap/app.php'))
  && (existsSync(resolve(process.cwd(), '.env')) || existsSync(resolve(process.cwd(), '.env.testing')));

export type SeededStaffRefreshSession = {
  sessionId: number;
  refreshToken: string;
  cookieName: string;
  cookiePath: string;
};

function seedStaffRefreshSession(email: string, host: string, expiresAtExpression: string): SeededStaffRefreshSession {
  const script = [
    "require 'vendor/autoload.php';",
    "$app = require 'bootstrap/app.php';",
    "$kernel = $app->make(Illuminate\\Contracts\\Console\\Kernel::class);",
    '$kernel->bootstrap();',
    '$email = $argv[1];',
    '$host = $argv[2];',
    '$expiresAtExpression = $argv[3];',
    "$user = App\\Models\\User::query()->where('email', $email)->firstOrFail();",
    "$tenantId = Stancl\\Tenancy\\Database\\Models\\Domain::query()->where('domain', $host)->value('tenant_id');",
    "$refreshToken = sprintf('playwright-expired-refresh-%s', bin2hex(random_bytes(8)));",
    "$expiresAt = eval(sprintf('return %s;', $expiresAtExpression));",
    "$session = App\\Models\\WebRefreshSession::query()->create(['user_id' => $user->id, 'guest_user_id' => null, 'tenant_id' => $tenantId, 'host' => $host, 'token_hash' => hash('sha256', $refreshToken), 'user_agent' => 'Playwright', 'ip_address' => '127.0.0.1', 'last_used_at' => now()->subHour(), 'expires_at' => $expiresAt]);",
    'echo json_encode([',
    "  'sessionId' => $session->id,",
    "  'refreshToken' => $refreshToken,",
    "  'cookieName' => (string) config('auth_sessions.refresh_cookie_name', 'byteforge_refresh'),",
    "  'cookiePath' => (string) config('auth_sessions.refresh_cookie_path', '/api/auth'),",
    '], JSON_THROW_ON_ERROR);',
  ].join(' ');

  const output = execFileSync('php', ['-r', script, email, host, expiresAtExpression], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });

  return JSON.parse(output) as SeededStaffRefreshSession;
}

export function seedActiveStaffRefreshSession(email: string, host: string): SeededStaffRefreshSession {
  return seedStaffRefreshSession(email, host, 'now()->addDay()');
}

export function seedExpiredStaffRefreshSession(email: string, host: string): SeededStaffRefreshSession {
  return seedStaffRefreshSession(email, host, 'now()->subMinute()');
}

export function cleanupSeededStaffRefreshSession(sessionId: number): void {
  const script = [
    "require 'vendor/autoload.php';",
    "$app = require 'bootstrap/app.php';",
    "$kernel = $app->make(Illuminate\\Contracts\\Console\\Kernel::class);",
    '$kernel->bootstrap();',
    '$sessionId = (int) $argv[1];',
    'App\\Models\\WebRefreshSession::query()->whereKey($sessionId)->delete();',
    'echo "ok";',
  ].join(' ');

  execFileSync('php', ['-r', script, String(sessionId)], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
}

export async function addSeededRefreshCookie(
  context: BrowserContext,
  baseUrl: string,
  session: SeededStaffRefreshSession,
): Promise<void> {
  const url = new URL(baseUrl);

  await context.addCookies([
    {
      name: session.cookieName,
      value: session.refreshToken,
      domain: url.hostname,
      path: session.cookiePath,
      httpOnly: true,
      sameSite: 'Lax',
      secure: url.protocol === 'https:',
    },
  ]);
}
