import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Distinct dev port from the dashboard (5173) so both can run at once —
  // matches the backend's default multi-origin CORS_ORIGIN.
  server: { port: 5174 },
  preview: { port: 5174 },
})
