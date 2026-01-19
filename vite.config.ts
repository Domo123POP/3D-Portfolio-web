import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.glb', '**/*.gltf', '**/*.mp4'], // Tell Vite to treat .glb and .gltf files as assets
  server: {
    host: '0.0.0.0', // 加入這一行：允許使用 IP 連線
    port: 80,      // (選用) 固定連接埠，避免每次都不一樣
    cors: {
      origin: 'https://domo.style',
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
      credentials: true,
    },
    allowedHosts: ['domo.style'], // 允許 domo.style 存取
  }
})
