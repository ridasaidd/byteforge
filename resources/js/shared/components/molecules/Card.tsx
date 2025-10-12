import { ReactNode } from 'react';
import { Card as ShadcnCard, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

interface CardProps {
  title?: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  loading?: boolean;
  empty?: boolean;
  error?: string;
  className?: string;
}

export function Card({
  title,
  description,
  children,
  actions,
  footer,
  loading = false,
  empty = false,
  error,
  className = '',
}: CardProps) {
  return (
    <ShadcnCard className={className}>
      {(title || actions) && (
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              {title && <CardTitle>{title}</CardTitle>}
              {description && <CardDescription>{description}</CardDescription>}
            </div>
            {actions && <div>{actions}</div>}
          </div>
        </CardHeader>
      )}
      
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : error ? (
          <div className="text-sm text-destructive">{error}</div>
        ) : empty ? (
          <div className="text-sm text-muted-foreground">No data available</div>
        ) : (
          children
        )}
      </CardContent>

      {footer && <CardFooter>{footer}</CardFooter>}
    </ShadcnCard>
  );
}
