import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/shared/context/AuthContext.tsx';
import { CentralApp } from '@/apps/central/App';
import './bootstrap';
import '../css/app.css';

// Create a client
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 5 * 60 * 1000, // 5 minutes
        },
    },
});

const rootElement = document.getElementById('superadmin-app');

if (!rootElement) {
    throw new Error('Failed to find the root element with id "superadmin-app"');
}

createRoot(rootElement).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <CentralApp />
                <Toaster position="top-right" richColors />
            </AuthProvider>
        </QueryClientProvider>
    </StrictMode>
);
