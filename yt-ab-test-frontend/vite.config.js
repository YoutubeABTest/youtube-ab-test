import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react( )],
  define: {
    'process.env.REACT_APP_API_BASE_URL': JSON.stringify('https://2bcge0e0yc.execute-api.us-east-1.amazonaws.com/prod')
  }
})
