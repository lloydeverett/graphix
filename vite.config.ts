import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const repo = import.meta.dirname;
const src = resolve(repo, 'src');

export default defineConfig({
  root: src,
  // The e2e tests set this, so their dev server never disturbs `pnpm dev`'s.
  cacheDir: process.env.GRAPHIX_VITE_CACHE_DIR ?? resolve(repo, 'node_modules/.vite'),
  define: {
    // Built with GRAPHIX_SAME_ORIGIN_PREVIEW=1 by `pnpm build:same-origin`.
    'import.meta.env.GRAPHIX_SAME_ORIGIN_PREVIEW': JSON.stringify(process.env.GRAPHIX_SAME_ORIGIN_PREVIEW ?? ''),
  },
  server: {
    // The Preview's opaque origin sends `Origin: null`, which Vite's default
    // CORS policy refuses, leaving the Preview empty.
    cors: { origin: '*' },
  },
  build: {
    outDir: resolve(repo, 'dist'),
    emptyOutDir: true,
    // Mermaid's and ELK's big chunks load only when a Diagram needs them.
    chunkSizeWarningLimit: 1500,
    rolldownOptions: {
      // preview.html must be its own entry, served beside the editor.
      input: { index: resolve(src, 'index.html'), preview: resolve(src, 'preview.html') },
    },
  },
});
