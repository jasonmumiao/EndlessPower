import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { execSync } from 'node:child_process'

const packageJson = JSON.parse(readFileSync(resolve('package.json'), 'utf8')) as { version: string }
const version = packageJson.version
const isAutomatedRun = Boolean(process.env.PLAYWRIGHT) || Boolean(process.env.CI)
const enablePwaInDev = process.env.VITE_PWA_DEV === '1' && !isAutomatedRun

function getGitCommit(): string {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return 'unknown'
  }
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __GIT_COMMIT__: JSON.stringify(getGitCommit())
  },
  resolve: {
    alias: {
      // Use the prebuilt CSS to avoid unsupported `oklch()` / `color-mix()` in some WebViews.
      '@heroui/styles': resolve('node_modules/@heroui/styles/dist/heroui.min.css')
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.svg', 'mask-icon.svg', 'offline.html', 'map.jpg'],
      manifest: {
        name: 'EndlessPower 充电桩查询',
        short_name: 'EndlessPower',
        description: '充电桩实时查询地图，支持收藏、搜索与插座监控。',
        version,
        theme_color: '#0b0f18',
        background_color: '#0b0f18',
        display: 'fullscreen',
        display_override: ['fullscreen', 'standalone', 'minimal-ui'],
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        lang: 'zh-CN',
        categories: ['utilities', 'travel', 'navigation'],
        icons: [
          { src: 'pwa-192x192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: 'pwa-512x512.svg', sizes: '512x512', type: 'image/svg+xml' },
          { src: 'pwa-512x512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' }
        ]
      },
      workbox: {
        // SPA 路由回退必须指向主入口；`offline.html` 仅用于离线页面
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/offline\.html$/],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg}']
      },
      // 默认不开启 Dev SW，避免出现“本地开发直接进入离线页/缓存异常”的问题；需要时可 `VITE_PWA_DEV=1 npm run dev`
      devOptions: { enabled: enablePwaInDev }
    })
  ],
  server: {
    port: 3000,
    open: !isAutomatedRun
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
