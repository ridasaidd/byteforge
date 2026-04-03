import type { Page, ConsoleMessage, Request } from '@playwright/test';

type RuntimeIssue = {
  source: 'console' | 'pageerror' | 'requestfailed';
  message: string;
};

const DEFAULT_ALLOWLIST: RegExp[] = [
  /favicon\.ico/i,
  /ResizeObserver loop limit exceeded/i,
];

function parseAllowlistFromEnv(): RegExp[] {
  const raw = process.env.PLAYWRIGHT_CONSOLE_ALLOWLIST;
  if (!raw) {
    return [];
  }

  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => new RegExp(value, 'i'));
}

function isAllowed(message: string, allowlist: RegExp[]): boolean {
  return allowlist.some((pattern) => pattern.test(message));
}

function formatConsoleMessage(msg: ConsoleMessage): string {
  const location = msg.location();
  const file = location.url ? ` (${location.url}:${location.lineNumber})` : '';
  return `${msg.type()}: ${msg.text()}${file}`;
}

function formatFailedRequest(request: Request): string {
  const failureText = request.failure()?.errorText ?? 'unknown failure';
  return `${request.method()} ${request.url()} -> ${failureText}`;
}

export function attachRuntimeGuards(page: Page): RuntimeIssue[] {
  const issues: RuntimeIssue[] = [];
  const allowlist = [...DEFAULT_ALLOWLIST, ...parseAllowlistFromEnv()];

  page.on('console', (msg) => {
    if (msg.type() !== 'error') {
      return;
    }

    const message = formatConsoleMessage(msg);
    if (isAllowed(message, allowlist)) {
      return;
    }

    issues.push({ source: 'console', message });
  });

  page.on('pageerror', (error) => {
    const message = error.message;
    if (isAllowed(message, allowlist)) {
      return;
    }

    issues.push({ source: 'pageerror', message });
  });

  page.on('requestfailed', (request) => {
    const resourceType = request.resourceType();
    if (!['document', 'script', 'stylesheet', 'xhr', 'fetch'].includes(resourceType)) {
      return;
    }

    const message = formatFailedRequest(request);
    if (isAllowed(message, allowlist)) {
      return;
    }

    issues.push({ source: 'requestfailed', message });
  });

  return issues;
}

export function formatIssues(issues: RuntimeIssue[]): string {
  if (issues.length === 0) {
    return 'No runtime issues detected.';
  }

  return issues.map((issue, index) => `${index + 1}. [${issue.source}] ${issue.message}`).join('\n');
}
