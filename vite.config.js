import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'


// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    viteSingleFile()
  ],
  esbuild: {
    pure: ['console.log'],
  },
  server: {
    watch: {
      usePolling: true
    }
  }
})