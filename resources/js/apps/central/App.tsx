import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/shared/components/templates/DashboardLayout';
import { DashboardPage } from './components/pages/DashboardPage';
import { LoginPage } from './components/pages/LoginPage';
import { TenantsPage } from './components/pages/TenantsPage';
import { UsersPage } from './components/pages/UsersPage';
import { ActivityLogPage } from './components/pages/ActivityLogPage';
import { SettingsPage } from './components/pages/SettingsPage';
import { ProfilePage } from './components/pages/ProfilePage';
import { AccountSettingsPage } from './components/pages/AccountSettingsPage';
import { centralMenuItems } from './config/menu';
import { useAuth } from '@/shared/hooks/useAuth';

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
    <DashboardLayout
      siteName="ByteForge Central"
      menuItems={centralMenuItems}
      onSearch={handleSearch}
    >
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/dashboard/tenants" element={<TenantsPage />} />
        <Route path="/dashboard/users" element={<UsersPage />} />
  <Route path="/dashboard/activity" element={<ActivityLogPage />} />
        <Route path="/dashboard/settings" element={<SettingsPage />} />
        <Route path="/dashboard/profile" element={<ProfilePage />} />
        <Route path="/dashboard/account" element={<AccountSettingsPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </DashboardLayout>
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
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<ProtectedRoutes />} />
      </Routes>
    </BrowserRouter>
  );
}
