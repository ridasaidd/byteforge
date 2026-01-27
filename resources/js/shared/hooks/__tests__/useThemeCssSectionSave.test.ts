import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useThemeCssSectionSave } from '../useThemeCssSectionSave';
import { themeCssApi } from '@/shared/services/api/themeCss';

vi.mock('@/shared/services/api/themeCss', () => ({
  themeCssApi: {
    saveSection: vi.fn(),
    validatePublish: vi.fn(),
    publish: vi.fn(),
  },
}));

describe('useThemeCssSectionSave', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useThemeCssSectionSave());

    expect(result.current.isSaving).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should save section CSS', async () => {
    vi.mocked(themeCssApi.saveSection).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useThemeCssSectionSave());

    await act(async () => {
      await result.current.saveSection(123, 'variables', ':root { }');
    });

    expect(themeCssApi.saveSection).toHaveBeenCalledWith(123, 'variables', ':root { }');
    expect(result.current.error).toBeNull();
  });

  it('should handle save errors', async () => {
    const error = new Error('Save failed');
    vi.mocked(themeCssApi.saveSection).mockRejectedValueOnce(error);

    const { result } = renderHook(() => useThemeCssSectionSave());

    await act(async () => {
      try {
        await result.current.saveSection(123, 'header', '.header { }');
      } catch {
        // Expected to throw
      }
    });

    expect(result.current.error).toEqual(error);
  });

  it('should save multiple sections sequentially', async () => {
    vi.mocked(themeCssApi.saveSection)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useThemeCssSectionSave());

    await act(async () => {
      await result.current.saveSection(123, 'variables', ':root { }');
      await result.current.saveSection(123, 'header', '.header { }');
      await result.current.saveSection(123, 'footer', '.footer { }');
    });

    expect(themeCssApi.saveSection).toHaveBeenCalledTimes(3);
    expect(result.current.error).toBeNull();
  });

  it('should validate publish', async () => {
    const validationResult = { valid: true, missing: [] };
    vi.mocked(themeCssApi.validatePublish).mockResolvedValueOnce(validationResult);

    const { result } = renderHook(() => useThemeCssSectionSave());

    let validation;
    await act(async () => {
      validation = await result.current.validatePublish(123);
    });

    expect(themeCssApi.validatePublish).toHaveBeenCalledWith(123);
    expect(validation).toEqual(validationResult);
  });

  it('should publish theme', async () => {
    const publishResult = { cssUrl: '/storage/themes/123/123.css?v=1234567890' };
    vi.mocked(themeCssApi.publish).mockResolvedValueOnce(publishResult);

    const { result } = renderHook(() => useThemeCssSectionSave());

    let cssUrl;
    await act(async () => {
      const response = await result.current.publish(123);
      cssUrl = response.cssUrl;
    });

    expect(themeCssApi.publish).toHaveBeenCalledWith(123);
    expect(cssUrl).toBe('/storage/themes/123/123.css?v=1234567890');
  });

  it('should clear error on successful save', async () => {
    vi.mocked(themeCssApi.saveSection)
      .mockRejectedValueOnce(new Error('First error'))
      .mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useThemeCssSectionSave());

    // First save fails
    await act(async () => {
      try {
        await result.current.saveSection(123, 'variables', ':root { }');
      } catch {
        // Expected
      }
    });

    expect(result.current.error).not.toBeNull();

    // Second save succeeds
    await act(async () => {
      await result.current.saveSection(123, 'header', '.header { }');
    });

    expect(result.current.error).toBeNull();
  });
});
