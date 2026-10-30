import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/* Demo app build. Root is demo/, output -> demo-dist/. A RELATIVE base ('./')
   makes asset URLs relative, so the same build works at a GitHub Pages project
   subpath (ohhaiohhai.github.io/burp-widgets/) AND at a host root (Netlify).
   Routing is HashRouter, so no server rewrites are needed either way. */
export default defineConfig({
  plugins: [react()],
  root: 'demo',
  base: './',
  // the demo imports ../src and ../styles.css, which live above the demo root
  server: { fs: { allow: ['..'] } },
  build: {
    outDir: '../demo-dist',
    emptyOutDir: true,
  },
});
