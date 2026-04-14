import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api-onpe': {
        target: 'https://resultadoelectoral.onpe.gob.pe',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-onpe/, ''),
        secure: false,
      },
    },
  },
})
