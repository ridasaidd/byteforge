import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Puck, Data } from '@measured/puck';
import '@measured/puck/puck.css';
import { Loader2, Monitor, Tablet, Smartphone } from 'lucide-react';
import { useToast } from '@/shared/hooks';
import { pages } from '@/shared/services/api/pages';
import { config } from './puck-components';

export function PageEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [pageData, setPageData] = useState<{ id: number; title: string; slug: string; status: string; puck_data: Record<string, unknown> | null } | null>(null);
  const [initialData, setInitialData] = useState<Data>({ content: [], root: {} });

  // Use ref to store current puck data
  const puckDataRef = useRef<Data>({ content: [], root: {} });
  const hasLoadedRef = useRef(false);

  // Viewport configuration for responsive editing
  const viewports = [
    { width: 375, height: 667, label: 'Mobile', icon: <Smartphone className="h-4 w-4" /> },
    { width: 768, height: 1024, label: 'Tablet', icon: <Tablet className="h-4 w-4" /> },
    { width: 1280, height: 'auto' as const, label: 'Desktop', icon: <Monitor className="h-4 w-4" /> },
  ];

  // Load page data once
  useEffect(() => {
    if (hasLoadedRef.current || !id) return;

    const loadPage = async () => {
      try {
  const response = await pages.get(id);
        const page = response.data;

        setPageData(page);

        // Set initial data once
        const data = (page.puck_data as Data) || { content: [], root: {} };
        setInitialData(data);
        puckDataRef.current = data;
        hasLoadedRef.current = true;
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to load page',
          variant: 'destructive',
        });
        navigate('/dashboard/pages');
      } finally {
        setIsLoading(false);
      }
    };

    loadPage();
  }, [id, navigate, toast]);

  // Handle puck data changes
  const handlePuckChange = (newData: Data) => {
    puckDataRef.current = newData;
  };

  // Save page
  const handleSave = async () => {
    if (!id) return;

    try {
      await pages.update(Number(id), {
        puck_data: puckDataRef.current as Record<string, unknown>,
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
