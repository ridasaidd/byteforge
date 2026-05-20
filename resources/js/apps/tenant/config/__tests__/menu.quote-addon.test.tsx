import '@testing-library/jest-dom/vitest';
import '@/i18n';
import i18n from '@/i18n';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTenantMenuItems } from '../menu';

const { hasAddonMock } = vi.hoisted(() => ({
  hasAddonMock: vi.fn(),
}));

vi.mock('@/shared/hooks/useAddon', () => ({
  useAddon: () => ({
    hasAddon: hasAddonMock,
  }),
}));

describe('useTenantMenuItems quote addon', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await act(async () => {
      await i18n.changeLanguage('en');
    });
  });

  afterEach(async () => {
    await act(async () => {
      await i18n.changeLanguage('en');
    });
  });

  it('shows quotes navigation when the estimates addon is active', () => {
    hasAddonMock.mockImplementation((name: string) => name === 'estimates_quotes');

    const { result } = renderHook(() => useTenantMenuItems());
    const labels = result.current.map((item) => item.label);

    expect(labels).toContain('Quotes');
  });

  it('hides quotes navigation when the estimates addon is inactive', () => {
    hasAddonMock.mockReturnValue(false);

    const { result } = renderHook(() => useTenantMenuItems());
    const labels = result.current.map((item) => item.label);

    expect(labels).not.toContain('Quotes');
  });

  it('shows activity log navigation in the tenant menu', () => {
    hasAddonMock.mockReturnValue(false);

    const { result } = renderHook(() => useTenantMenuItems());
    const labels = result.current.map((item) => item.label);

    expect(labels).toContain('Activity Log');
  });
});
