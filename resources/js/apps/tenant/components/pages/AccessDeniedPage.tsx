import { ShieldX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';

export function AccessDeniedPage() {
  return (
    <div className="mx-auto max-w-2xl py-10">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldX className="h-5 w-5 text-destructive" />
            Access Denied
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You do not have permission to access this section.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
