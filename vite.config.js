import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        name: fileURLToPath(new URL('./name.html', import.meta.url)),
        favorites: fileURLToPath(new URL('./favorites.html', import.meta.url))
      }
    }
  }
});
