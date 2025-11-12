import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Puck, Data } from '@measured/puck';
import '@measured/puck/puck.css';
import { Loader2, Save, ArrowLeft } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useToast } from '@/shared/hooks';
import { themeParts } from '@/shared/services/api/themeParts';
import { config } from './puck-components';

export function ThemePartEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [themePartData, setThemePartData] = useState<{ id: number; name: string; type: string; status: string; puck_data_raw: Record<string, unknown> | null } | null>(null);
  const [initialData, setInitialData] = useState<Data>({ content: [], root: {} });

  // Use ref to store current puck data
  const puckDataRef = useRef<Data>({ content: [], root: {} });
  const hasLoadedRef = useRef(false);

  // Load theme part data once
  useEffect(() => {
    if (hasLoadedRef.current || !id) return;

    const loadThemePart = async () => {
      try {
        const response = await themeParts.get(id);
        const themePart = response.data;

        setThemePartData(themePart);

        // Set initial data once
        const data = (themePart.puck_data_raw as Data) || { content: [], root: {} };
        setInitialData(data);
        puckDataRef.current = data;
        hasLoadedRef.current = true;
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to load theme part',
          variant: 'destructive',
        });
        navigate('/dashboard/theme-parts');
      } finally {
        setIsLoading(false);
      }
    };

    loadThemePart();
  }, [id, navigate, toast]);

  // Handle puck data changes
  const handlePuckChange = (newData: Data) => {
    puckDataRef.current = newData;
  };

  // Save theme part
  const handleSave = async () => {
    if (!id) return;

    try {
      setIsSaving(true);
      await themeParts.update(Number(id), {
        puck_data_raw: puckDataRef.current as Record<string, unknown>,
      });

      toast({
        title: 'Theme part saved',
        description: 'Your changes have been saved and compiled successfully',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to save theme part',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard/theme-parts')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="h-6 w-px bg-border" />
          <div>
            <h1 className="text-sm font-semibold">{themePartData?.name}</h1>
            <p className="text-xs text-muted-foreground">
              {themePartData?.type} • {themePartData?.status}
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

      {/* Puck Editor */}
      <div className="flex-1 overflow-hidden">
        <Puck
          config={config}
          data={initialData}
          onChange={handlePuckChange}
        />
      </div>
    </div>
  );
}
