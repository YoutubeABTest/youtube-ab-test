import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react( )],
  define: { 'process.env': process.env },
  envPrefix: 'VITE_',
  build: { outDir: 'dist', sourcemap: true },
  server: { port: 3000, open: true }
})
