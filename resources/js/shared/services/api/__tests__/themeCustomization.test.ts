/**
 * Phase 6 Step 4: Theme Customization API Client Tests
 *
 * Tests for the themeCustomization API client that provides
 * methods for saving and retrieving customized theme sections
 * (settings, header, footer CSS and data)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { themeCustomization } from '../themeCustomization';
import { http } from '../../http';

// Mock the http module
vi.mock('../../http', () => ({
  http: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('themeCustomization API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCustomization', () => {
    it('should fetch customization for a theme', async () => {
      const mockCustomization = {
        data: {
          settings_css: '.settings { color: blue; }',
          header_css: '.header { color: red; }',
          footer_css: '.footer { color: green; }',
        },
      };

      vi.mocked(http.get).mockResolvedValue(mockCustomization);

      const result = await themeCustomization.getCustomization(123);

      expect(http.get).toHaveBeenCalledWith('/themes/123/customization');
      expect(result).toEqual(mockCustomization);
    });

    it('should handle missing customization gracefully', async () => {
      const mockCustomization = {
        data: {
          settings_css: null,
          header_css: null,
          footer_css: null,
        },
      };

      vi.mocked(http.get).mockResolvedValue(mockCustomization);

      const result = await themeCustomization.getCustomization(123);

      expect(result.data.settings_css).toBeNull();
      expect(result.data.header_css).toBeNull();
      expect(result.data.footer_css).toBeNull();
    });
  });

  describe('saveSection', () => {
    it('should save CSS for settings section', async () => {
      const mockResponse = {
        data: {
          id: 123,
          settings_css: '.variables { --primary: #222; }',
        },
        message: 'Settings saved successfully',
      };

      vi.mocked(http.post).mockResolvedValue(mockResponse);

      const result = await themeCustomization.saveSection(123, 'settings', {
        css: '.variables { --primary: #222; }',
      });

      expect(http.post).toHaveBeenCalledWith(
        '/themes/123/customization/settings',
        { css: '.variables { --primary: #222; }' },
      );
      expect(result).toEqual(mockResponse);
    });

    it('should save CSS and theme data for settings section', async () => {
      const mockResponse = {
        data: { id: 123 },
        message: 'Settings saved successfully',
      };

      vi.mocked(http.post).mockResolvedValue(mockResponse);

      const result = await themeCustomization.saveSection(123, 'settings', {
        css: '.variables { --primary: #222; }',
        theme_data: { colors: { primary: { '500': '#222' } } },
      });

      expect(http.post).toHaveBeenCalledWith(
        '/themes/123/customization/settings',
        {
          css: '.variables { --primary: #222; }',
          theme_data: { colors: { primary: { '500': '#222' } } },
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it('should save CSS and puck data for header section', async () => {
      const mockResponse = {
        data: { id: 123 },
        message: 'Header saved successfully',
      };

      const puckData = {
        content: [{ type: 'HeadingBlock', props: { children: 'Header' } }],
        root: {},
      };

      vi.mocked(http.post).mockResolvedValue(mockResponse);

      const result = await themeCustomization.saveSection(123, 'header', {
        css: '.header { padding: 1rem; }',
        puck_data: puckData,
      });

      expect(http.post).toHaveBeenCalledWith(
        '/themes/123/customization/header',
        {
          css: '.header { padding: 1rem; }',
          puck_data: puckData,
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it('should save CSS and puck data for footer section', async () => {
      const mockResponse = {
        data: { id: 123 },
        message: 'Footer saved successfully',
      };

      const puckData = {
        content: [{ type: 'TextBlock', props: { children: 'Footer content' } }],
        root: {},
      };

      vi.mocked(http.post).mockResolvedValue(mockResponse);

      const result = await themeCustomization.saveSection(123, 'footer', {
        css: '.footer { background: #222; }',
        puck_data: puckData,
      });

      expect(http.post).toHaveBeenCalledWith(
        '/themes/123/customization/footer',
        {
          css: '.footer { background: #222; }',
          puck_data: puckData,
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it('should save CSS only (no data)', async () => {
      const mockResponse = {
        data: { id: 123 },
        message: 'Header CSS saved successfully',
      };

      vi.mocked(http.post).mockResolvedValue(mockResponse);

      const result = await themeCustomization.saveSection(123, 'header', {
        css: '.header { color: red; }',
      });

      expect(http.post).toHaveBeenCalledWith(
        '/themes/123/customization/header',
        { css: '.header { color: red; }' },
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle save errors gracefully', async () => {
      const mockError = {
        message: 'Invalid section. Only settings, header, and footer can be customized.',
        errors: { section: ['The selected section is invalid.'] },
      };

      vi.mocked(http.post).mockRejectedValue(new Error('Save failed'));

      await expect(
        themeCustomization.saveSection(123, 'invalid', { css: '' }),
      ).rejects.toThrow('Save failed');

      expect(http.post).toHaveBeenCalled();
    });
  });

  describe('type safety', () => {
    it('should return properly typed customization response', async () => {
      const mockCustomization = {
        data: {
          settings_css: '.settings { }',
          header_css: '.header { }',
          footer_css: '.footer { }',
        },
      };

      vi.mocked(http.get).mockResolvedValue(mockCustomization);

      const result = await themeCustomization.getCustomization(123);

      // These assignments should be type-safe
      const settingsCss: string | null = result.data.settings_css;
      const headerCss: string | null = result.data.header_css;
      const footerCss: string | null = result.data.footer_css;

      expect(settingsCss).toBeDefined();
      expect(headerCss).toBeDefined();
      expect(footerCss).toBeDefined();
    });
  });
});
