import React from 'react';
import ReactDOM from 'react-dom/client';
import { PublicApp } from '@/apps/public/App';
import '@/bootstrap';
import '@/css/app.css';

const rootElement = document.getElementById('public-app');

if (!rootElement) {
    throw new Error('Failed to find the root element with id "public-app"');
}

ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
        <PublicApp />
    </React.StrictMode>
);
