import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Project page at jayr-ai.github.io/fa-assessment-dashboard/ — update if a custom domain
  // is added later (custom domains serve from the root, so base would become '/').
  base: '/fa-assessment-dashboard/',
  server: {
    port: 5185,
    strictPort: true,
  },
})
