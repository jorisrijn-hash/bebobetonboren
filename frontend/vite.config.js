import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// De bundel wordt door Flask geserveerd onder /static/bundle/.
// Daarom is base op dat pad gezet zodat lazy-geladen chunks (three.js)
// de juiste absolute URL krijgen.
export default defineConfig({
  plugins: [react()],
  base: '/static/bundle/',
  build: {
    outDir: '../static/bundle',
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      input: 'src/main.jsx',
      output: {
        entryFileNames: 'reactbits.js',
        chunkFileNames: 'chunk-[name].js',
        assetFileNames: (info) => {
          const n = info.name || info.names?.[0] || '';
          return n.endsWith('.css') ? 'reactbits.css' : 'assets/[name][extname]';
        }
      }
    }
  }
});
