import react from '@vitejs/plugin-react-swc';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      deny: ['lighthouse/**'],
    },
  },
  build: {
    // Enable code splitting
    rollupOptions: {
      plugins:
        process.env.ANALYZE === 'true'
          ? [
              visualizer({
                filename: 'dist/stats.html',
                open: true,
                gzipSize: true,
                brotliSize: true,
              }),
            ]
          : [],
      output: {
        // Split vendor chunks
        manualChunks: {
          // React and React DOM in one chunk
          'react-vendor': ['react', 'react-dom'],
          // D3 in its own chunk
          'd3-vendor': ['d3'],
          // Firebase in its own chunk
          'firebase-vendor': [
            'firebase/app',
            'firebase/database',
            'firebase/firestore',
            'firebase/storage',
            'firebase/auth',
          ],
        },
        // Optimize chunk file names
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Enable compression
    minify: 'terser',
    // Set chunk size warnings
    chunkSizeWarningLimit: 1000,
    // Enable source maps for production debugging & Sentry uploads
    // Using true (not 'hidden') so verification can confirm presence locally; adjust to 'hidden' if desired later
    sourcemap: true,
    // Optimize CSS
    cssCodeSplit: true,
    // Enable tree shaking
    modulePreload: {
      polyfill: false,
    },
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'd3', 'firebase/app'],
  },
});
