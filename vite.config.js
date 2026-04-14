import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
base: '/ielts-dictation/ielts-dictation4.14/',

  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    allowedHosts: ['.manus.computer']
  }
});
