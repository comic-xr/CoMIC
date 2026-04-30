import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import type { IncomingMessage, ServerResponse } from 'node:http';

type ConnectLike = {
  use: (fn: (req: IncomingMessage, res: ServerResponse, next: () => void) => void) => void;
};

/** Serves project's data/datasets at /data/datasets/ (dev + vite preview). */
function serveDataDatasets() {
  const dataDir = path.resolve(__dirname, 'data', 'datasets');
  function mountDataMiddleware(middlewares: ConnectLike): void {
    middlewares.use((req, res, next) => {
      const urlPath = req.url?.split('?')[0] ?? '';
      if (urlPath === '/data/datasets/index.json') {
        fs.readdir(dataDir, (err, files) => {
          res.setHeader('Content-Type', 'application/json');
          if (err != null) {
            res.end(JSON.stringify({ datasets: [] }));
            return;
          }
          const ids = files
            .filter((f) => f.toLowerCase().endsWith('.vti'))
            .map((f) => f.replace(/\.vti$/i, ''))
            .sort();
          res.end(JSON.stringify({ datasets: ids }));
        });
        return;
      }
      if (!urlPath.startsWith('/data/datasets/')) {
        next();
        return;
      }
      const relative = urlPath.replace(/^\//, '').replace(/^data\/datasets\/?/, '') || '';
      const filePath = path.join(dataDir, relative);
      if (!filePath.startsWith(dataDir) || path.relative(dataDir, filePath).startsWith('..')) {
        next();
        return;
      }
      fs.stat(filePath, (err, stat) => {
        if (err != null || !stat.isFile()) {
          next();
          return;
        }
        res.setHeader('Content-Type', 'application/octet-stream');
        fs.createReadStream(filePath).pipe(res);
      });
    });
  }
  return {
    name: 'serve-data-datasets',
    configureServer(server: { middlewares: ConnectLike }) {
      mountDataMiddleware(server.middlewares);
    },
    configurePreviewServer(server: { middlewares: ConnectLike }) {
      mountDataMiddleware(server.middlewares);
    },
  };
}

const reductionApiProxyTarget = process.env.VITE_REDUCTION_PROXY_TARGET ?? 'http://localhost:8000';

export default defineConfig({
  plugins: [serveDataDatasets(), react()],
  // Same-origin /api in dev → backend (no browser CORS). Override target if backend uses another port.
  server: {
    proxy: {
      '/api': { target: reductionApiProxyTarget, changeOrigin: true },
    },
  },
  preview: {
    proxy: {
      '/api': { target: reductionApiProxyTarget, changeOrigin: true },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // VTK.js ESM/global compatibility
  define: {
    // Browser: some deps (e.g. globalthis) expect `global`; Vite does not inject it by default
    global: 'globalThis',
  },
  optimizeDeps: {
    // Force pre-bundle VTK.js so its deep ESM graph is resolved and cached in dev
    include: ['@kitware/vtk.js'],
  },
  build: {
    // VTK.js targets ES6+; avoid over-transpiling
    target: 'esnext',
    commonjsOptions: {
      // Ensure CJS deps used by VTK (e.g. gl-matrix) are transformed
      transformMixedEsModules: true,
    },
  },
});
