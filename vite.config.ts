import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('/three/')) return 'vendor-three'
          if (id.includes('@react-three') || id.includes('postprocessing')) return 'vendor-r3f'
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('framer-motion') || id.includes('zustand')) {
            return 'vendor-react'
          }
          return undefined
        },
      },
    },
  },
  server: {
    port: 5183,
    strictPort: true,
  },
})
