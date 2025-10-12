import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTenant } from '../hooks/useTenant';

describe('useTenant', () => {
  it('should throw error when used outside TenantProvider', () => {
    expect(() => {
      renderHook(() => useTenant());
    }).toThrow('useTenant must be used within a TenantProvider');
  });
});
