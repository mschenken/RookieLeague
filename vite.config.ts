import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base must match the GitHub Pages project path: mschenken.github.io/RookieLeague/
export default defineConfig({
  base: '/RookieLeague/',
  plugins: [react(), tailwindcss()],
})
