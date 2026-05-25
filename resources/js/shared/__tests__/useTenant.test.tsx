import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTenant } from '../hooks/useTenant';

describe('useTenant', () => {
  it('should throw error when used outside TenantProvider', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useTenant());
    }).toThrow('useTenant must be used within a TenantProvider');

    consoleErrorSpy.mockRestore();
  });
});
