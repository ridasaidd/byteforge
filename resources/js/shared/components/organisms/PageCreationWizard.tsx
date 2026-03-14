import { useState } from 'react';
import { FileText, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Card } from '@/shared/components/ui/card';
import { useTranslation } from 'react-i18next';
import type { PageTemplate } from '@/shared/services/api/types';

export interface PageCreationData {
  title: string;
  slug: string;
  page_type: string;
  status: 'draft' | 'published';
  is_homepage: boolean;
  puck_data?: Record<string, unknown>;
  meta_data?: {
    meta_title?: string;
    meta_description?: string;
    meta_keywords?: string;
  };
}

interface PageCreationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PageCreationData, creationType: 'scratch' | 'template') => void;
  templates?: PageTemplate[];
  isLoading?: boolean;
}

export function PageCreationWizard({
  open,
  onOpenChange,
  onSubmit,
  templates = [],
  isLoading = false,
}: PageCreationWizardProps) {
  const { t } = useTranslation('pages');
  const [creationType, setCreationType] = useState<'scratch' | 'template'>('scratch');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [pageType, setPageType] = useState('general');
  const [isHomepage, setIsHomepage] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Auto-generate slug from title
  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slug || slug === title.toLowerCase().replace(/\s+/g, '-')) {
      setSlug(value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
    }
  };

  // Auto-set page_type to 'home' when is_homepage is checked
  const handleHomepageChange = (checked: boolean) => {
    setIsHomepage(checked);
    if (checked) {
      setPageType('home');
    }
  };

  // Get unique categories from templates
  const categories = ['all', ...new Set(templates.map(t => t.category || 'uncategorized'))];

  // Filter templates by category
  const filteredTemplates = selectedCategory === 'all'
    ? templates
    : templates.filter(t => (t.category || 'uncategorized') === selectedCategory);

  const handleSubmit = () => {
    if (!title.trim()) return;

    const baseData: PageCreationData = {
      title: title.trim(),
      slug: slug.trim() || title.toLowerCase().replace(/\s+/g, '-'),
      page_type: pageType,
      status: 'draft',
      is_homepage: isHomepage,
    };

    // Add template data if using a template
    if (creationType === 'template' && selectedTemplate) {
      const template = templates.find(t => t.slug === selectedTemplate);
      if (template) {
        baseData.puck_data = template.puck_data as Record<string, unknown>;
      }
    }

    onSubmit(baseData, creationType);

    // Reset form
    setTitle('');
    setSlug('');
    setPageType('general');
    setSelectedTemplate('');
    setSelectedCategory('all');
    setCreationType('scratch');
    setIsHomepage(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('wizard_title')}</DialogTitle>
          <DialogDescription>
            {t('wizard_description')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {/* Creation Type Selector */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card
              className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                creationType === 'scratch' ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setCreationType('scratch')}
            >
              <div className="flex flex-col items-center text-center gap-2">
                <FileText className="h-8 w-8 text-primary" />
                <h3 className="font-semibold">{t('start_from_scratch')}</h3>
                <p className="text-xs text-muted-foreground">
                  {t('start_from_scratch_description')}
                </p>
              </div>
            </Card>

            <Card
              className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                creationType === 'template' ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setCreationType('template')}
            >
              <div className="flex flex-col items-center text-center gap-2">
                <Sparkles className="h-8 w-8 text-primary" />
                <h3 className="font-semibold">{t('use_theme_template')}</h3>
                <p className="text-xs text-muted-foreground">
                  {t('use_theme_template_description')}
                </p>
              </div>
            </Card>
          </div>

          {/* Page Details Form */}
          <div className="space-y-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="page-title">{t('wizard_page_title')} *</Label>
              <Input
                id="page-title"
                placeholder={t('wizard_page_title_placeholder')}
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="page-slug">{t('wizard_url_slug')} *</Label>
                <Input
                  id="page-slug"
                  placeholder={t('wizard_url_slug_placeholder')}
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="page-type">{t('wizard_page_type')}</Label>
                <Select value={pageType} onValueChange={setPageType}>
                  <SelectTrigger id="page-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">{t('type_general')}</SelectItem>
                    <SelectItem value="home">{t('type_home')}</SelectItem>
                    <SelectItem value="about">{t('type_about')}</SelectItem>
                    <SelectItem value="contact">{t('type_contact')}</SelectItem>
                    <SelectItem value="service">{t('type_service')}</SelectItem>
                    <SelectItem value="blog">{t('type_blog')}</SelectItem>
                    <SelectItem value="product">{t('type_product')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="is-homepage"
                type="checkbox"
                className="h-4 w-4"
                checked={isHomepage}
                onChange={(e) => handleHomepageChange(e.target.checked)}
              />
              <Label htmlFor="is-homepage">{t('wizard_set_homepage')}</Label>
            </div>
          </div>

          {/* Template Selection (only shown when 'template' is selected) */}
          {creationType === 'template' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>{t('choose_template')}</Label>
                <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-auto">
                  <TabsList>
                    {categories.map((cat) => (
                      <TabsTrigger key={cat} value={cat} className="capitalize">
                        {cat === 'all' ? t('all_categories') : cat === 'uncategorized' ? t('uncategorized') : cat}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>

              <div className="grid grid-cols-2 gap-4 max-h-64 overflow-y-auto">
                {filteredTemplates.length > 0 ? (
                  filteredTemplates.map((template) => (
                    <Card
                      key={template.slug}
                      className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                        selectedTemplate === template.slug ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => setSelectedTemplate(template.slug)}
                    >
                      {template.preview_image && (
                        <div className="aspect-video bg-muted rounded mb-2 overflow-hidden">
                          <img
                            src={template.preview_image}
                            alt={template.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      <h4 className="font-semibold text-sm mb-1">{template.name}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {template.description}
                      </p>
                    </Card>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground col-span-2 text-center py-8">
                    {t('no_templates_in_category')}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {t('cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || (creationType === 'template' && !selectedTemplate) || isLoading}
          >
            {isLoading ? t('creating') : t('create_page')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
