import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
  // Relative asset URLs so the static build works both at a domain root and
  // under a subpath (e.g. user.github.io/modak-run/).
  base: './',
  plugins: [
    wasm(),
  ],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
  },
  optimizeDeps: {
    exclude: ['@dimforge/rapier3d', '@dimforge/rapier3d/rapier'],
  },
});
