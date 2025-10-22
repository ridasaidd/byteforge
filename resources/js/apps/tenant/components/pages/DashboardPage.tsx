import { FileText, Image, Menu, Activity } from 'lucide-react';
import { PageHeader } from '@/shared/components/molecules/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="CMS Dashboard"
        description="Welcome to your content management system"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pages</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">
              Loading...
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">
              Loading...
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Media Files</CardTitle>
            <Image className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">
              Loading...
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Menu Items</CardTitle>
            <Menu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">
              Loading...
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <a
            href="/cms/pages"
            className="flex flex-col items-center justify-center p-6 border rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <FileText className="h-8 w-8 mb-2" />
            <span className="text-sm font-medium">Manage Pages</span>
          </a>
          <a
            href="/cms/media"
            className="flex flex-col items-center justify-center p-6 border rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Image className="h-8 w-8 mb-2" />
            <span className="text-sm font-medium">Media Library</span>
          </a>
          <a
            href="/cms/navigation"
            className="flex flex-col items-center justify-center p-6 border rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Menu className="h-8 w-8 mb-2" />
            <span className="text-sm font-medium">Navigation</span>
          </a>
          <a
            href="/cms/settings"
            className="flex flex-col items-center justify-center p-6 border rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Activity className="h-8 w-8 mb-2" />
            <span className="text-sm font-medium">Settings</span>
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
