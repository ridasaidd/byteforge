import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { TenantApp } from '@/apps/tenant/App';
import { AuthProvider } from '@/shared/context/AuthContext.tsx';
import { I18nDirectionProvider } from '@/i18n/I18nDirectionProvider';
import '@/i18n';
import './bootstrap';
import '../css/app.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

const rootElement = document.getElementById('tenant-app');

if (!rootElement) {
  throw new Error('Failed to find the root element with id "tenant-app"');
}

ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
      <I18nDirectionProvider>
        <AuthProvider>
          <TenantApp />
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </I18nDirectionProvider>
        </QueryClientProvider>
    </React.StrictMode>
);
