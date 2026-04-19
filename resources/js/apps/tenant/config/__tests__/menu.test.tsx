import '@testing-library/jest-dom/vitest';
import '@/i18n';
import i18n from '@/i18n';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTenantMenuItems } from '../menu';

vi.mock('@/shared/hooks/useAddon', () => ({
  useAddon: () => ({
    hasAddon: (name: string) => name === 'booking',
  }),
}));

describe('useTenantMenuItems', () => {
  beforeEach(async () => {
    await act(async () => {
      await i18n.changeLanguage('sv');
    });
  });

  afterEach(async () => {
    await act(async () => {
      await i18n.changeLanguage('en');
    });
  });

  it('translates booking control-panel navigation items', () => {
    const { result } = renderHook(() => useTenantMenuItems());

    const labels = result.current.map((item) => item.label);

    expect(labels).toContain('Bokningar');
    expect(labels).toContain('Tjänster');
    expect(labels).toContain('Resurser');
    expect(labels).toContain('Bokningsinställningar');
  });
});