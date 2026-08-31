import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // GitHub Pages project sites serve from /<repo-name>/, not the domain root
  base: '/Tech-Driven-Logistics/',
  build: {
    rollupOptions: {
      output: {
        // Keep the rarely-changing 3D/animation runtime in its own cacheable
        // chunk, separate from our own model code which changes more often.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('three') || id.includes('@react-three')) return 'vendor-three'
          if (id.includes('framer-motion')) return 'vendor-motion'
        },
      },
    },
  },
})
