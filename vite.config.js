import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
// Configuração do Vite com alias @ -> src
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        host: true,
        port: 5173,
        strictPort: true,
        open: true,
        allowedHosts: true,
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:8090',
                changeOrigin: true,
            },
            '/_': {
                target: 'http://127.0.0.1:8090',
                changeOrigin: true,
            },
        },
    },
    preview: {
        host: true,
        port: 5173,
        strictPort: true,
        open: false,
        allowedHosts: true,
        proxy: {
            '/api': { target: 'http://127.0.0.1:8090', changeOrigin: true },
            '/_': { target: 'http://127.0.0.1:8090', changeOrigin: true },
        },
    },
});
