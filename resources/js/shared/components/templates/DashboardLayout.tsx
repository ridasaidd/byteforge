import { useState, ReactNode } from 'react';
import { TopBar } from '../organisms/TopBar';
import { Drawer, MenuItem } from '../organisms/Drawer';

interface DashboardLayoutProps {
  children: ReactNode;
  siteName: string;
  menuItems: MenuItem[];
  onSearch?: (query: string) => void;
  showSearch?: boolean;
}

export function DashboardLayout({
  children,
  siteName,
  menuItems,
  onSearch,
  showSearch = true,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen bg-background">
      {/* TopBar */}
      <TopBar
        siteName={siteName}
        onMenuToggle={toggleSidebar}
        onSearch={onSearch}
        showSearch={showSearch}
      />

      <div className="flex">
        {/* Sidebar */}
        <Drawer isOpen={sidebarOpen} onClose={closeSidebar} menuItems={menuItems} />

        {/* Main Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
