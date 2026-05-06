import { defineConfig, loadEnv } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

function parseCsv(value, fallback) {
    const entries = (value ?? '')
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);

    return entries.length > 0 ? entries : fallback;
}

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function originPattern(host) {
    const normalized = host.trim();

    if (normalized.startsWith('.')) {
        return new RegExp(`^https?:\\/\\/([a-z0-9-]+\\.)*${escapeRegex(normalized.slice(1))}(:\\d+)?$`);
    }

    return new RegExp(`^https?:\\/\\/${escapeRegex(normalized)}(:\\d+)?$`);
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const centralDomains = parseCsv(env.VITE_CENTRAL_DOMAINS, ['localhost', '127.0.0.1']);
    const sharedDomainSuffixes = centralDomains
        .filter((domain) => !['localhost', '127.0.0.1'].includes(domain))
        .map((domain) => `.${domain}`);
    const allowedHosts = parseCsv(
        env.VITE_DEV_SERVER_ALLOWED_HOSTS,
        ['localhost', '127.0.0.1', ...sharedDomainSuffixes]
    );
    const corsOrigins = parseCsv(
        env.VITE_DEV_SERVER_CORS_ORIGINS,
        ['localhost', '127.0.0.1', ...sharedDomainSuffixes]
    ).map(originPattern);
    const port = Number.parseInt(env.VITE_DEV_SERVER_PORT || '5173', 10);
    const defaultHmrHost = centralDomains.find((domain) => !['localhost', '127.0.0.1'].includes(domain)) || 'localhost';

    return {
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
            host: env.VITE_DEV_SERVER_HOST || '0.0.0.0',
            port,
            strictPort: true,
            cors: {
                origin: corsOrigins,
                credentials: true,
            },
            allowedHosts,
            hmr: {
                host: env.VITE_DEV_SERVER_HMR_HOST || defaultHmrHost,
                protocol: env.VITE_DEV_SERVER_HMR_PROTOCOL || 'ws',
                port,
            },
        },
    };
});
