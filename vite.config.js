import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import fs from 'fs'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // proxy: {
    //   '/api': {
    //     target: 'http://localhost:5000',
    //     changeOrigin: true,
    //   },
    // },
    https: {
      key: fs.readFileSync(path.resolve(__dirname, '../cert/server_key.pem')),
      cert: fs.readFileSync(path.resolve(__dirname, '../cert/server_cert.pem')),
    },
    host: '0.0.0.0',
    port: 5173,
  },
})
