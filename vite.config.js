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
        host: 'localhost',
        port: 5173,
        strictPort: true,
        open: true,
    },
    preview: {
        host: 'localhost',
        port: 5173,
        strictPort: true,
        open: false,
    },
});
