import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { copyFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Copy index.html to 200.html for Render SPA fallback
    {
      name: 'copy-index-to-200',
      closeBundle() {
        const src = resolve(projectRoot, 'dist/index.html')
        const dest = resolve(projectRoot, 'dist/200.html')
        if (existsSync(src)) copyFileSync(src, dest)
      }
    }
  ],
  build: {
    // Lift the 500kb warning slightly — the root index + biggest lazy chunks can be ~550kb.
    chunkSizeWarningLimit: 600,
    rolldownOptions: {
      output: {
        // Rolldown wants a function form of manualChunks.
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('@supabase')) return 'supabase'
            if (id.includes('fuse.js')) return 'fuse'
            if (id.includes('zustand')) return 'zustand'
            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('/react-router') ||
              id.includes('/scheduler/')
            ) {
              return 'react-vendor'
            }
          }
        },
      },
    },
  },
})
