import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'v2-dev-and-build-handler',
      configureServer(server) {
        // Rewrite root paths in local dev so opening http://localhost:5173/ serves the v2 app seamlessly
        server.middlewares.use((req, res, next) => {
          const url = req.url ? req.url.split('?')[0] : '';
          if (url === '/' || url === '/index.html' || url === '/v2' || url === '/v2/') {
            req.url = '/v2.html';
          }
          next();
        });
      },
      closeBundle() {
        // After build into outDir (v2), ensure v2/index.html is created
        const outDir = resolve(__dirname, 'v2');
        const v2Html = resolve(outDir, 'v2.html');
        const indexHtml = resolve(outDir, 'index.html');
        if (fs.existsSync(v2Html)) {
          fs.copyFileSync(v2Html, indexHtml);
          fs.unlinkSync(v2Html);
        }
      }
    }
  ],
  base: '/v2/',
  build: {
    outDir: 'v2',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        v2: resolve(__dirname, 'v2.html')
      }
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173
  }
});
