import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useWindowWidth } from '../useWindowWidth';

describe('useWindowWidth', () => {
  it('returns current window width on mount', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1280,
      writable: true,
    });

    const { result } = renderHook(() => useWindowWidth());

    expect(result.current).toBe(1280);
  });

  it('updates width after debounced resize event', () => {
    vi.useFakeTimers();

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1024,
      writable: true,
    });

    const { result } = renderHook(() => useWindowWidth());
    expect(result.current).toBe(1024);

    act(() => {
      window.innerWidth = 768;
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current).toBe(1024);

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe(768);

    vi.useRealTimers();
  });

  it('debounces multiple resize events and applies the latest width', () => {
    vi.useFakeTimers();

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1200,
      writable: true,
    });

    const { result } = renderHook(() => useWindowWidth());
    expect(result.current).toBe(1200);

    act(() => {
      window.innerWidth = 1000;
      window.dispatchEvent(new Event('resize'));
      window.innerWidth = 900;
      window.dispatchEvent(new Event('resize'));
      window.innerWidth = 800;
      window.dispatchEvent(new Event('resize'));
    });

    act(() => {
      vi.advanceTimersByTime(99);
    });

    expect(result.current).toBe(1200);

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(result.current).toBe(800);

    vi.useRealTimers();
  });
});
