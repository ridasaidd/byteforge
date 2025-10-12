import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/shared/components/templates/DashboardLayout';
import { DashboardPage } from './components/pages/DashboardPage';
import { centralMenuItems } from './config/menu';

export function CentralApp() {
  const handleSearch = (query: string) => {
    console.log('Search query:', query);
    // TODO: Implement search functionality
  };

  return (
    <BrowserRouter basename="/">
      <DashboardLayout
        siteName="ByteForge Central"
        menuItems={centralMenuItems}
        onSearch={handleSearch}
      >
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/dashboard/tenants" element={<div>Tenants Page (Coming Soon)</div>} />
          <Route path="/dashboard/users" element={<div>Users Page (Coming Soon)</div>} />
          <Route path="/dashboard/activity" element={<div>Activity Log (Coming Soon)</div>} />
          <Route path="/dashboard/settings" element={<div>Settings (Coming Soon)</div>} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </DashboardLayout>
    </BrowserRouter>
  );
}
