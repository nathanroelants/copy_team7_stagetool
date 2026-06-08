import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {      // Wanneer de front end roep /api/gebruikers de VITE maak een automatische snelkoppeling
    //               naar  de backend.
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
});