import React from 'react';
import ReactDOM from 'react-dom/client';
import { CentralApp } from '@/apps/central/App';
import '@/bootstrap';
import '@/css/app.css';

const rootElement = document.getElementById('superadmin-app');

if (!rootElement) {
    throw new Error('Failed to find the root element with id "superadmin-app"');
}

ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
        <CentralApp />
    </React.StrictMode>
);
