import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Em desenvolvimento (npm run dev) as chamadas /api vão para o backend local.
// Em produção (Docker) quem faz esse papel é o Nginx.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:3000' },
  },
});
