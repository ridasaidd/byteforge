import { Shield, KeyRound } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { tenantUsers } from '@/shared/services/api/tenantUsers';
import { PageHeader } from '@/shared/components/molecules/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';

export function RolesPermissionsPage() {
  const { t } = useTranslation(['access', 'common']);

  const rolesQuery = useQuery({
    queryKey: ['tenant-roles-with-permissions'],
    queryFn: () => tenantUsers.listRoles(),
    select: (response) => response.data,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('page_title', { ns: 'access' })}
        description={t('page_description', { ns: 'access' })}
        actions={(
          <Button asChild variant="outline">
            <Link to="/cms/users">
              <KeyRound className="h-4 w-4 me-2" />
              {t('menu_users', { ns: 'common' })}
            </Link>
          </Button>
        )}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-5 w-5" />
            {t('roles_tab', { ns: 'access' })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {rolesQuery.isLoading && (
            <p className="text-sm text-muted-foreground">{t('loading_roles', { ns: 'access' })}</p>
          )}

          {rolesQuery.isError && (
            <p className="text-sm text-destructive">{t('failed_load_roles', { ns: 'access' })}</p>
          )}

          {!rolesQuery.isLoading && !rolesQuery.isError && (rolesQuery.data?.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground">{t('no_roles', { ns: 'access' })}</p>
          )}

          {!rolesQuery.isLoading && !rolesQuery.isError && (rolesQuery.data?.length ?? 0) > 0 && (
            <div className="space-y-3">
              {rolesQuery.data?.map((role) => (
                <div key={role.id} className="rounded-md border p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{role.name}</p>
                      <p className="text-xs text-muted-foreground">{role.guard_name ?? 'api'}</p>
                    </div>
                    <Badge variant="outline">
                      {(role.permissions ?? []).length} {t('permissions_tab', { ns: 'access' }).toLowerCase()}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(role.permissions ?? []).length > 0 ? (
                      role.permissions?.map((perm) => (
                        <Badge key={perm.id} variant="secondary">{perm.name}</Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">{t('no_permissions', { ns: 'access' })}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
