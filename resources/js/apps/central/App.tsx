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
import RolesPermissionsPage from './components/pages/RolesPermissionsPage';
import MediaLibraryPage from './components/pages/MediaLibraryPage';
import { centralMenuItems } from './config/menu';
import { useAuth } from '@/shared/hooks/useAuth';
import { ThemeProvider } from '@/shared/contexts/ThemeContext';

function ProtectedRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleSearch = (query: string) => {
    console.log('Search query:', query);
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
