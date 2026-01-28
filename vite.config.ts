import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [react()],
  // GitHub Pages 部署時設定 base URL
  // 本地開發: base = '/'
  // GitHub Pages: base = '/your-repo-name/'
  // 可透過環境變數 VITE_BASE_URL 覆蓋，或在 build 時使用 --base 參數
  base: process.env.VITE_BASE_URL || '/',
  assetsInclude: ['**/*.glb', '**/*.gltf', '**/*.mp4'], // Tell Vite to treat .glb and .gltf files as assets
  build: {
    // 確保資源路徑正確
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        // 保持資源檔名可讀性
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      }
    }
  },
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
}))
