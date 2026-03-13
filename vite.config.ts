import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  optimizeDeps: {
    include: ['html2canvas', 'jspdf', 'pptxgenjs'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          recharts: ['recharts'],
          stats: ['simple-statistics'],
          vendor: ['react', 'react-dom', 'react-router-dom'],
          grid: ['react-grid-layout'],
        },
      },
    },
  },
})
