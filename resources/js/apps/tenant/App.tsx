import { FC } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/shared/components/templates/DashboardLayout';
import { ThemeProvider } from '@/shared/contexts/ThemeContext';
import { DashboardPage, AccessDeniedPage, LoginPage, ThemesPage, PagesPage, PageEditorPage, AnalyticsPage, SettingsPage, MediaPage, NavigationPage, PaymentProvidersPage, PaymentsPage, UsersPage, RolesPermissionsPage } from './components/pages';
import { ThemeCustomizePage } from '@/shared/components/organisms/ThemeCustomizePage';
import { ProfilePage } from '@/apps/central/components/pages/ProfilePage';
import { AccountSettingsPage } from '@/apps/central/components/pages/AccountSettingsPage';
import { useTenantMenuItems } from './config/menu';
import { useAuth } from '@/shared/hooks/useAuth';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { useTranslation } from 'react-i18next';

function PermissionGate({ permission, children }: { permission: string; children: JSX.Element }) {
  const { hasPermission } = usePermissions();

  if (!hasPermission(permission)) {
    return <AccessDeniedPage />;
  }

  return children;
}

function ProtectedRoutes() {
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useTranslation('common');
  const tenantMenuItems = useTenantMenuItems();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">{t('loading')}</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleSearch = (query: string) => {
    console.log('Search query:', query);
  };

  return (
    <ThemeProvider>
      <Routes>
        {/* Full Screen Editors - Without Layout */}
        <Route
          path="/cms/themes/:id/customize"
          element={(
            <PermissionGate permission="themes.view">
              <ThemeCustomizePage />
            </PermissionGate>
          )}
        />
        <Route
          path="/cms/pages/:id/edit"
          element={(
            <PermissionGate permission="pages.edit">
              <PageEditorPage />
            </PermissionGate>
          )}
        />

        {/* All other routes with Dashboard Layout */}
        <Route
          path="/*"
          element={(
            <DashboardLayout
              siteName="CMS"
              menuItems={tenantMenuItems}
              onSearch={handleSearch}
            >
              <Routes>
                <Route path="/cms" element={<DashboardPage />} />
                <Route
                  path="/cms/themes"
                  element={(
                    <PermissionGate permission="themes.view">
                      <ThemesPage />
                    </PermissionGate>
                  )}
                />
                <Route
                  path="/cms/pages"
                  element={(
                    <PermissionGate permission="pages.view">
                      <PagesPage />
                    </PermissionGate>
                  )}
                />
                <Route
                  path="/cms/analytics"
                  element={(
                    <PermissionGate permission="view analytics">
                      <AnalyticsPage />
                    </PermissionGate>
                  )}
                />
                <Route
                  path="/cms/media"
                  element={(
                    <PermissionGate permission="media.view">
                      <MediaPage />
                    </PermissionGate>
                  )}
                />
                <Route
                  path="/cms/navigation"
                  element={(
                    <PermissionGate permission="navigation.view">
                      <NavigationPage />
                    </PermissionGate>
                  )}
                />
                <Route
                  path="/cms/payments/providers"
                  element={(
                    <PermissionGate permission="payments.view">
                      <PaymentProvidersPage />
                    </PermissionGate>
                  )}
                />
                <Route
                  path="/cms/payments"
                  element={(
                    <PermissionGate permission="payments.view">
                      <PaymentsPage />
                    </PermissionGate>
                  )}
                />
                <Route
                  path="/cms/settings"
                  element={(
                    <PermissionGate permission="view settings">
                      <SettingsPage />
                    </PermissionGate>
                  )}
                />
                <Route
                  path="/cms/users"
                  element={(
                    <PermissionGate permission="view users">
                      <UsersPage />
                    </PermissionGate>
                  )}
                />
                <Route
                  path="/cms/roles-permissions"
                  element={(
                    <PermissionGate permission="view users">
                      <RolesPermissionsPage />
                    </PermissionGate>
                  )}
                />
                <Route path="/cms/profile" element={<ProfilePage />} />
                <Route path="/cms/account" element={<AccountSettingsPage />} />
                <Route path="/" element={<Navigate to="/cms" replace />} />
              </Routes>
            </DashboardLayout>
          )}
        />
      </Routes>
    </ThemeProvider>
  );
}

export const TenantApp: FC = () => {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<ProtectedRoutes />} />
      </Routes>
    </BrowserRouter>
  );
};
