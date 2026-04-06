import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/shared/components/templates/DashboardLayout';
import { DashboardPage } from './components/pages/DashboardPage';
import { LoginPage } from './components/pages/LoginPage';
import { PagesPage, PageEditorPage, ThemesPage, ThemeBuilderPage } from './components/pages';
import { PublicPage } from './components/pages/PublicPage';
import { NavigationsPage } from './components/pages/NavigationsPage';
import { TenantsPage } from './components/pages/TenantsPage';
import { UsersPage } from './components/pages/UsersPage';
import { ActivityLogPage } from './components/pages/ActivityLogPage';
import { SettingsPage } from './components/pages/SettingsPage';
import { ProfilePage } from './components/pages/ProfilePage';
import { AccountSettingsPage } from './components/pages/AccountSettingsPage';
import { PlatformAnalyticsPage } from './components/pages/PlatformAnalyticsPage';
import { BillingPage } from './components/pages/BillingPage';
import RolesPermissionsPage from './components/pages/RolesPermissionsPage';
import MediaLibraryPage from './components/pages/MediaLibraryPage';
import { useCentralMenuItems } from './config/menu';
import { useAuth } from '@/shared/hooks/useAuth';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { ThemeProvider } from '@/shared/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

function PermissionGate({ permission, children }: { permission: string; children: JSX.Element }) {
  const { hasPermission } = usePermissions();

  if (!hasPermission(permission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function ProtectedRoutes() {
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useTranslation('common');
  const centralMenuItems = useCentralMenuItems();

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

  const handleSearch = (_query: string) => {
    // TODO: Implement search functionality
  };

  return (
    <ThemeProvider>
      <Routes>
        {/* Full Screen Editors - Without Layout */}
        <Route path="pages/:id/edit" element={<PageEditorPage />} />
        <Route path="themes/new/builder" element={<ThemeBuilderPage />} />
        <Route path="themes/:id/builder" element={<ThemeBuilderPage />} />
        <Route path="themes/:id/customize" element={<ThemeBuilderPage mode="customize" />} />

        {/* All other routes with Dashboard Layout */}
        <Route path="/*" element={
          <DashboardLayout
            siteName="ByteForge Central"
            menuItems={centralMenuItems}
            onSearch={handleSearch}
          >
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="pages" element={<PagesPage />} />
              <Route path="navigations" element={<NavigationsPage />} />
              <Route path="themes" element={<ThemesPage />} />
              <Route path="tenants" element={<TenantsPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="media" element={<MediaLibraryPage />} />
              <Route path="roles-permissions" element={<RolesPermissionsPage />} />
              <Route path="activity" element={<ActivityLogPage />} />
              <Route path="analytics" element={<PlatformAnalyticsPage />} />
              <Route
                path="billing"
                element={(
                  <PermissionGate permission="view billing">
                    <BillingPage />
                  </PermissionGate>
                )}
              />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="account" element={<AccountSettingsPage />} />
            </Routes>
          </DashboardLayout>
        } />
      </Routes>
    </ThemeProvider>
  );
}

export function CentralApp() {
  return (
    <BrowserRouter
      basename="/"
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        {/* Public homepage - no auth required */}
        <Route path="/" element={<PublicPage />} />

        {/* Public page viewing - no auth required */}
        <Route path="/pages/:slug" element={<PublicPage />} />

        {/* Authentication */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes */}
        <Route path="/dashboard/*" element={<ProtectedRoutes />} />
      </Routes>
    </BrowserRouter>
  );
}
