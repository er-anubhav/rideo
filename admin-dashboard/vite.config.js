import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import backendConfig from '../backend.config.js';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: backendConfig.origin,
        changeOrigin: true,
      },
    },
  },
});
