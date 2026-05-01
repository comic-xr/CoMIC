import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  optimizeDeps: {
    include: ['@kitware/vtk.js']
  },
  // This handles the controller.html as a raw import
  plugins: [
    {
      name: 'html-loader',
      transform(code, id) {
        if (id.endsWith('.html')) {
          return {
            code: `export default ${JSON.stringify(code)}`,
            map: null
          };
        }
      }
    }
  ]
});