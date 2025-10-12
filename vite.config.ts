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
        hmr: {
            host: 'byteforge.se',  // Your actual domain for HMR
        },
    },
});
