import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Flask serveert de output onder /static/bundle/. Twee losse entries, zodat
// pagina's alleen laden wat ze nodig hebben:
// - cursor.js: React Bits TargetCursor (alleen desktop met muis)
// - map.js:    Leaflet-kaart (alleen op pagina's met een kaart, lazy)
export default defineConfig({
  plugins: [react()],
  base: '/static/bundle/',
  build: {
    outDir: '../static/bundle',
    emptyOutDir: true,
    cssCodeSplit: true,
    rollupOptions: {
      input: { cursor: 'src/cursor.jsx', map: 'src/map.js' },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunk-[name]-[hash].js',
        assetFileNames: (info) => {
          const n = info.name || info.names?.[0] || '';
          return n.endsWith('.css') ? '[name][extname]' : 'assets/[name]-[hash][extname]';
        }
      }
    }
  }
});
