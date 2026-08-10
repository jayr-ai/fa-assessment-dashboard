import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Deployed as a hub card at freedomacademy.azdigitalph.com/assessment/, alongside the other
  // Freedom Academy dashboards (repo jayr-ai/au-fa-dashboard) — see README "Deploying".
  base: '/assessment/',
  server: {
    port: 5185,
    strictPort: true,
  },
})
