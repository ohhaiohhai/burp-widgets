import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/* Demo app build. Root is demo/, output -> demo-dist/. base matches the GitHub
   Pages project path so asset URLs resolve at ohhaiohhai.github.io/burp-widgets/. */
export default defineConfig({
  plugins: [react()],
  root: 'demo',
  base: '/burp-widgets/',
  // the demo imports ../src and ../styles.css, which live above the demo root
  server: { fs: { allow: ['..'] } },
  build: {
    outDir: '../demo-dist',
    emptyOutDir: true,
  },
});
