<div align="center">
 <img src="public/sela.svg" width="120" alt="SELA" />
 <h1>RadOncQA</h1>
 <p>放射腫瘤科 QA 資料庫 · Web 版（離線優先，資料留地端）</p>
</div>

## 這是什麼

彰濱秀傳放射腫瘤科 QA 資料庫的 Web 重寫版。前身為 Flet 桌面版 V4.0，
改成 React + IndexedDB 純前端，免安裝、可發給不同放腫科、治療室斷網也能用。

- **所有記錄存在瀏覽器本地（IndexedDB）**，雲端零儲存
- **Plan Issue 等病患相關記錄寫死於資料層，永不離開地端**
- 雲端（Railway）只託管前端框架，未來授權驗證再加

## 技術棧

React + TypeScript + Vite · Dexie（IndexedDB）· 部署於 Railway（雲端 build）

## 開發

**Windows 一鍵啟動：雙擊 `start-dev.bat`**（自動找 Node、自動 npm install、自動開瀏覽器）。
建置驗證雙擊 `build-check.bat`（與 Railway 相同流程）。

手動方式：

```bash
npm install
npm run dev # http://localhost:5173
```

## 建置

```bash
npm run build # tsc 型別檢查 + vite build → dist/
npm run preview # 本地預覽 build 結果
```

## 部署（Railway）

純靜態前端，**不需要任何環境變數**。推上 GitHub 後 Railway 自動：
`npm install → npm run build → npm run start`（serve 端出 `dist/`，綁 `$PORT`）。

## 版本

V1.1.0 — UI 現代化（大卡片、黏性控制區、手機新增鈕、觸控目標全面放大）

功能全覽：六型別 CRUD（含停機四時間/跨日/時長）、篩選與進階搜尋、到期提醒（週期可調）、
統計儀表板（含 MTTR）、Excel 匯出（報告式/可再匯入資料式）、Excel 匯入（重複策略可選）、
PDF 匯出（列印方案）、備份/還原（JSON 全庫）、設定（四類主檔）、PWA 離線（治療室斷網可用）

---

<div align="center"><sub>GitHub: sela1227</sub></div>
