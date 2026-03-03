import React from 'react';
import ReactDOM from 'react-dom/client';
import { TenantApp } from '@/apps/tenant/App';
import { AuthProvider } from '@/shared/context/AuthContext';
import './bootstrap';
import '../css/app.css';

const rootElement = document.getElementById('tenant-app');

if (!rootElement) {
  throw new Error('Failed to find the root element with id "tenant-app"');
}

ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
        <AuthProvider>
            <TenantApp />
        </AuthProvider>
    </React.StrictMode>
);
