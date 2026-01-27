import { describe, it, expect, beforeEach, vi } from 'vitest';
import { themeCssApi } from '../themeCss';
import axios from 'axios';

vi.mock('axios');

describe('themeCssApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('saveSection', () => {
    it('should POST to save a section', async () => {
      const mockResponse = { data: { success: true } };
      vi.mocked(axios.post).mockResolvedValueOnce(mockResponse);

      await themeCssApi.saveSection(123, 'variables', ':root { }');

      expect(axios.post).toHaveBeenCalledWith(
        '/api/superadmin/themes/123/sections/variables',
        { css: ':root { }' }
      );
    });

    it('should handle errors when saving', async () => {
      const error = new Error('Network error');
      vi.mocked(axios.post).mockRejectedValueOnce(error);

      await expect(themeCssApi.saveSection(123, 'header', 'css')).rejects.toThrow(
        'Network error'
      );
    });
  });

  describe('getSection', () => {
    it('should GET a section', async () => {
      const mockResponse = { data: { css: '.header { }' } };
      vi.mocked(axios.get).mockResolvedValueOnce(mockResponse);

      const result = await themeCssApi.getSection(123, 'header');

      expect(axios.get).toHaveBeenCalledWith('/api/superadmin/themes/123/sections/header');
      expect(result).toBe('.header { }');
    });

    it('should return null if section does not exist', async () => {
      const mockResponse = { data: { css: null } };
      vi.mocked(axios.get).mockResolvedValueOnce(mockResponse);

      const result = await themeCssApi.getSection(123, 'footer');

      expect(result).toBeNull();
    });

    it('should handle errors when getting', async () => {
      const error = new Error('Not found');
      vi.mocked(axios.get).mockRejectedValueOnce(error);

      await expect(themeCssApi.getSection(123, 'header')).rejects.toThrow('Not found');
    });
  });

  describe('validatePublish', () => {
    it('should GET validation status', async () => {
      const mockResponse = {
        data: {
          valid: true,
          missing: [],
        },
      };
      vi.mocked(axios.get).mockResolvedValueOnce(mockResponse);

      const result = await themeCssApi.validatePublish(123);

      expect(axios.get).toHaveBeenCalledWith('/api/superadmin/themes/123/publish/validate');
      expect(result).toEqual({ valid: true, missing: [] });
    });

    it('should return missing sections', async () => {
      const mockResponse = {
        data: {
          valid: false,
          missing: ['variables', 'header'],
        },
      };
      vi.mocked(axios.get).mockResolvedValueOnce(mockResponse);

      const result = await themeCssApi.validatePublish(123);

      expect(result).toEqual({
        valid: false,
        missing: ['variables', 'header'],
      });
    });

    it('should handle errors when validating', async () => {
      const error = new Error('Validation error');
      vi.mocked(axios.get).mockRejectedValueOnce(error);

      await expect(themeCssApi.validatePublish(123)).rejects.toThrow('Validation error');
    });
  });

  describe('publish', () => {
    it('should POST to publish theme', async () => {
      const mockResponse = {
        data: {
          cssUrl: '/storage/themes/123/123.css?v=1234567890',
        },
      };
      vi.mocked(axios.post).mockResolvedValueOnce(mockResponse);

      const result = await themeCssApi.publish(123);

      expect(axios.post).toHaveBeenCalledWith('/api/superadmin/themes/123/publish');
      expect(result).toEqual({
        cssUrl: '/storage/themes/123/123.css?v=1234567890',
      });
    });

    it('should handle validation errors on publish', async () => {
      const error = {
        response: {
          status: 422,
          data: {
            errors: {
              publish: ['Missing required sections: variables, header'],
            },
          },
        },
      };
      vi.mocked(axios.post).mockRejectedValueOnce(error);

      await expect(themeCssApi.publish(123)).rejects.toEqual(error);
    });

    it('should handle server errors on publish', async () => {
      const error = new Error('Server error');
      vi.mocked(axios.post).mockRejectedValueOnce(error);

      await expect(themeCssApi.publish(123)).rejects.toThrow('Server error');
    });
  });
});
