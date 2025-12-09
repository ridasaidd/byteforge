import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Puck, Data } from '@measured/puck';
import '@measured/puck/puck.css';
import { Loader2, Save, ArrowLeft, Plus, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { useToast } from '@/shared/hooks';
import { themes } from '@/shared/services/api/themes';
import { themeParts } from '@/shared/services/api/themeParts';
import { pageTemplates } from '@/shared/services/api/pageTemplates';
import type { PageTemplate, CreatePageTemplateData, UpdatePageTemplateData, ThemeData } from '@/shared/services/api/types';
import { config } from './puck-components';

export function ThemeBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isNew = id === 'new';

  const [activeTab, setActiveTab] = useState('info');
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);

  // Theme basic info
  const [themeName, setThemeName] = useState('');
  const [themeDescription, setThemeDescription] = useState('');
  const [themePreviewImage, setThemePreviewImage] = useState('');
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
      fontSize: { base: '1rem', lg: '1.125rem', xl: '1.25rem' },
      fontWeight: { normal: '400', bold: '700' },
      lineHeight: { normal: '1.5', relaxed: '1.625' },
    },
    spacing: { '0': '0', '4': '1rem', '8': '2rem', '16': '4rem' },
    borderRadius: { base: '0.25rem', full: '9999px' },
  });

  // Puck data for different parts
  const [headerData, setHeaderData] = useState<Data>({ content: [], root: {} });
  const [footerData, setFooterData] = useState<Data>({ content: [], root: {} });

  // Store theme part IDs
  const [headerPartId, setHeaderPartId] = useState<number | null>(null);
  const [footerPartId, setFooterPartId] = useState<number | null>(null);

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

  useEffect(() => {
    if (!isNew && id) {
      loadTheme();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isNew]);

  const loadTheme = async () => {
    try {
      setIsLoading(true);
      const response = await themes.get(Number(id));
      const theme = response.data;

      setThemeName(theme.name);
      setThemeDescription(theme.description || '');
      setThemePreviewImage(theme.preview_image || '');
      setThemeData(theme.theme_data || themeData); // Load theme_data or use defaults

      // Load theme parts (header/footer) from API
      const partsResponse = await themeParts.list({
        per_page: 100
      });

      // Find header and footer for this theme
      const parts = partsResponse.data || [];
      const header = parts.find((part) => part.type === 'header' && part.theme_id === Number(id));
      const footer = parts.find((part) => part.type === 'footer' && part.theme_id === Number(id));

      if (header) {
        setHeaderPartId(header.id);
        const data = (header.puck_data_raw as Data) || { content: [], root: {} };
        setHeaderData(data);
        headerDataRef.current = data;
      }

      if (footer) {
        setFooterPartId(footer.id);
        const data = (footer.puck_data_raw as Data) || { content: [], root: {} };
        setFooterData(data);
        footerDataRef.current = data;
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load theme',
        variant: 'destructive',
      });
      navigate('/dashboard/themes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!themeName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Theme name is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSaving(true);

      const themePayload = {
        name: themeName,
        description: themeDescription,
        preview_image: themePreviewImage,
        theme_data: themeData,
        is_system_theme: true, // Central app themes are system themes
      };

      let themeId = id;

      if (isNew) {
        // Create new theme
        const response = await themes.create(themePayload);
        themeId = String(response.data.id);

        toast({
          title: 'Success',
          description: 'Theme created successfully',
        });
      } else {
        // Update existing theme
        await themes.update(Number(id), themePayload);
        themeId = id;

        toast({
          title: 'Success',
          description: 'Theme info saved successfully',
        });
      }

      // Save header part
      if (headerDataRef.current && (headerDataRef.current.content.length > 0 || Object.keys(headerDataRef.current.root).length > 0)) {
        const headerPartData = {
          theme_id: Number(themeId),
          name: `${themeName} - Header`,
          slug: `${themeName.toLowerCase().replace(/\s+/g, '-')}-header`,
          type: 'header' as const,
          puck_data_raw: headerDataRef.current as Record<string, unknown>,
          status: 'published' as const,
          created_by: 1, // TODO: Get from auth context
        };

        if (headerPartId) {
          await themeParts.update(headerPartId, { puck_data_raw: headerDataRef.current as Record<string, unknown> });
        } else {
          const headerResponse = await themeParts.create(headerPartData);
          setHeaderPartId(headerResponse.data.id);
        }
      }

      // Save footer part
      if (footerDataRef.current && (footerDataRef.current.content.length > 0 || Object.keys(footerDataRef.current.root).length > 0)) {
        const footerPartData = {
          theme_id: Number(themeId),
          name: `${themeName} - Footer`,
          slug: `${themeName.toLowerCase().replace(/\s+/g, '-')}-footer`,
          type: 'footer' as const,
          puck_data_raw: footerDataRef.current as Record<string, unknown>,
          status: 'published' as const,
          created_by: 1, // TODO: Get from auth context
        };

        if (footerPartId) {
          await themeParts.update(footerPartId, { puck_data_raw: footerDataRef.current as Record<string, unknown> });
        } else {
          const footerResponse = await themeParts.create(footerPartData);
          setFooterPartId(footerResponse.data.id);
        }
      }

      // Navigate to the theme builder page if it was newly created
      if (isNew && themeId) {
        navigate(`/dashboard/themes/${themeId}/builder`, { replace: true });
      }
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Error',
        description: 'Failed to save theme',
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
        title: 'Error',
        description: 'Failed to load templates',
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
        title: 'Validation Error',
        description: 'Template name is required',
        variant: 'destructive',
      });
      return;
    }

    if (isNew) {
      toast({
        title: 'Error',
        description: 'Please save the theme first before adding templates',
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

      if (editingTemplate) {
        await pageTemplates.update(editingTemplate.id, templatePayload);
        toast({
          title: 'Success',
          description: 'Template updated successfully',
        });
      } else {
        await pageTemplates.create(templatePayload as CreatePageTemplateData);
        toast({
          title: 'Success',
          description: 'Template created successfully',
        });
      }

      setIsTemplateEditorOpen(false);
      loadTemplates();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to save template',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTemplate = async (template: PageTemplate) => {
    if (!confirm(`Are you sure you want to delete "${template.name}"?`)) {
      return;
    }

    try {
      await pageTemplates.delete(template.id);
      toast({
        title: 'Success',
        description: 'Template deleted successfully',
      });
      loadTemplates();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete template',
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
            onClick={() => navigate('/dashboard/themes')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="h-6 w-px bg-border" />
          <div>
            <h1 className="text-sm font-semibold">
              {isNew ? 'Create New Theme' : themeName || 'Edit Theme'}
            </h1>
            <p className="text-xs text-muted-foreground">
              Theme Builder
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
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0">
          <TabsTrigger value="info" className="rounded-none">Info</TabsTrigger>
          <TabsTrigger value="settings" className="rounded-none">Settings</TabsTrigger>
          <TabsTrigger value="header" className="rounded-none">Header</TabsTrigger>
          <TabsTrigger value="footer" className="rounded-none">Footer</TabsTrigger>
          <TabsTrigger value="pages" className="rounded-none">Pages</TabsTrigger>
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info" className="flex-1 overflow-auto p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Theme Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={themeName}
                onChange={(e) => setThemeName(e.target.value)}
                placeholder="Enter theme name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Description
              </label>
              <textarea
                value={themeDescription}
                onChange={(e) => setThemeDescription(e.target.value)}
                placeholder="Enter theme description"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Preview Image URL
              </label>
              <input
                type="text"
                value={themePreviewImage}
                onChange={(e) => setThemePreviewImage(e.target.value)}
                placeholder="https://example.com/preview.jpg"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {themePreviewImage && (
                <div className="mt-4">
                  <img
                    src={themePreviewImage}
                    alt="Preview"
                    className="max-w-md rounded-lg border"
                  />
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Colors Section */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Colors</h2>
              <div className="space-y-4">
                {/* Primary Color */}
                <div>
                  <label className="block text-sm font-medium mb-2">Primary Color</label>
                  <input
                    type="color"
                    value={((themeData.colors as Record<string, unknown>)?.primary as Record<string, unknown>)?.[('500')] as string || '#222222'}
                    onChange={(e) => setThemeData({
                      ...themeData,
                      colors: {
                        ...(themeData.colors as Record<string, unknown>),
                        primary: { ...((themeData.colors as Record<string, unknown>)?.primary as Record<string, unknown>), '500': e.target.value },
                      },
                    })}
                    className="w-20 h-10 rounded border cursor-pointer"
                  />
                  <span className="ml-3 text-sm text-muted-foreground">
                    {((themeData.colors as Record<string, unknown>)?.primary as Record<string, unknown>)?.[('500')] as string || '#222222'}
                  </span>
                </div>

                {/* Secondary Color */}
                <div>
                  <label className="block text-sm font-medium mb-2">Secondary Color</label>
                  <input
                    type="color"
                    value={((themeData.colors as Record<string, unknown>)?.secondary as Record<string, unknown>)?.[('500')] as string || '#666666'}
                    onChange={(e) => setThemeData({
                      ...themeData,
                      colors: {
                        ...(themeData.colors as Record<string, unknown>),
                        secondary: { ...((themeData.colors as Record<string, unknown>)?.secondary as Record<string, unknown>), '500': e.target.value },
                      },
                    })}
                    className="w-20 h-10 rounded border cursor-pointer"
                  />
                  <span className="ml-3 text-sm text-muted-foreground">
                    {((themeData.colors as Record<string, unknown>)?.secondary as Record<string, unknown>)?.[('500')] as string || '#666666'}
                  </span>
                </div>

                {/* Accent Color */}
                <div>
                  <label className="block text-sm font-medium mb-2">Accent Color</label>
                  <input
                    type="color"
                    value={((themeData.colors as Record<string, unknown>)?.accent as Record<string, unknown>)?.[('500')] as string || '#e0e0e0'}
                    onChange={(e) => setThemeData({
                      ...themeData,
                      colors: {
                        ...(themeData.colors as Record<string, unknown>),
                        accent: { ...((themeData.colors as Record<string, unknown>)?.accent as Record<string, unknown>), '500': e.target.value },
                      },
                    })}
                    className="w-20 h-10 rounded border cursor-pointer"
                  />
                  <span className="ml-3 text-sm text-muted-foreground">
                    {((themeData.colors as Record<string, unknown>)?.accent as Record<string, unknown>)?.[('500')] as string || '#e0e0e0'}
                  </span>
                </div>
              </div>
            </div>

            {/* Typography Section */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Typography</h2>
              <div className="space-y-4">
                {/* Font Family */}
                <div>
                  <label className="block text-sm font-medium mb-2">Font Family (Sans)</label>
                  <input
                    type="text"
                    value={((themeData.typography as Record<string, unknown>)?.fontFamily as Record<string, unknown>)?.[('sans')] as string || 'Inter, system-ui, sans-serif'}
                    onChange={(e) => setThemeData({
                      ...themeData,
                      typography: {
                        ...(themeData.typography as Record<string, unknown>),
                        fontFamily: {
                          ...((themeData.typography as Record<string, unknown>)?.fontFamily as Record<string, unknown>),
                          sans: e.target.value.split(',').map(f => f.trim()),
                        },
                      },
                    })}
                    placeholder="Inter, system-ui, sans-serif"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">Comma-separated list of fonts</p>
                </div>

                {/* Font Sizes */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Base Font Size</label>
                    <input
                      type="text"
                      value={((themeData.typography as Record<string, unknown>)?.fontSize as Record<string, unknown>)?.[('base')] as string || '1rem'}
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
                      placeholder="1rem"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Large Font Size</label>
                    <input
                      type="text"
                      value={((themeData.typography as Record<string, unknown>)?.fontSize as Record<string, unknown>)?.[('lg')] as string || '1.125rem'}
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
                      placeholder="1.125rem"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">XL Font Size</label>
                    <input
                      type="text"
                      value={((themeData.typography as Record<string, unknown>)?.fontSize as Record<string, unknown>)?.[('xl')] as string || '1.25rem'}
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
                      placeholder="1.25rem"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Spacing Section */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Spacing</h2>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">None (0)</label>
                  <input
                    type="text"
                    value={((themeData.spacing as Record<string, unknown>)?.[('0')] as string) || '0'}
                    onChange={(e) => setThemeData({
                      ...themeData,
                      spacing: {
                        ...(themeData.spacing as Record<string, unknown>),
                        '0': e.target.value,
                      },
                    })}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Small (4)</label>
                  <input
                    type="text"
                    value={((themeData.spacing as Record<string, unknown>)?.[('4')] as string) || '1rem'}
                    onChange={(e) => setThemeData({
                      ...themeData,
                      spacing: {
                        ...(themeData.spacing as Record<string, unknown>),
                        '4': e.target.value,
                      },
                    })}
                    placeholder="1rem"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Medium (8)</label>
                  <input
                    type="text"
                    value={((themeData.spacing as Record<string, unknown>)?.[('8')] as string) || '2rem'}
                    onChange={(e) => setThemeData({
                      ...themeData,
                      spacing: {
                        ...(themeData.spacing as Record<string, unknown>),
                        '8': e.target.value,
                      },
                    })}
                    placeholder="2rem"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Large (16)</label>
                  <input
                    type="text"
                    value={((themeData.spacing as Record<string, unknown>)?.[('16')] as string) || '4rem'}
                    onChange={(e) => setThemeData({
                      ...themeData,
                      spacing: {
                        ...(themeData.spacing as Record<string, unknown>),
                        '16': e.target.value,
                      },
                    })}
                    placeholder="4rem"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            {/* Border Radius Section */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Border Radius</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Base Radius</label>
                  <input
                    type="text"
                    value={((themeData.borderRadius as Record<string, unknown>)?.[('base')] as string) || '0.25rem'}
                    onChange={(e) => setThemeData({
                      ...themeData,
                      borderRadius: {
                        ...(themeData.borderRadius as Record<string, unknown>),
                        base: e.target.value,
                      },
                    })}
                    placeholder="0.25rem"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Full Radius</label>
                  <input
                    type="text"
                    value={((themeData.borderRadius as Record<string, unknown>)?.[('full')] as string) || '9999px'}
                    onChange={(e) => setThemeData({
                      ...themeData,
                      borderRadius: {
                        ...(themeData.borderRadius as Record<string, unknown>),
                        full: e.target.value,
                      },
                    })}
                    placeholder="9999px"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> These settings will be applied to all Puck components when designing pages.
                Save the theme to apply changes.
              </p>
            </div>
          </div>
        </TabsContent>

        {/* Header Tab */}
        <TabsContent value="header" className="flex-1 overflow-hidden">
          <Puck
            config={config}
            data={headerData}
            onChange={handleHeaderChange}
          />
        </TabsContent>

        {/* Footer Tab */}
        <TabsContent value="footer" className="flex-1 overflow-hidden">
          <Puck
            config={config}
            data={footerData}
            onChange={handleFooterChange}
          />
        </TabsContent>

        {/* Pages Tab */}
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
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Templates
                  </Button>
                  <div className="h-6 w-px bg-border" />
                  <div>
                    <h2 className="text-sm font-semibold">
                      {editingTemplate ? 'Edit Template' : 'New Template'}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {templateName || 'Untitled Template'}
                    </p>
                  </div>
                </div>
                <Button onClick={handleSaveTemplate} size="sm">
                  <Save className="h-4 w-4 mr-2" />
                  Save Template
                </Button>
              </div>

              {/* Template Metadata */}
              <div className="p-4 border-b bg-muted/30">
                <div className="max-w-4xl mx-auto grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Template Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="e.g. Homepage, About Page"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Category
                    </label>
                    <input
                      type="text"
                      value={templateCategory}
                      onChange={(e) => setTemplateCategory(e.target.value)}
                      placeholder="e.g. Landing, Blog"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={templateDescription}
                      onChange={(e) => setTemplateDescription(e.target.value)}
                      placeholder="Brief description"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Puck Editor */}
              <div className="flex-1 overflow-hidden">
                <Puck
                  config={config}
                  data={templateData}
                  onChange={setTemplateData}
                />
              </div>
            </div>
          ) : (
            // Templates List View
            <div className="p-6">
              <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold">Page Templates</h2>
                    <p className="text-sm text-muted-foreground">
                      Create page templates for this theme
                    </p>
                  </div>
                  <Button onClick={handleAddTemplate} disabled={isNew}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Template
                  </Button>
                </div>

                {isNew && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-yellow-800">
                      Please save the theme first before adding page templates.
                    </p>
                  </div>
                )}

                {isLoadingTemplates ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : templates.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground mb-4">No page templates yet</p>
                    <Button onClick={handleAddTemplate} disabled={isNew} variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Create your first template
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
                          <div className="flex gap-1 ml-2">
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
                          Updated {new Date(template.updated_at).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
