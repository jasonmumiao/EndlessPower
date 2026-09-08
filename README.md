# EndlessPower（v2）- 充电桩实时查询地图

## ✨ 功能

- **地图显示**：MapLibre + CARTO 矢量底图，支持 **3D 建筑**（立体楼块）
- **中国坐标纠偏**：可选 GCJ-02 ↔ WGS84 转换，确保点位与矢量底图对齐
- **充电桩查询**：附近充电站、状态色彩区分、防重叠偏移、硬编码位置覆盖
- **搜索与收藏**：模糊搜索 + 本地持久化收藏/置顶
- **插座监控**：功率曲线、费用/电量统计、轮询间隔、Wake Lock + 静音音频保活
- **PWA**：离线缓存、更新提示、安装提示、深浅色主题

## 🧱 技术栈

- React 19 + TypeScript + Vite 7
- HeroUI v3：`@heroui/react` + `@heroui/styles`
- MapLibre GL JS
- Zustand
- Cloudflare Workers（静态资源 + 访问者计数 WebSocket）
- Playwright（E2E）

> 说明：项目不依赖 Tailwind 做 UI 开发，但 HeroUI v3 的样式构建仍需要 Tailwind 作为构建依赖。

## 🚀 开发

```bash
npm install
npm run dev
```

## 🧪 测试

```bash
npm test
```

## 📦 构建 & 部署（Cloudflare）

```bash
npm run build
```

> Cloudflare 的构建环境目前使用 `npm@10`，它在安装 `wrangler`（依赖 `workerd`）时会触发 `Invalid Version` 的已知问题。
> 因此本项目不再把 `wrangler` 放进依赖里；使用 Cloudflare 的 Git 集成/控制台发布即可。
> 另外建议在 Cloudflare 项目环境变量里设置 `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`，避免安装依赖时下载浏览器（构建不需要跑 E2E）。
>
> 如果你需要本地手动发布，请自行安装 `wrangler` CLI（建议使用 `npm@11+` 或 `pnpm`），然后运行：
> `wrangler deploy --env dev` / `wrangler deploy --env production`。

## 🔧 环境变量

- `VITE_MAP_STYLE`：覆盖地图样式 URL（用于 E2E / 自定义底图）
