# WeatherNet 天氣網站

Angular 19 天氣預報網站，使用中央氣象署 F-D0047-065 資料。

## 執行

```sh
npm ci
npm start
```

前端由 GitHub Pages 部署，天氣資料透過 Cloudflare Worker 的 /api/weather 取得。
Worker 原始碼位於 backend/worker.js。後端僅接受固定資料集的 GET 請求，並快取 5 分鐘。
本機預覽支援 http://localhost:4200。

## 金鑰

CWA_API_KEY 僅儲存在 Cloudflare Worker 的 secret binding。
.dev.vars 是被 Git 忽略的本機備份，請勿上傳或分享。
請勿將金鑰放回 Angular 程式、前端環境變數或 GitHub Actions 建置產物。
更新金鑰時，在 Cloudflare 控制台的 weathernet-api Worker 更新 CWA_API_KEY secret。

## 部署

推送 main 分支會透過 GitHub Actions 建置並發布 GitHub Pages。
後端程式變更需另行部署到 Cloudflare Worker weathernet-api，並保留 CWA_API_KEY secret。
網站：https://kkop345po.github.io/WeatherNet/
後端：https://weathernet-api.kkop345po.workers.dev/api/weather
