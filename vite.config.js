import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/* Library build: bundle src/index.js to an ESM file, keeping React external so
   the consuming app provides it (peerDependency). Output -> dist/. */
export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: 'src/index.js',
      formats: ['es'],
      fileName: () => 'burp-widgets.js',
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
});
