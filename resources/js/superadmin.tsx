import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from '@/shared/context/AuthContext';
import { CentralApp } from '@/apps/central/App';
import type { User } from '@/shared/types';
import './bootstrap';
import '../css/app.css';

// Get initial user data from Blade template (if provided)
const initialUserData = (window as Window & { __INITIAL_USER__?: User }).__INITIAL_USER__ || null;

const rootElement = document.getElementById('superadmin-app');

if (!rootElement) {
    throw new Error('Failed to find the root element with id "superadmin-app"');
}

createRoot(rootElement).render(
    <StrictMode>
        <AuthProvider initialUser={initialUserData}>
            <CentralApp />
        </AuthProvider>
    </StrictMode>
);
