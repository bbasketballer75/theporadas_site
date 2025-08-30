import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: {
    // Enable code splitting
    rollupOptions: {
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
          // Other large dependencies
          'other-vendor': ['mssql'],
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
    // Enable source maps for production debugging
    sourcemap: false,
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
