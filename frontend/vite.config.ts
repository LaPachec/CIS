import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

const outputDirectory = fileURLToPath(new URL('../backend/dist/public', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "/cis",
  server: {
    host: true
  },
  build: {
    outDir: outputDirectory,
    emptyOutDir: false,
  },
})
