import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',   // expose to all network interfaces — required for WiFi access from other devices
    port: 5173,
    strictPort: false,
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
  },
})
