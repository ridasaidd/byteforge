 import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Puck, Data, Config } from '@puckeditor/core';
import '@puckeditor/core/puck.css';
import '@/shared/puck/styles/preview-reset.css'; // Reset Tailwind inside Puck preview
import { Loader2, Monitor, Tablet, Smartphone } from 'lucide-react';
import { useToast, useEditorCssLoader } from '@/shared/hooks';
import { tenantPages } from '@/shared/services/api/pages';
import { tenantThemeParts } from '@/shared/services/api/themeParts';
import { tenantThemes } from '@/shared/services/api/themes';
import { puckConfig as baseConfig } from '@/shared/puck/config';
import { PageEditorPreview } from '@/shared/components/organisms/PageEditorPreview';
import { extractCssFromPuckData } from '@/shared/puck/services/PuckCssAggregator';
import type { ThemeData } from '@/shared/puck/services/PuckCssAggregator';

export function PageEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [pageData, setPageData] = useState<{ id: number; title: string; slug: string; status: string; puck_data: Record<string, unknown> | null; theme_id?: number | null } | null>(null);
  const [initialData, setInitialData] = useState<Data>({ content: [], root: {} });

  // Theme parts for header/footer preview
  const [headerData, setHeaderData] = useState<Data | null>(null);
  const [footerData, setFooterData] = useState<Data | null>(null);
  const [themeId, setThemeId] = useState<number | null>(null);
  const [themeData, setThemeData] = useState<ThemeData | null>(null);

  // Use ref to store current puck data
  const puckDataRef = useRef<Data>({ content: [], root: {} });
  const hasLoadedRef = useRef(false);

  // Load theme CSS for the editor preview
  useEditorCssLoader({
    themeId: themeId,
    section: 'theme', // Load compiled theme CSS
    enabled: !!themeId,
  });

  // Viewport configuration for responsive editing
  const viewports = [
    { width: 375, height: 667, label: 'Mobile', icon: <Smartphone className="h-4 w-4" /> },
    { width: 768, height: 1024, label: 'Tablet', icon: <Tablet className="h-4 w-4" /> },
    { width: 1280, height: 'auto' as const, label: 'Desktop', icon: <Monitor className="h-4 w-4" /> },
  ];

  // Extend config to include header/footer in root render
  const config = useMemo<Config>(() => {
    return {
      ...baseConfig,
      root: {
        ...baseConfig.root,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        render: ({ children, backgroundColor, backgroundImage, maxWidth, paddingY }: any) => {
          return (
            <div
              style={{
                backgroundColor,
                backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <PageEditorPreview
                headerData={headerData}
                footerData={footerData}
                config={baseConfig}
                onEditSection={(section) => {
                   // Navigate to Tenant Theme Customizer
                   navigate(`/cms/theme/customize?section=${section}`);
                }}
              >
                 <div
                  style={{
                    maxWidth,
                    margin: '0 auto',
                    paddingTop: paddingY,
                    paddingBottom: paddingY,
                    width: '100%',
                    flexGrow: 1,
                  }}
                >
                  {children}
                </div>
              </PageEditorPreview>
            </div>
          );
        },
      },
    };
  }, [headerData, footerData, navigate]);

  // Load page data and theme parts once
  useEffect(() => {
    if (hasLoadedRef.current || !id) return;

    const loadPageAndThemeParts = async () => {
      try {
        // Load page data
        const pageResponse = await tenantPages.get(id);
        const page = pageResponse.data;

        setPageData(page);

        // Set initial data once
        const data = (page.puck_data as Data) || { content: [], root: {} };
        setInitialData(data);
        puckDataRef.current = data;
        hasLoadedRef.current = true;

        // Load theme parts (header/footer) for preview
        try {
          const [headerResponse, footerResponse] = await Promise.all([
            tenantThemeParts.list({ type: 'header' }),
            tenantThemeParts.list({ type: 'footer' }),
          ]);

          // Get the first header/footer (active theme's parts)
          // For Tenant, the API should return parts relevant to their active theme (or all their parts)
          // We assume the first one is the one we want to preview if multiple exist, or better, the API validates.
          const headerPart = headerResponse.data?.[0];
          const footerPart = footerResponse.data?.[0];

          if (headerPart?.theme_id) setThemeId(headerPart.theme_id);
          else if (footerPart?.theme_id) setThemeId(footerPart.theme_id);

          // Load theme data for CSS generation
          if (headerPart?.theme_id || footerPart?.theme_id) {
            try {
              const themeResponse = await tenantThemes.active();
              if (themeResponse.data?.theme_data) {
                setThemeData(themeResponse.data.theme_data as ThemeData);
              }
            } catch (error) {
              console.warn('Could not load theme data:', error);
            }
          }

          if (headerPart?.puck_data_raw) {
            setHeaderData(headerPart.puck_data_raw as Data);
          }
          if (footerPart?.puck_data_raw) {
            setFooterData(footerPart.puck_data_raw as Data);
          }
        } catch (themeError) {
          // Theme parts are optional - don't fail if they can't be loaded
          console.warn('Could not load theme parts for preview:', themeError);
        }
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to load page',
          variant: 'destructive',
        });
        navigate('/cms/pages');
      } finally {
        setIsLoading(false);
      }
    };

    loadPageAndThemeParts();
  }, [id, navigate, toast]);

  // Handle puck data changes
  const handlePuckChange = (newData: Data) => {
    puckDataRef.current = newData;
  };

  // Save page
  const handleSave = async () => {
    if (!id) return;

    try {
      // Generate CSS from page content
      const pageCss = themeData
        ? extractCssFromPuckData(puckDataRef.current, themeData, false)
        : '';

      await tenantPages.update(Number(id), {
        puck_data: puckDataRef.current as Record<string, unknown>,
        page_css: pageCss,
      });

      toast({
        title: 'Page saved',
        description: 'Your changes have been saved successfully',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to save page',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!pageData) {
    return null;
  }

  return (
    <Puck
      config={config}
      data={initialData}
      onPublish={handleSave}
      onChange={handlePuckChange}
      viewports={viewports}
      headerTitle={pageData.title}
      headerPath={`/${pageData.slug}`}
    />
  );
}
