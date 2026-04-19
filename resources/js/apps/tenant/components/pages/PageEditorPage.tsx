import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Puck, Data, Config } from '@puckeditor/core';
import '@puckeditor/core/puck.css';
import '@/shared/puck/styles/preview-reset.css';
import { Monitor, Tablet, Smartphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast, useEditorCssLoader } from '@/shared/hooks';
import { tenantPages } from '@/shared/services/api/pages';
import { tenantThemeParts } from '@/shared/services/api/themeParts';
import { tenantThemes } from '@/shared/services/api/themes';
import { puckConfig as baseConfig } from '@/shared/puck/config';
import { BookingWidget, PaymentWidget, bookingPuckSectionComponents } from '@/shared/puck/components/booking';
import { PageEditorPreview } from '@/shared/components/organisms/PageEditorPreview';
import { extractCssFromPuckData } from '@/shared/puck/services/PuckCssAggregator';
import type { ThemeData } from '@/shared/puck/services/PuckCssAggregator';
import { useAddon } from '@/shared/hooks/useAddon';

export function PageEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation('pages');
  const { hasAddon } = useAddon();
  const [isLoading, setIsLoading] = useState(true);
  const [pageData, setPageData] = useState<{ id: number; title: string; slug: string; status: string; puck_data: Record<string, unknown> | null; theme_id?: number | null } | null>(null);
  const [initialData, setInitialData] = useState<Data>({ content: [], root: {} });

  const [headerData, setHeaderData] = useState<Data | null>(null);
  const [footerData, setFooterData] = useState<Data | null>(null);
  const [themeId, setThemeId] = useState<number | null>(null);
  const [themeData, setThemeData] = useState<ThemeData | null>(null);

  const canLoadThemeCssFromStorage = typeof window !== 'undefined' && window.location.hostname === 'byteforge.se';

  const puckDataRef = useRef<Data>({ content: [], root: {} });
  const hasLoadedRef = useRef(false);

  useEditorCssLoader({
    themeId,
    section: 'theme',
    enabled: !!themeId && canLoadThemeCssFromStorage,
  });

  const viewports = [
    { width: 375, height: 667, label: t('viewport_mobile'), icon: <Smartphone className="h-4 w-4" /> },
    { width: 768, height: 1024, label: t('viewport_tablet'), icon: <Tablet className="h-4 w-4" /> },
    { width: 1280, height: 'auto' as const, label: t('viewport_desktop'), icon: <Monitor className="h-4 w-4" /> },
  ];

  const config = useMemo<Config>(() => {
    const extraComponents: Config['components'] = {};
    const extraCategories: Config['categories'] = {};

    if (hasAddon('booking')) {
      extraComponents.BookingWidget = BookingWidget as Config['components'][string];
      extraComponents.PaymentWidget = PaymentWidget as Config['components'][string];
      Object.assign(extraComponents, bookingPuckSectionComponents);
      extraCategories.bookings = {
        components: ['BookingWidget', 'PaymentWidget'],
        title: 'Bookings',
        defaultExpanded: true,
      };
    }

    return {
      ...baseConfig,
      components: { ...baseConfig.components, ...extraComponents },
      categories: { ...baseConfig.categories, ...extraCategories },
      root: {
        ...baseConfig.root,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        render: ({ children, backgroundColor, backgroundImage, maxWidth, paddingY }: any) => (
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
              onEditSection={(section) => navigate(`/cms/themes?section=${section}`)}
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
        ),
      },
    };
  }, [footerData, headerData, navigate, hasAddon]);

  useEffect(() => {
    if (hasLoadedRef.current || !id) return;

    const loadPageAndThemeParts = async () => {
      try {
        const pageResponse = await tenantPages.get(id);
        const page = pageResponse.data;
        setPageData(page);

        const data = (page.puck_data as Data) || { content: [], root: {} };
        // Inject page ID for root CSS class generation
        const existingRootProps = (data.root as { props?: Record<string, unknown> })?.props || {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (data as any).root = { ...data.root, props: { ...existingRootProps, _rootId: id } };
        setInitialData(data);
        puckDataRef.current = data;
        hasLoadedRef.current = true;

        try {
          const activeThemeResponse = await tenantThemes.active().catch(() => ({ data: null }));
          const activeThemeId = activeThemeResponse.data?.id ?? null;

          if (activeThemeId) {
            setThemeId(activeThemeId);
          }
          if (activeThemeResponse.data?.theme_data) {
            setThemeData(activeThemeResponse.data.theme_data as ThemeData);
          }

          const [headerResponse, footerResponse] = await Promise.all([
            tenantThemeParts.list({ type: 'header', theme_id: activeThemeId ?? undefined }),
            tenantThemeParts.list({ type: 'footer', theme_id: activeThemeId ?? undefined }),
          ]);

          const headerPart = headerResponse.data?.[0];
          const footerPart = footerResponse.data?.[0];

          if (!activeThemeId && headerPart?.theme_id) setThemeId(headerPart.theme_id);
          else if (!activeThemeId && footerPart?.theme_id) setThemeId(footerPart.theme_id);

          if (headerPart?.puck_data_raw) {
            setHeaderData(headerPart.puck_data_raw as Data);
          }
          if (footerPart?.puck_data_raw) {
            setFooterData(footerPart.puck_data_raw as Data);
          }
        } catch (themeError) {
          console.warn('Could not load theme parts for preview:', themeError);
        }
      } catch {
        toast({
          title: t('error_title'),
          description: t('editor_failed_load'),
          variant: 'destructive',
        });
        navigate('/cms/pages');
      } finally {
        setIsLoading(false);
      }
    };

    loadPageAndThemeParts();
  }, [id, navigate, t, toast]);

  const handlePuckChange = (newData: Data) => {
    puckDataRef.current = newData;
  };

  const handleSave = async () => {
    if (!id) return;

    try {
      // Ensure _rootId is set for root CSS generation
      const rootProps = (puckDataRef.current.root as { props?: Record<string, unknown> })?.props || {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (puckDataRef.current as any).root = { ...puckDataRef.current.root, props: { ...rootProps, _rootId: id } };
      const pageCss = extractCssFromPuckData(puckDataRef.current, themeData ?? undefined, false);

      await tenantPages.update(Number(id), {
        puck_data: puckDataRef.current as Record<string, unknown>,
        page_css: pageCss,
      });

      toast({
        title: t('editor_saved_title'),
        description: t('editor_saved_desc'),
      });
    } catch {
      toast({
        title: t('error_title'),
        description: t('editor_failed_save'),
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" />
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
