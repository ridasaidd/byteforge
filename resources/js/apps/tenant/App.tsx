import { FC } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/shared/components/templates/DashboardLayout';
import { ThemeProvider } from '@/shared/contexts/ThemeContext';
import { DashboardPage, PagesPage } from './components/pages';
import { ThemeCustomizePage } from '@/shared/components/organisms/ThemeCustomizePage';
import { tenantMenuItems } from './config/menu';
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
    // Redirect to central login - fallback to current origin if env not set
    const centralUrl = (import.meta as unknown as { env?: { VITE_CENTRAL_URL?: string } }).env?.VITE_CENTRAL_URL || window.location.origin;
    window.location.href = `${centralUrl}/login`;
    return null;
  }

  const handleSearch = (query: string) => {
    console.log('Search query:', query);
    // TODO: Implement search functionality
  };

  return (
    <ThemeProvider>
      <DashboardLayout
        siteName="CMS"
        menuItems={tenantMenuItems}
        onSearch={handleSearch}
      >
        <Routes>
          {/* Full Screen Editors - Without Layout */}
          <Route path="/cms/theme/customize" element={<ThemeCustomizePage />} />

          {/* All other routes with Dashboard Layout */}
          <Route path="/cms" element={<DashboardPage />} />
          <Route path="/cms/pages" element={<PagesPage />} />
          {/* TODO: Add other routes */}
          <Route path="/" element={<Navigate to="/cms" replace />} />
        </Routes>
      </DashboardLayout>
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
        <Route path="/*" element={<ProtectedRoutes />} />
      </Routes>
    </BrowserRouter>
  );
};
