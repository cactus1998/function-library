/// <reference types="vitest/config" />
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  // 部署在 kentfolio.dev/function-library/（portfolio-dist 的子資料夾）
  base: '/function-library/',
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
})
