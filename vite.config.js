import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'root-deploy-handler',
      configureServer(server) {
        // Rewrite root paths in local dev so opening http://localhost:5173/ serves the React app
        server.middlewares.use((req, res, next) => {
          const url = req.url ? req.url.split('?')[0] : '';
          if (url === '/' || url === '/index.html' || url === '/v2' || url === '/v2/') {
            req.url = '/index.template.html';
          }
          next();
        });
      },
      closeBundle() {
        const distDir = resolve(__dirname, 'dist');
        const compiledHtml = resolve(distDir, 'index.template.html');
        const rootIndex = resolve(__dirname, 'index.html');
        const distAssets = resolve(distDir, 'assets');
        const rootAssets = resolve(__dirname, 'assets');

        // Copy compiled HTML to root index.html for GitHub Pages root deployment
        if (fs.existsSync(compiledHtml)) {
          fs.copyFileSync(compiledHtml, rootIndex);
        }

        // Clean and update root assets directory
        if (fs.existsSync(distAssets)) {
          if (!fs.existsSync(rootAssets)) {
            fs.mkdirSync(rootAssets, { recursive: true });
          } else {
            const existingFiles = fs.readdirSync(rootAssets);
            for (const f of existingFiles) {
              try {
                fs.unlinkSync(resolve(rootAssets, f));
              } catch (_) {}
            }
          }

          const files = fs.readdirSync(distAssets);
          for (const file of files) {
            fs.copyFileSync(resolve(distAssets, file), resolve(rootAssets, file));
          }
        }
      }
    }
  ],
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        app: resolve(__dirname, 'index.template.html')
      }
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173
  }
});
