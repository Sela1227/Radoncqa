import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Railway 以根路徑託管 → base 用 '/'
export default defineConfig({
  plugins: [react()],
  base: '/',
  optimizeDeps: {
    // xlsx 僅被動態 import（點匯出才載），不列入的話 Vite dev 會在第一次點擊時
    // 臨時預打包並更換 deps 快取雜湊 → 瀏覽器持舊網址 → Failed to fetch（P9）。
    // 啟動時就預打包，動態載入永遠命中。
    include: ['xlsx'],
  },
})
