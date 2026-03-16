import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
    plugins: [
        laravel({
            input: [
                'resources/css/app.css',
                'resources/js/superadmin.tsx',  // Central admin app
                'resources/js/tenant.tsx',      // Tenant CMS app
                'resources/js/public.tsx',      // Public page renderer
            ],
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'resources/js'),
        },
    },
    server: {
        host: '0.0.0.0',  // Listen on all network interfaces
        port: 5173,
        strictPort: true,
        // Allow tenant and central domains to fetch Vite dev assets.
        cors: {
            origin: [/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/, /^https?:\/\/([a-z0-9-]+\.)?byteforge\.se(:\d+)?$/],
            credentials: true,
        },
        allowedHosts: ['localhost', '127.0.0.1', '.byteforge.se'],
        hmr: {
            host: 'byteforge.se',  // Your actual domain for HMR
            protocol: 'ws',
            port: 5173,
        },
    },
});
