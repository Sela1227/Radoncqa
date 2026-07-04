# SELA-handoff — RadOncQA V1.0.0（第一個正式完整版）

> 里程碑快照。日常工作上下文以專案內 CLAUDE.md 為準（含九條種子坑與升版清單）。

## 一、定位與鐵則

RadOncQA = 彰濱秀傳放腫科 QA 資料庫 Web 版（前身 Flet V4.0 已淘汰）。免安裝、可發給其他放腫科、治療室斷網可用。

**不可動搖的架構鐵則：**
1. 所有記錄在地端 IndexedDB（Dexie），雲端零儲存；Railway 只託管靜態前端
2. 敏感度由型別寫死（`SENSITIVITY`），Plan Issue 永遠 `syncable:false`
3. 未來任何同步只能走 `getSyncableRecords()`
4. 運算全在前端 `src/logic/`（方案乙：離線全功能 > 藏公式）
5. 自由文字欄「勿填可識別病患資訊」警語不可移除

## 二、V1.0.0 功能全覽

六型別 CRUD（停機含四時間/跨日/時長，V4.0 邏輯照搬＋跨半夜 +24h）｜篩選（分頁/年/機器/即時關鍵字）＋進階搜尋（七條件）｜到期提醒（QA_SCHEDULE 1/30/365，設定可調）｜統計儀表板（含 MTTR；已修 V4.0 跨日=0 統計 bug）｜Excel 匯出（報告式＋16 欄可再匯入資料式）｜Excel 匯入（14 欄相容、驗證、重複策略 UI 選）｜PDF（列印方案，重用 Excel builder）｜備份/還原（JSON 全庫、六重驗證、二次確認）｜設定五分頁（提醒週期＋四類主檔）｜PWA 離線（sw.js 嚴守 P3）＋離線指示 chip。

回歸測試 38/38（downtime 10、reminder 7、stats 5、excelExport 4、excelImport 6、backup 6）。

## 三、升版操作重點

- 版本號四處同步：package.json / src/App.tsx VERSION / README / **public/sw.js CACHE 名**
- 全綠才打包：tsc → build → serve 冒煙 → grep debug/亂碼 → 回歸測試
- 雙 zip 交付（部署版無 dist；-source 含 dist）；Git Pusher 清資料夾 → 只交完整專案
- Railway：nixpacks 自動 install/build/start，無環境變數
- Windows：start-dev.bat 一鍵（自動找 Node/裝依賴/清 .vite/開瀏覽器）

## 四、待辦（V1.0.0 之後）

1. 附件（V1.1.0 候選；IndexedDB Blob，注意備份檔膨脹）
2. 授權碼 API（發他院前；只收碼＋院代號）
3. 更強混淆（如需）

## 五、給接手者的一句話

九條種子坑（CLAUDE.md 第四章）都是血淚，動手前先讀；照舊移植一律先挖 V4.0 bundle（ftfy 修亂碼），刻意差異必記文件。
