import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePuckEditMode } from '../usePuckEditMode';

// Mock usePuck hook return value
let mockUsePuckReturn: any = null;
let shouldThrowError = false;

// Mock the Puck library
vi.mock('@puckeditor/core', () => ({
  createUsePuck: () => () => {
    if (shouldThrowError) {
      throw new Error('Not in Puck context');
    }
    return mockUsePuckReturn;
  },
}));

describe('usePuckEditMode', () => {
  beforeEach(() => {
    mockUsePuckReturn = null;
    shouldThrowError = false;
    vi.clearAllMocks();
  });

  it('should return true when Puck context has appState', () => {
    mockUsePuckReturn = {
      appState: {
        data: {},
        ui: {},
      },
    };

    const { result } = renderHook(() => usePuckEditMode());

    expect(result.current).toBe(true);
  });

  it('should return false when Puck throws error (not in context)', () => {
    shouldThrowError = true;

    const { result } = renderHook(() => usePuckEditMode());

    expect(result.current).toBe(false);
  });

  it('should return false when Puck context returns null', () => {
    mockUsePuckReturn = null;

    const { result } = renderHook(() => usePuckEditMode());

    expect(result.current).toBe(false);
  });

  it('should return false when appState is undefined', () => {
    mockUsePuckReturn = {
      // No appState
    };

    const { result } = renderHook(() => usePuckEditMode());

    expect(result.current).toBe(false);
  });

  it('should detect edit mode from URL pathname when Puck context unavailable', () => {
    shouldThrowError = true;

    // Mock window.location
    const originalLocation = window.location;
    delete (window as any).location;
    window.location = { pathname: '/themes/1/edit' } as Location;

    const { result } = renderHook(() => usePuckEditMode());

    expect(result.current).toBe(true);

    // Restore
    window.location = originalLocation;
  });

  it('should return false for non-edit URLs when Puck context unavailable', () => {
    shouldThrowError = true;

    // Mock window.location
    const originalLocation = window.location;
    delete (window as any).location;
    window.location = { pathname: '/themes/1' } as Location;

    const { result } = renderHook(() => usePuckEditMode());

    expect(result.current).toBe(false);

    // Restore
    window.location = originalLocation;
  });
});
