import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Rutas relativas para que el build funcione dentro de Capacitor (iOS/Android)
  base: './',
});
