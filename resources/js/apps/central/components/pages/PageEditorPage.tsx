import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Puck, Data } from '@measured/puck';
import '@measured/puck/puck.css';
import { Loader2, Save, ArrowLeft, Eye, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { useToast } from '@/shared/hooks';
import { pages } from '@/shared/services/api/pages';
import { config } from './puck-components';

export function PageEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'components' | 'fields' | 'outline'>('components');
  const [pageData, setPageData] = useState<{ id: number; title: string; slug: string; status: string; puck_data: Record<string, unknown> | null } | null>(null);
  const [initialData, setInitialData] = useState<Data>({ content: [], root: {} });

  // Use ref to store current puck data
  const puckDataRef = useRef<Data>({ content: [], root: {} });
  const hasLoadedRef = useRef(false);

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
      setIsSaving(true);
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
    } finally {
      setIsSaving(false);
    }
  };

  // Preview page
  const handlePreview = () => {
    if (pageData?.slug) {
      window.open(`/${pageData.slug}`, '_blank');
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
    <div className="h-screen flex flex-col bg-background relative">
      {/* Top Bar */}
      <div className="border-b bg-background px-6 py-3 flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard/pages')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="border-l pl-4">
            <h1 className="text-lg font-semibold">{pageData.title}</h1>
            <p className="text-xs text-muted-foreground">/{pageData.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pageData.status === 'published' && (
            <Button variant="outline" size="sm" onClick={handlePreview}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
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

      {/* Puck Editor with Composition */}
      <div className="flex-1 overflow-hidden relative">
        <Puck
          config={config}
          data={initialData}
          onPublish={handleSave}
          onChange={handlePuckChange}
        >
          {/* Full Screen Preview */}
          <div className="h-screen overflow-auto bg-white">
            <Puck.Preview />
          </div>

          {/* Panel Toggle Button - Always visible */}
          <button
            onClick={() => setIsPanelOpen(!isPanelOpen)}
            className="fixed bottom-0 left-1/2 transform -translate-x-1/2 bg-background border border-b-0 rounded-t-lg px-4 py-2 shadow-lg hover:bg-accent transition-colors z-20"
          >
            {isPanelOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </button>

          {/* Bottom Sliding Panel */}
          <div
            className={`fixed bottom-0 left-0 right-0 bg-background border-t shadow-2xl transition-transform duration-300 ease-in-out z-10 ${
              isPanelOpen ? 'translate-y-0' : 'translate-y-full'
            }`}
            style={{ height: '25vh', paddingTop: '40px' }}
          >

            {/* Panel Content with Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="h-full flex flex-col">
              <TabsList className="w-full justify-start rounded-none border-b">
                <TabsTrigger value="components">Components</TabsTrigger>
                <TabsTrigger value="fields">Fields</TabsTrigger>
                <TabsTrigger value="outline">Outline</TabsTrigger>
              </TabsList>

              <TabsContent value="components" className="flex-1 overflow-auto p-4 mt-0">
                <Puck.Components />
              </TabsContent>

              <TabsContent value="fields" className="flex-1 overflow-auto p-4 mt-0">
                <Puck.Fields />
              </TabsContent>

              <TabsContent value="outline" className="flex-1 overflow-auto p-4 mt-0">
                <Puck.Outline />
              </TabsContent>
            </Tabs>
          </div>
        </Puck>
      </div>
    </div>
  );
}
