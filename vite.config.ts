import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Teen alag HTML entry = teen alag installable PWA (Showroom, Godown, Office).
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        showroom: resolve(__dirname, 'index.html'),
        partner: resolve(__dirname, 'partner/index.html'),
        office: resolve(__dirname, 'office/index.html'),
      },
    },
  },
});
