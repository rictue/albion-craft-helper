import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Copy index.html to 200.html for Render SPA fallback
    {
      name: 'copy-index-to-200',
      closeBundle() {
        const fs = require('fs')
        const src = resolve(__dirname, 'dist/index.html')
        const dest = resolve(__dirname, 'dist/200.html')
        if (fs.existsSync(src)) fs.copyFileSync(src, dest)
      }
    }
  ],
})
