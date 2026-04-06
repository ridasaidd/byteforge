import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Puck, Data } from '@puckeditor/core';
import '@puckeditor/core/puck.css';
import '@/shared/puck/styles/preview-reset.css'; // Reset Tailwind inside Puck preview
import { Loader2, Save, ArrowLeft, Plus, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { ThemeProvider } from '@/shared/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useToast, useEditorCssLoader } from '@/shared/hooks';
import { useSettingsRuntimeCss } from '@/shared/hooks/useSettingsRuntimeCss';
import { MediaPickerModal } from '@/shared/components/organisms/MediaPickerModal';
import { themes, tenantThemes } from '@/shared/services/api/themes';
import { themePlaceholders } from '@/shared/services/api/themePlaceholders';
import { pageTemplates } from '@/shared/services/api/pageTemplates';
import { themeCssApi } from '@/shared/services/api/themeCss';
import { themeCustomization } from '@/shared/services/api/themeCustomization';
import { useThemeCssSectionSave } from '@/shared/hooks/useThemeCssSectionSave';
import { generateThemeStepCss } from '@/shared/puck/services/ThemeStepCssGenerator';
import { puckConfig as config } from '@/shared/puck/config';
import { ColorPickerControlColorful } from '@/shared/puck/fields/ColorPickerControlColorful';
import type { ColorPickerValue } from '@/shared/puck/fields/ColorPickerControl';
import type { PageTemplate, CreatePageTemplateData, UpdatePageTemplateData, ThemeData, Theme } from '@/shared/services/api/types';
import { FontFamilyPicker } from '@/shared/components/organisms/fonts';

/**
 * Phase 6: Theme Builder Page
 *
 * @param mode - 'create' (default): Full theme creation with all tabs
 *               'customize': Theme customization only (Settings, Header, Footer)
 */
interface ThemeBuilderPageProps {
  mode?: 'create' | 'customize';
}

export function ThemeBuilderPage({ mode = 'create' }: ThemeBuilderPageProps) {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, i18n } = useTranslation('themes');
  const { saveSection } = useThemeCssSectionSave();
  const isNew = !id || id === 'new';
  const isCustomizeMode = mode === 'customize';
  const isTenantCms = typeof window !== 'undefined' && window.location.pathname.startsWith('/cms');
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState(() => {
    const section = searchParams.get('section');
    if (section) return section;
    return isCustomizeMode ? 'settings' : 'info';
  });
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);

  // Theme basic info
  const [themeName, setThemeName] = useState('');
  const [themeDescription, setThemeDescription] = useState('');
  const [themePreviewImage, setThemePreviewImage] = useState('');
  const [isPreviewImageError, setIsPreviewImageError] = useState(false);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [activeColorKey, setActiveColorKey] = useState<'primary' | 'secondary' | 'accent' | null>(null);
  const [themeData, setThemeData] = useState<Partial<ThemeData>>({
    colors: {
      primary: { '500': '#222222' },
      secondary: { '500': '#666666' },
      accent: { '500': '#e0e0e0' },
      neutral: { white: '#ffffff', black: '#000000' },
      semantic: { success: '#10b981', warning: '#f59e0b', error: '#ef4444', info: '#3b82f6' },
    },
    typography: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      fontSize: { base: '16', lg: '18', xl: '20' },
      fontWeight: { normal: '400', bold: '700' },
      lineHeight: { normal: '1.5', relaxed: '1.625' },
    },
    spacing: { '0': '0', '4': '16', '8': '32', '16': '64' },
    borderRadius: { base: '4', full: '9999' },
  });

  // Puck data for different parts
  const [headerData, setHeaderData] = useState<Data>({ content: [], root: {} });
  const [footerData, setFooterData] = useState<Data>({ content: [], root: {} });

  // Page templates state
  const [templates, setTemplates] = useState<PageTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PageTemplate | null>(null);
  const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);
  const [templateData, setTemplateData] = useState<Data>({ content: [], root: {} });
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateCategory, setTemplateCategory] = useState('');

  // Refs to store current data
  const headerDataRef = useRef<Data>({ content: [], root: {} });
  const footerDataRef = useRef<Data>({ content: [], root: {} });
  const [settingsRefreshTrigger, setSettingsRefreshTrigger] = useState(0);

  const resolveThemeColorToken = (token: string): string | undefined => {
    const [group, shade] = token.split('.');
    const colors = themeData.colors as Record<string, unknown> | undefined;
    const groupValue = colors?.[group] as Record<string, unknown> | string | undefined;

    if (!groupValue) return undefined;

    if (typeof groupValue === 'string') return groupValue;
    if (shade && typeof groupValue === 'object') {
      return groupValue[shade] as string | undefined;
    }

    return undefined;
  };

  const getColorValue = (key: 'primary' | 'secondary' | 'accent', fallback: string): string => {
    const colors = themeData.colors as Record<string, unknown> | undefined;
    const group = colors?.[key] as Record<string, unknown> | undefined;
    return (group?.['500'] as string) || fallback;
  };

  const setColorValue = (key: 'primary' | 'secondary' | 'accent', value: string) => {
    setThemeData({
      ...themeData,
      colors: {
        ...(themeData.colors as Record<string, unknown>),
        [key]: {
          ...((themeData.colors as Record<string, unknown>)?.[key] as Record<string, unknown>),
          '500': value,
        },
      },
    });
  };

  // Create dynamic theme object for ThemeProvider
  // This ensures color picker and all components see live updates from Settings tab
  const dynamicTheme = useMemo<Theme | null>(() => {
    // Always create a theme object, even for new themes
    // This allows Puck components to read theme values from Settings tab
    return {
      id: isNew ? 0 : Number(id),
      name: themeName || 'New Theme',
      slug: (themeName || 'new-theme').toLowerCase().replace(/\s+/g, '-'),
      theme_data: themeData,
      is_active: true,
      tenant_id: null,
    } as Theme;
  }, [id, themeName, themeData, isNew]);

  const setEditorSectionCss = (section: 'settings' | 'header' | 'footer', css: string | null | undefined) => {
    const styleId = `editor-${section}-css`;
    let styleTag = document.getElementById(styleId) as HTMLStyleElement | null;

    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = styleId;
      styleTag.setAttribute('data-source', 'theme-customization-api');
      document.head.appendChild(styleTag);
    }

    styleTag.textContent = css || '';
  };

  useEffect(() => {
    if (!isCustomizeMode) {
      return;
    }

    return () => {
      ['settings', 'header', 'footer'].forEach((section) => {
        const styleTag = document.getElementById(`editor-${section}-css`);
        if (styleTag) {
          styleTag.remove();
        }
      });
    };
  }, [isCustomizeMode]);

  // Load pre-generated CSS files for live preview in editor
  // CSS from files provides base styles, component runtime CSS cascades over it
  // Load CSS when theme is loaded (independent of active tab)
  useEditorCssLoader({
    themeId: id,
    section: 'settings',
    enabled: !isNew && !isLoading && !isCustomizeMode,
    refreshTrigger: settingsRefreshTrigger,
  });

  useEditorCssLoader({
    themeId: id,
    section: 'header',
    enabled: !isNew && !isLoading && !isCustomizeMode,
  });

  useEditorCssLoader({
    themeId: id,
    section: 'footer',
    enabled: !isNew && !isLoading && !isCustomizeMode,
  });

  // Inject runtime CSS variables for live preview (always enabled when editing theme)
  // This makes variables from Settings tab immediately available in Header/Footer tabs
  useSettingsRuntimeCss({
    themeData,
    enabled: true, // Always enabled, even for new themes
  });

  useEffect(() => {
    if (!isNew && id) {
      loadTheme();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isNew]);

  const loadTheme = async () => {
    try {
      setIsLoading(true);
      const response = isTenantCms
        ? await tenantThemes.get(Number(id))
        : await themes.get(Number(id));
      const theme = response.data;

      setThemeName(theme.name);
      setThemeDescription(theme.description || '');
      setThemePreviewImage(theme.preview_image || '');

      if (!isCustomizeMode) {
        // BLUEPRINT MODE: Load theme_data from theme, placeholders for header/footer
        setThemeData(theme.theme_data || themeData);

        try {
          const placeholdersResponse = await themePlaceholders.list(id as string);
          const rawPlaceholders = placeholdersResponse.data || [];

          type PlaceholderItem = { type: string; content?: Data };
          const placeholders: PlaceholderItem[] = Array.isArray(rawPlaceholders)
            ? (rawPlaceholders as PlaceholderItem[])
            : (Object.values(rawPlaceholders).flat() as PlaceholderItem[]);

          const header = placeholders.find((p) => p.type === 'header');
          const footer = placeholders.find((p) => p.type === 'footer');

          if (header?.content) {
            setHeaderData(header.content);
            headerDataRef.current = header.content;
          }
          if (footer?.content) {
            setFooterData(footer.content);
            footerDataRef.current = footer.content;
          }
        } catch (error) {
          console.error('Failed to load placeholders:', error);
        }
      } else {
        // CUSTOMIZE MODE: Load all customization data from single endpoint
        // This includes theme_data overrides, header/footer content, and CSS
        try {
          const customizationResponse = await themeCustomization.getCustomization(Number(id));
          const customization = customizationResponse.data;

          // Load customized theme_data (merged with blueprint)
          if (customization.theme_data) {
            setThemeData(customization.theme_data as typeof themeData);
          } else {
            // Fallback to blueprint theme_data if no customization exists
            setThemeData(theme.theme_data || themeData);
          }

          // In customize mode, inject section CSS from API response instead of
          // fetching static /storage files, which may be restricted on tenant domains.
          setEditorSectionCss('settings', customization.settings_css);
          setEditorSectionCss('header', customization.header_css);
          setEditorSectionCss('footer', customization.footer_css);

          // Load header content
          if (customization.header_data) {
            const data = customization.header_data as Data;
            setHeaderData(data);
            headerDataRef.current = data;
          }

          // Load footer content
          if (customization.footer_data) {
            const data = customization.footer_data as Data;
            setFooterData(data);
            footerDataRef.current = data;
          }
        } catch (error) {
          console.error('Failed to load customization:', error);
          // Fallback to blueprint data
          setThemeData(theme.theme_data || themeData);
        }
      }
    } catch {
      toast({
        title: t('error'),
        description: t('failed_load'),
        variant: 'destructive',
      });
      navigate(isTenantCms ? '/cms/themes' : '/dashboard/themes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    // In customize mode, only require a theme ID (existing theme must be selected)
    if (isCustomizeMode && !id) {
      toast({
        title: t('validation_error_title'),
        description: t('validation_customize_requires_existing'),
        variant: 'destructive',
      });
      return;
    }

    // In create mode, require theme name
    if (!isCustomizeMode && !themeName.trim()) {
      toast({
        title: t('validation_error_title'),
        description: t('validation_theme_name_required'),
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSaving(true);
      let themeId = id;

      // In customize mode, use the themeCustomization API for section-specific saves
      if (isCustomizeMode) {
        // Save settings section (CSS + theme data)
        const settingsCss = generateThemeStepCss('settings', {
          themeData: themeData as ThemeData,
        });
        try {
          await themeCustomization.saveSection(Number(themeId), 'settings', {
            css: settingsCss,
            theme_data: themeData,
          });
          setSettingsRefreshTrigger((prev) => prev + 1);
        } catch (error) {
          console.error('Failed to save settings:', error);
          throw error;
        }

        // Save header section (CSS + content)
        if (headerDataRef.current && (headerDataRef.current.content.length > 0 || Object.keys(headerDataRef.current.root).length > 0)) {
          const headerCss = generateThemeStepCss('header', {
            puckData: headerDataRef.current,
            themeData: themeData as ThemeData,
          });
          try {
            await themeCustomization.saveSection(Number(themeId), 'header', {
              css: headerCss,
              puck_data: headerDataRef.current,
            });
          } catch (error) {
            console.error('Failed to save header:', error);
            throw error;
          }
        }

        // Save footer section (CSS + content)
        if (footerDataRef.current && (footerDataRef.current.content.length > 0 || Object.keys(footerDataRef.current.root).length > 0)) {
          const footerCss = generateThemeStepCss('footer', {
            puckData: footerDataRef.current,
            themeData: themeData as ThemeData,
          });
          try {
            await themeCustomization.saveSection(Number(themeId), 'footer', {
              css: footerCss,
              puck_data: footerDataRef.current,
            });
          } catch (error) {
            console.error('Failed to save footer:', error);
            throw error;
          }
        }

        toast({
          title: t('success'),
          description: t('customization_saved_success'),
        });
      } else {
        // Create/update mode: use full theme creation/update flow
        const themePayload = {
          name: themeName,
          description: themeDescription,
          preview_image: themePreviewImage,
          theme_data: themeData,
          is_system_theme: true, // Central app themes are system themes
        };

        if (isNew) {
          // Create new theme
          const response = await themes.create(themePayload);
          themeId = String(response.data.id);

          toast({
            title: t('success'),
            description: t('theme_created_success'),
          });
        } else {
          // Update existing theme
          await themes.update(Number(id), themePayload);
          themeId = id;

          toast({
            title: t('success'),
            description: t('theme_info_saved_success'),
          });
        }

        // Save header part
        if (headerDataRef.current && (headerDataRef.current.content.length > 0 || Object.keys(headerDataRef.current.root).length > 0)) {
          // Save to placeholders (Blueprints)
          await themePlaceholders.save(Number(themeId), 'header', headerDataRef.current);

          // Generate and save header CSS
          try {
            const headerCss = generateThemeStepCss('header', {
              puckData: headerDataRef.current,
              themeData: themeData as ThemeData,
            });
            if (headerCss && headerCss.trim().length > 0) {
              await saveSection(Number(themeId), 'header', headerCss);
            }
          } catch (cssError) {
            console.error('Failed to save header CSS:', cssError);
            toast({
              title: t('warning_title'),
              description: t('header_css_generation_failed'),
              variant: 'destructive',
            });
          }
        }

        // Save footer part
        if (footerDataRef.current && (footerDataRef.current.content.length > 0 || Object.keys(footerDataRef.current.root).length > 0)) {
          // Save to placeholders (Blueprints)
          await themePlaceholders.save(Number(themeId), 'footer', footerDataRef.current);

          // Generate and save footer CSS
          try {
            const footerCss = generateThemeStepCss('footer', {
              puckData: footerDataRef.current,
              themeData: themeData as ThemeData,
            });
            if (footerCss && footerCss.trim().length > 0) {
              await saveSection(Number(themeId), 'footer', footerCss);
            }
          } catch (cssError) {
            console.error('Failed to save footer CSS:', cssError);
            toast({
              title: t('warning_title'),
              description: t('footer_css_generation_failed'),
              variant: 'destructive',
            });
          }
        }

        // Generate and save variables CSS from theme settings
        try {
          const variablesCss = generateThemeStepCss('settings', {
            themeData: themeData as ThemeData,
          });
          await saveSection(Number(themeId), 'variables', variablesCss);

          // Trigger refresh of settings CSS in editor
          setSettingsRefreshTrigger((prev) => prev + 1);
        } catch (cssError) {
          console.error('Failed to save variables CSS:', cssError);
          toast({
            title: t('warning_title'),
            description: t('variables_css_generation_failed'),
            variant: 'destructive',
          });
        }

        // Publish master CSS file (merge all sections)
        try {
          await themeCssApi.publish(Number(themeId));
        } catch (publishError) {
          console.warn('Failed to publish theme CSS:', publishError);
          toast({
            title: t('warning_title'),
            description: t('css_publish_failed'),
            variant: 'destructive',
          });
        }

        // Navigate to the theme builder page if it was newly created
        if (isNew && themeId) {
          navigate(isTenantCms ? '/cms/themes' : `/dashboard/themes/${themeId}/builder`, { replace: true });
        }
      }
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: t('error'),
        description: t('failed_save_theme'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleHeaderChange = (newData: Data) => {
    headerDataRef.current = newData;
    setHeaderData(newData);
  };

  const handleFooterChange = (newData: Data) => {
    footerDataRef.current = newData;
    setFooterData(newData);
  };

  // Page Template Functions
  const loadTemplates = async () => {
    if (!id || isNew) return;

    try {
      setIsLoadingTemplates(true);
      const response = await pageTemplates.list({ theme_id: Number(id), per_page: 100 });
      setTemplates(response.data);
    } catch {
      toast({
        title: t('error'),
        description: t('failed_load_templates'),
        variant: 'destructive',
      });
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleAddTemplate = () => {
    setEditingTemplate(null);
    setTemplateName('');
    setTemplateDescription('');
    setTemplateCategory('');
    setTemplateData({ content: [], root: {} });
    setIsTemplateEditorOpen(true);
  };

  const handleEditTemplate = (template: PageTemplate) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setTemplateDescription(template.description || '');
    setTemplateCategory(template.category || '');
    setTemplateData((template.puck_data as Data) || { content: [], root: {} });
    setIsTemplateEditorOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast({
        title: t('validation_error_title'),
        description: t('validation_template_name_required'),
        variant: 'destructive',
      });
      return;
    }

    if (isNew) {
      toast({
        title: t('error'),
        description: t('save_theme_before_templates'),
        variant: 'destructive',
      });
      return;
    }

    try {
      const templatePayload: CreatePageTemplateData | UpdatePageTemplateData = {
        name: templateName,
        description: templateDescription,
        category: templateCategory,
        puck_data: templateData,
        theme_id: Number(id),
        is_active: true,
      };

      let savedTemplate;
      if (editingTemplate) {
        savedTemplate = await pageTemplates.update(editingTemplate.id, templatePayload);
        toast({
          title: t('success'),
          description: t('template_updated_success'),
        });
      } else {
        savedTemplate = await pageTemplates.create(templatePayload as CreatePageTemplateData);
        toast({
          title: t('success'),
          description: t('template_created_success'),
        });
      }

      // Generate and save template CSS
      try {
        const templateId = savedTemplate.data.id;
        const templateCss = generateThemeStepCss('template', {
          puckData: templateData,
          themeData: themeData as ThemeData,
        });
        if (templateCss && templateCss.trim().length > 0) {
          await saveSection(Number(id), `template-${templateId}`, templateCss);
          // Publish theme to merge template CSS into master file
          await themeCssApi.publish(Number(id));
        }
      } catch (error) {
        console.error('Failed to save template CSS:', error);
        toast({
          title: t('warning_title'),
          description: t('template_css_generation_failed'),
          variant: 'default',
        });
      }

      setIsTemplateEditorOpen(false);
      loadTemplates();
    } catch {
      toast({
        title: t('error'),
        description: t('failed_save_template'),
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTemplate = async (template: PageTemplate) => {
    if (!confirm(t('delete_template_confirm', { name: template.name }))) {
      return;
    }

    try {
      await pageTemplates.delete(template.id);
      toast({
        title: t('success'),
        description: t('template_deleted_success'),
      });
      loadTemplates();
    } catch {
      toast({
        title: t('error'),
        description: t('failed_delete_template'),
        variant: 'destructive',
      });
    }
  };

  // Load templates when switching to Pages tab
  useEffect(() => {
    if (activeTab === 'pages') {
      loadTemplates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(isTenantCms ? '/cms/themes' : '/dashboard/themes')}
          >
            <ArrowLeft className="h-4 w-4 me-2 rtl:rotate-180" />
            {t('editor_back')}
          </Button>
          <div className="h-6 w-px bg-border" />
          <div>
            <h1 className="text-sm font-semibold">
              {isNew ? t('builder_create_new_theme') : themeName || t('builder_edit_theme')}
            </h1>
            <p className="text-xs text-muted-foreground">
              {t('builder_subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            size="sm"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 me-2 animate-spin" />
                {t('editor_saving')}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 me-2" />
                {t('editor_save')}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0">
          {!isCustomizeMode && <TabsTrigger value="info" className="rounded-none">{t('tab_info')}</TabsTrigger>}
          <TabsTrigger value="settings" className="rounded-none">{t('tab_settings')}</TabsTrigger>
          <TabsTrigger value="header" className="rounded-none">{t('tab_header')}</TabsTrigger>
          <TabsTrigger value="footer" className="rounded-none">{t('tab_footer')}</TabsTrigger>
          {!isCustomizeMode && <TabsTrigger value="pages" className="rounded-none">{t('tab_pages')}</TabsTrigger>}
        </TabsList>

        {/* Info Tab */}
        {!isCustomizeMode && (
        <TabsContent value="info" className="flex-1 overflow-auto p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('theme_name_label')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={themeName}
                onChange={(e) => setThemeName(e.target.value)}
                placeholder={t('theme_name_placeholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                {t('description')}
              </label>
              <textarea
                value={themeDescription}
                onChange={(e) => setThemeDescription(e.target.value)}
                placeholder={t('theme_description_placeholder')}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                {t('preview_image_url')}
              </label>
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  value={themePreviewImage}
                  onChange={(e) => setThemePreviewImage(e.target.value)}
                  placeholder="https://example.com/preview.jpg"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setIsMediaPickerOpen(true)}
                  >
                    {t('select_from_media_library')}
                  </Button>
                  {themePreviewImage && (
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={() => setThemePreviewImage('')}
                    >
                      {t('clear')}
                    </Button>
                  )}
                </div>
              </div>
              {themePreviewImage && !isPreviewImageError ? (
                <div className="mt-4">
                  <img
                    src={themePreviewImage}
                    alt="Preview"
                    className="max-w-md rounded-lg border"
                    onError={() => setIsPreviewImageError(true)}
                  />
                </div>
              ) : (
                <div className="mt-4">
                  <div className="max-w-md h-40 rounded-lg border border-dashed flex items-center justify-center text-sm text-gray-500">
                    {t('no_preview')}
                  </div>
                </div>
              )}
            </div>
            <MediaPickerModal
              isOpen={isMediaPickerOpen}
              onClose={() => setIsMediaPickerOpen(false)}
              onSelect={(media) => {
                  setIsPreviewImageError(false);
                setThemePreviewImage(media.medium_url || media.url);
                setIsMediaPickerOpen(false);
              }}
              title={t('select_theme_preview')}
              allowedTypes={['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']}
            />
          </div>
        </TabsContent>
        )}

        {/* Settings Tab */}
        <TabsContent value="settings" className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Colors Section */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Colors</h2>
              <div className="space-y-4">
                {/* Primary Color */}
                <div>
                  <label className="block text-sm font-medium mb-2">{t('primary_color')}</label>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => setActiveColorKey('primary')}
                      className="flex items-center gap-3"
                    >
                      <span
                        className="h-5 w-5 rounded border"
                        style={{ backgroundColor: getColorValue('primary', '#222222') }}
                      />
                      <span className="text-sm">{t('edit')}</span>
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {getColorValue('primary', '#222222')}
                    </span>
                  </div>
                </div>

                {/* Secondary Color */}
                <div>
                  <label className="block text-sm font-medium mb-2">{t('secondary_color')}</label>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => setActiveColorKey('secondary')}
                      className="flex items-center gap-3"
                    >
                      <span
                        className="h-5 w-5 rounded border"
                        style={{ backgroundColor: getColorValue('secondary', '#666666') }}
                      />
                      <span className="text-sm">{t('edit')}</span>
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {getColorValue('secondary', '#666666')}
                    </span>
                  </div>
                </div>

                {/* Accent Color */}
                <div>
                  <label className="block text-sm font-medium mb-2">{t('accent_color')}</label>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => setActiveColorKey('accent')}
                      className="flex items-center gap-3"
                    >
                      <span
                        className="h-5 w-5 rounded border"
                        style={{ backgroundColor: getColorValue('accent', '#e0e0e0') }}
                      />
                      <span className="text-sm">{t('edit')}</span>
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {getColorValue('accent', '#e0e0e0')}
                    </span>
                  </div>
                </div>
              </div>
              <Dialog open={!!activeColorKey} onOpenChange={(open) => !open && setActiveColorKey(null)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {activeColorKey ? t(`color_dialog_${activeColorKey}`) : t('colors')}
                    </DialogTitle>
                  </DialogHeader>
                  {activeColorKey && (
                    <ColorPickerControlColorful
                      field={{ label: t(`color_dialog_${activeColorKey}`) }}
                      value={getColorValue(activeColorKey, '#000000')}
                      onChange={(value: ColorPickerValue) => {
                        const nextValue = value.type === 'custom'
                          ? value.value
                          : resolveThemeColorToken(value.value) || getColorValue(activeColorKey, '#000000');
                        setColorValue(activeColorKey, nextValue);
                      }}
                    />
                  )}
                  <DialogFooter>
                    <Button type="button" onClick={() => setActiveColorKey(null)}>
                      {t('done')}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Typography Section */}
            <div>
              <h2 className="text-lg font-semibold mb-4">{t('typography')}</h2>
              <div className="space-y-6">
                {/* Font Family Pickers */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Sans Font */}
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('sans_font')}</label>
                    <FontFamilyPicker
                      category="sans"
                      placeholder={t('select_font')}
                      selectedFont={
                        (() => {
                          const val = ((themeData.typography as Record<string, unknown>)?.fontFamily as Record<string, unknown>)?.[('sans')];
                          return typeof val === 'string' ? val : (val as Record<string, unknown>)?.name as string | undefined;
                        })() || t('system_default')
                      }
                      onSelect={(fontName) => setThemeData({
                        ...themeData,
                        typography: {
                          ...(themeData.typography as Record<string, unknown>),
                          fontFamily: {
                            ...((themeData.typography as Record<string, unknown>)?.fontFamily as Record<string, unknown>),
                            sans: fontName,
                          },
                        },
                      })}
                    />
                  </div>

                  {/* Serif Font */}
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('serif_font')}</label>
                    <FontFamilyPicker
                      category="serif"
                      placeholder={t('select_font')}
                      selectedFont={
                        (() => {
                          const val = ((themeData.typography as Record<string, unknown>)?.fontFamily as Record<string, unknown>)?.[('serif')];
                          return typeof val === 'string' ? val : (val as Record<string, unknown>)?.name as string | undefined;
                        })() || t('system_serif')
                      }
                      onSelect={(fontName) => setThemeData({
                        ...themeData,
                        typography: {
                          ...(themeData.typography as Record<string, unknown>),
                          fontFamily: {
                            ...((themeData.typography as Record<string, unknown>)?.fontFamily as Record<string, unknown>),
                            serif: fontName,
                          },
                        },
                      })}
                    />
                  </div>

                  {/* Mono Font */}
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('mono_font')}</label>
                    <FontFamilyPicker
                      category="mono"
                      placeholder={t('select_font')}
                      selectedFont={
                        (() => {
                          const val = ((themeData.typography as Record<string, unknown>)?.fontFamily as Record<string, unknown>)?.[('mono')];
                          return typeof val === 'string' ? val : (val as Record<string, unknown>)?.name as string | undefined;
                        })() || t('system_monospace')
                      }
                      onSelect={(fontName) => setThemeData({
                        ...themeData,
                        typography: {
                          ...(themeData.typography as Record<string, unknown>),
                          fontFamily: {
                            ...((themeData.typography as Record<string, unknown>)?.fontFamily as Record<string, unknown>),
                            mono: fontName,
                          },
                        },
                      })}
                    />
                  </div>
                </div>

                {/* Font Preview - Commented out: FontFamilyPicker now shows live preview with weights */}
                {/* {(((themeData.typography as Record<string, unknown>)?.fontFamily as Record<string, unknown>)?.[('sans')] as string | undefined) && (
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-medium mb-3">Sans Font Preview</h3>
                    <FontPreview
                      fontName={(((themeData.typography as Record<string, unknown>)?.fontFamily as Record<string, unknown>)?.[('sans')] as string)}
                      category="sans"
                    />
                  </div>
                )} */}

                {/* Font Sizes */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('base_font_size')}</label>
                    <input
                      type="number"
                      value={((themeData.typography as Record<string, unknown>)?.fontSize as Record<string, unknown>)?.[('base')] as string || '16'}
                      onChange={(e) => setThemeData({
                        ...themeData,
                        typography: {
                          ...(themeData.typography as Record<string, unknown>),
                          fontSize: {
                            ...((themeData.typography as Record<string, unknown>)?.fontSize as Record<string, unknown>),
                            base: e.target.value,
                          },
                        },
                      })}
                      placeholder="16"
                      min="8"
                      max="72"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('large_font_size')}</label>
                    <input
                      type="number"
                      value={((themeData.typography as Record<string, unknown>)?.fontSize as Record<string, unknown>)?.[('lg')] as string || '18'}
                      onChange={(e) => setThemeData({
                        ...themeData,
                        typography: {
                          ...(themeData.typography as Record<string, unknown>),
                          fontSize: {
                            ...((themeData.typography as Record<string, unknown>)?.fontSize as Record<string, unknown>),
                            lg: e.target.value,
                          },
                        },
                      })}
                      placeholder="18"
                      min="8"
                      max="72"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('xl_font_size')}</label>
                    <input
                      type="number"
                      value={((themeData.typography as Record<string, unknown>)?.fontSize as Record<string, unknown>)?.[('xl')] as string || '20'}
                      onChange={(e) => setThemeData({
                        ...themeData,
                        typography: {
                          ...(themeData.typography as Record<string, unknown>),
                          fontSize: {
                            ...((themeData.typography as Record<string, unknown>)?.fontSize as Record<string, unknown>),
                            xl: e.target.value,
                          },
                        },
                      })}
                      placeholder="20"
                      min="8"
                      max="72"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Spacing Section */}
            <div>
              <h2 className="text-lg font-semibold mb-4">{t('spacing')}</h2>
              <div className="space-y-4">
                {([
                  { key: '0', label: t('spacing_none'), fallback: '0' },
                  { key: '4', label: t('spacing_small'), fallback: '16' },
                  { key: '8', label: t('spacing_medium'), fallback: '32' },
                  { key: '16', label: t('spacing_large'), fallback: '64' },
                ] as const).map(({ key, label, fallback }) => {
                  const value = ((themeData.spacing as Record<string, unknown>)?.[key] as string) || fallback;
                  const numericValue = Number(value) || 0;
                  return (
                    <div key={key}>
                      <label className="block text-sm font-medium mb-2">{label}</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          value={value}
                          onChange={(e) => setThemeData({
                            ...themeData,
                            spacing: {
                              ...(themeData.spacing as Record<string, unknown>),
                              [key]: e.target.value,
                            },
                          })}
                          placeholder={fallback}
                          min="0"
                          className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <div className="flex-1">
                          <div
                            className="h-3 rounded bg-blue-500/70"
                            style={{ width: `${Math.min(numericValue, 200)}px` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{numericValue}px</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Border Radius Section */}
            <div>
              <h2 className="text-lg font-semibold mb-4">{t('border_radius')}</h2>
              <div className="space-y-4">
                {([
                  { key: 'base', label: t('base_radius'), fallback: '4' },
                  { key: 'full', label: t('full_radius'), fallback: '9999' },
                ] as const).map(({ key, label, fallback }) => {
                  const value = ((themeData.borderRadius as Record<string, unknown>)?.[key] as string) || fallback;
                  const numericValue = Number(value) || 0;
                  return (
                    <div key={key}>
                      <label className="block text-sm font-medium mb-2">{label}</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          value={value}
                          onChange={(e) => setThemeData({
                            ...themeData,
                            borderRadius: {
                              ...(themeData.borderRadius as Record<string, unknown>),
                              [key]: e.target.value,
                            },
                          })}
                          placeholder={fallback}
                          min="0"
                          className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <div
                          className="h-10 w-10 border bg-blue-500/20"
                          style={{ borderRadius: `${numericValue}px` }}
                        />
                        <span className="text-xs text-muted-foreground">{numericValue}px</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>{t('note_label')}</strong> {t('settings_info_text')}
              </p>
            </div>
          </div>
        </TabsContent>

        {/* Header Tab */}
        <TabsContent value="header" className="flex-1 overflow-hidden">
          <ThemeProvider initialTheme={dynamicTheme} injectCss={false}>
            <Puck
              config={config}
              data={headerData}
              onChange={handleHeaderChange}
            />
          </ThemeProvider>
        </TabsContent>

        {/* Footer Tab */}
        <TabsContent value="footer" className="flex-1 overflow-hidden">
          <ThemeProvider initialTheme={dynamicTheme} injectCss={false}>
            <Puck
              config={config}
              data={footerData}
              onChange={handleFooterChange}
            />
          </ThemeProvider>
        </TabsContent>

        {/* Pages Tab */}
        {!isCustomizeMode && (
        <TabsContent value="pages" className="flex-1 overflow-auto">
          {isTemplateEditorOpen ? (
            // Template Editor View
            <div className="h-full flex flex-col">
              {/* Editor Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsTemplateEditorOpen(false)}
                  >
                    <ArrowLeft className="h-4 w-4 me-2 rtl:rotate-180" />
                    {t('back_to_templates')}
                  </Button>
                  <div className="h-6 w-px bg-border" />
                  <div>
                    <h2 className="text-sm font-semibold">
                      {editingTemplate ? t('edit_template') : t('new_template')}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {templateName || t('untitled_template')}
                    </p>
                  </div>
                </div>
                <Button onClick={handleSaveTemplate} size="sm">
                  <Save className="h-4 w-4 me-2" />
                  {t('save_template')}
                </Button>
              </div>

              {/* Template Metadata */}
              <div className="p-4 border-b bg-muted/30">
                <div className="max-w-4xl mx-auto grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      {t('template_name')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder={t('template_name_placeholder')}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      {t('template_category')}
                    </label>
                    <input
                      type="text"
                      value={templateCategory}
                      onChange={(e) => setTemplateCategory(e.target.value)}
                      placeholder={t('template_category_placeholder')}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      {t('description')}
                    </label>
                    <input
                      type="text"
                      value={templateDescription}
                      onChange={(e) => setTemplateDescription(e.target.value)}
                      placeholder={t('template_description_placeholder')}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Puck Editor */}
              <div className="flex-1 overflow-hidden">
                <ThemeProvider initialTheme={dynamicTheme} injectCss={false}>
                  <Puck
                    config={config}
                    data={templateData}
                    onChange={setTemplateData}
                  />
                </ThemeProvider>
              </div>
            </div>
          ) : (
            // Templates List View
            <div className="p-6">
              <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold">{t('page_templates_title')}</h2>
                    <p className="text-sm text-muted-foreground">
                      {t('page_templates_description')}
                    </p>
                  </div>
                  <Button onClick={handleAddTemplate} disabled={isNew}>
                    <Plus className="h-4 w-4 me-2" />
                    {t('add_template')}
                  </Button>
                </div>

                {isNew && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-yellow-800">
                      {t('save_theme_before_templates')}
                    </p>
                  </div>
                )}

                {isLoadingTemplates ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : templates.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground mb-4">{t('no_page_templates')}</p>
                    <Button onClick={handleAddTemplate} disabled={isNew} variant="outline">
                      <Plus className="h-4 w-4 me-2" />
                      {t('create_first_template')}
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className="border rounded-lg p-4 hover:border-primary transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">{template.name}</h3>
                            {template.category && (
                              <span className="inline-block px-2 py-0.5 text-xs bg-muted rounded mt-1">
                                {template.category}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-1 ms-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditTemplate(template)}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTemplate(template)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        {template.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {template.description}
                          </p>
                        )}
                        <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                          {t('updated_label')} {new Date(template.updated_at).toLocaleDateString(i18n.language)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
