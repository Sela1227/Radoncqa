# CLAUDE.md — RadOncQA

> **這份是給下次 Claude 看的工作上下文，不是文件。** 讀完能不能直接動手是唯一標準。
> 每升一版至少更新三處：踩過的坑、版本歷程、下版候選工作。

---

## 〇、當前狀態

- **版本：** V1.1.0
- **狀態：** **第一個正式完整版。** 全功能 + PWA 離線。38 條回歸全過。附件功能為 V1.1.0 候選（V4.0 有、Web 未移植）。
- **一句話定位：** 放腫科 QA 資料庫的 Web 重寫版。離線優先、資料留地端、可發給不同放腫科。前身 Flet 桌面 V4.0。
- **技術棧：** React 18 + TypeScript（strict）+ Vite · Dexie（IndexedDB）· Railway 雲端 build
- **入口點：** `src/main.tsx` → `src/App.tsx`

---

## 一、技術棧決策（為什麼這樣選）

| 選擇 | 替代品 | 選這個的理由 |
|------|--------|------------|
| React + TS + Vite | Flet Web / 純 HTML | 六型別卡片+統計+匯出複雜度高需 SPA；Flet Web 與「地端 IndexedDB+前端運算」模型相衝；過去 3 專案用過（Patient Follow-up 同型）|
| Dexie（IndexedDB）| localStorage | 結構化六型別記錄、需索引查詢；localStorage 無法勝任 |
| 純前端 + 地端儲存 | 後端 + DB | **病患資料硬性不上雲**；雲端只託管框架（決策樹「個資→純前端 PWA」路徑）|
| Railway 雲端 build | GitHub Pages | SELA 指定 Railway；靜態託管，未來授權 API 可同專案 |
| 北歐霧藍 #5A7A8B | SELA 橘 | 醫療系統長時間看不疲勞（Kit colors.md 預設）|

**Kit 核心美學鐵律（V1.0.1 教訓）：不用 emoji。** UI 用文字或 SVG icon；文件與 CLI 只允許基礎符號 ✓ ✗ △ ✕ ⋯ !。這是 SELA 核心思想（sela-philosophy 〇.10），不是偏好。

> 改技術棧 = 大版本升級。Flet 桌面 V4.0 是淘汰前身，細節不再追。

---

## 二、業務對映表

（V0.1.0 暫無 — 結構還在變。待 CRUD/運算層成形、同概念散在 3+ 檔時立表。）

---

## 三、關鍵檔案路徑

| 想改什麼 | 動哪些檔 |
|---------|---------|
| 資料結構 / 六型別 / 敏感度 | `src/db/database.ts` |
| 查詢 / 篩選 / 新增 / 刪除 | `src/db/crud.ts` |
| 配色 | `src/styles.css` 的 `:root` CSS 變數 |
| 整體版面 / 響應式 | `src/styles.css` + `src/App.tsx` |
| 分頁 / 篩選列 / 卡片 / 底部列 / 表單 / 詳情 / 時間輸入 | `src/components/*.tsx` |
| 停機時長計算（照搬 V4.0）| `src/logic/downtime.ts` |
| 到期提醒邏輯（照搬 V4.0）| `src/logic/reminder.ts` |
| 統計運算（照搬 V4.0 + 跨日修正）| `src/logic/stats.ts` |
| Excel 匯出（AOA builder + 動態 xlsx）| `src/logic/excelExport.ts` |
| PDF 匯出（列印報告版面）| `src/components/PrintReport.tsx` + styles.css 的 @media print |
| 資料匯入解析（16/14 欄）| `src/logic/excelImport.ts` + `src/components/ImportDialog.tsx` |
| 備份/還原 | `src/logic/backup.ts`（parseBackup 純函式可測）|
| 設定（提醒週期/主檔）| `src/components/SettingsDialog.tsx` + crud.ts 的 master/setting 函式 |
| 進階搜尋條件 | `src/db/crud.ts` 的 advancedSearch |
| 型別顏色 / 機器必填 / 專屬欄位 | `src/typeMeta.ts` |
| Railway build / start | `nixpacks.toml` + `package.json` scripts |
| Windows 一鍵啟動 / 建置檢查 | `start-dev.bat` / `build-check.bat`（UTF-8+CRLF、chcp 65001；找 Node 順序：PATH → %USERPROFILE%\nodejs → C:\nodejs；以 node_modules\.pkg-snapshot 判斷是否重跑 install）|

---

## 四、踩過的坑（編號累積，永不重排）

> V0.1.0 種子坑：依 React/PWA/Dexie/Railway 從跨專案坑庫預埋。遇到時不是新坑，是「早就警告過沒預防」。

```
P1. Dexie 升版必列出所有 table
 - 症狀：升版後某些 table 的資料整個消失
 - 原因：version().stores() 未列出的 table 會被自動刪除
 - 做法：每次動 version()，stores() 列「所有要保留的 table」，不只列新增的

P2. Dexie seed 不要包在 transaction 裡
 - 症狀：首次載入無限 reload
 - 原因：seed 失敗被誤判為 schema 損壞（Patient Follow-up P2 慘案）
 - 做法：seed 用獨立 await，不包 db.transaction()

P3. Service Worker 只快取 GET、外部域名放行（PWA 化時會踩）
 - 症狀：未來接授權 API 時，SW 攔截 POST → TypeError 整個功能崩
 - 原因：SW 預設想快取所有請求
 - 做法：fetch handler 第一行 `if (e.request.method !== 'GET') return;`，
 第二道判 `url.origin !== self.location.origin` 直接放行

P4. 主題色有 N 處真相
 - 症狀：改色只改一處，其他地方殘留舊色
 - 原因：色值散在 CSS 變數 / index.html theme-color / 未來 manifest theme-color
 - 做法：改色同步這幾處（目前：styles.css `--primary` + index.html `meta theme-color`）

P5. Railway serve 必須綁 0.0.0.0 + 吃 $PORT
 - 症狀：Railway deploy 成功但網址打不開
 - 原因：serve 沒綁 0.0.0.0 或沒吃 Railway 注入的 $PORT
 - 做法：start = `serve -s dist -l ${PORT:-3000}`（serve 預設綁 0.0.0.0）

P6. source 帶 TS error 卻能 build 出 dist
 - 症狀：線上能跑但永遠改不動（Patient Follow-up P5 死局）
 - 原因：vite build 沒擋住 type error
 - 做法：build script 是 `tsc && vite build`，tsc 不過就不會 build

P7a. Python 寫中文檔案禁用 unicode_escape 技巧
 - 症狀：整檔中文變 mojibake（æ­¤åè½...）
 - 原因：str.encode() 預設 UTF-8，再 decode('unicode_escape') 會把位元組當 latin-1
 - 做法：中文/emoji 一律直接寫字面值；寫檔後 grep "æ\|ç\|å" 掃亂碼

P10. UI 與文件禁用 emoji（Kit 核心美學鐵律）
    - 症狀：整版 UI 按鈕/標題/提示帶 emoji，使用者指出違反 Kit 規範
    - 原因：開發時未讀到 sela-philosophy「不大量使用 emoji 是核心思想」一節
    - 做法：UI 用文字或 SVG icon；僅允許 ✓ ✗ △ ✕ ⋯ ! 基礎符號；
            每版打包前跑 emoji 掃描（regex U+1F000-1FAFF 等區段）

P9. 動態 import 的相依必須列入 optimizeDeps.include
 - 症狀：dev 模式點匯出跳「Failed to fetch dynamically imported module …/.vite/deps/xlsx.js」，
 且可能第一次成功、之後全失敗
 - 原因：僅動態 import 的套件不會在 Vite 啟動時預打包；首次點擊臨時打包會換 deps 雜湊，
 瀏覽器持舊網址抓不到
 - 做法：vite.config.ts 設 optimizeDeps.include: ['xlsx']（未來新增動態載入套件同理）；
 start-dev.bat 換版重裝時清 node_modules\.vite

P8. 列印報告必須 portal 到 .app 外
 - 症狀：匯出 PDF 完全空白
 - 原因：報告元件在 .app 內，@media print 的 .app{display:none} 連報告一起藏
 - 做法：createPortal(…, document.body)；並在 @media print 解除 html/body/#root
 的 height:100% 與 overflow 限制，避免多頁被截成一頁

P7. 雙版本交付互為保險
 - 症狀：失去 source 改不動，失去 dist 線上回不去
 - 做法：部署版（無後綴，含 source 給 Railway build）+ -source 備份版（含 dist 救命），兩份都存
```

---

## 五、煙霧測試（每次升版前必跑，全綠才打包）

```bash
# 型別檢查（必須無錯）
npx tsc --noEmit

# 建置（通過才能打包）
npm run build

# 找漏掉的 debug
grep -rn "console.log\|TODO\|FIXME" src/ || true
```

啟動測試：`npm run dev` → 開 localhost:5173，預期看到「前端建置 / 本地資料庫」兩個綠燈 + 六型別清單。

---

## 六、版本歷程（最近 6-10 版）

| 版本 | 重點 |
|------|------|
| V4.x（已淘汰，Flet 桌面）| 六型別 QA、SQLite 地端、PDF/Excel 匯出、停機跨日計算 — 改前累積邏輯來源 |
| V0.1.0 | Web 重寫初版骨架：React+TS+Vite+Dexie + Railway 雲端 build 鏈路 + 六型別 schema（病患型別寫死不可同步）|
| V0.2.0 | 響應式外殼：七分頁 + 篩選列（年/機器/即時關鍵字）+ 卡片列表 + 最小新增/刪除。底部列低頻功能收進「⋯ 更多」。提醒橫幅可關（佔位）。機器/執行人由既有記錄推導，未塞假資料。|
| V0.3.0 | 詳情面板（滑出）+ 編輯（RecordForm 共用 create/edit）+ 五型專屬欄位（品保:備註／機器處理·PlanIssue:問題+解法／停機:原因+影響人數）+ 卡片型別色（沿用 V4.0 藍綠橘灰黃紅）+ 空值隱藏。移除 V0.2.0 自行加的 pass/fail（V4.0 品保本無此欄）。|
| V0.3.1 | 停機事件完整時間機制：自製 TimeInput（時/分 select，禁原生 time input）、發生/通報/到場/修復四時間、跨日起訖 datetime、時長計算照搬 V4.0（跨日優先→負值 clamp 0；當天 occur→fixed 負值 +24h 跨半夜）。運算層立於 src/logic/downtime.ts，10 條單元測試全過。表單即時顯示時長；卡片/詳情顯示時長。|
| V0.4.0 | 進階搜尋（類型多選/日期區間/執行人/機器/標籤/內容關鍵字，照 V4.0 search_cards 條件集；搜尋中顯示結果指示列+清除鈕，分頁篩選暫停）+ 到期提醒真邏輯（QA_SCHEDULE 1/30/365 天，逾期=最後執行+週期<今天，未執行=999，6 條測試過，src/logic/reminder.ts）+ 寬螢幕收斂（內容 max-width 1240 置中）。第一份正式 handoff 隨版產出（docs/SELA-handoff-V0.4.0.md）。|
| V0.5.0 | 統計儀表板（modal，年度切換）：總覽數字（總筆數/停機次數/總時長/MTTR/影響人數）+ 各型筆數 + 月度 CSS 長條 + 各機器表 + 停機原因分布 + 執行人統計。運算移植 V4.0 於 src/logic/stats.ts（5 測試過）。**刻意修正 V4.0 bug**：V4.0 統計只算 occur/fixed 當天格式、跨日停機統計成 0；Web 版統計一律走 calculateDowntimeMinutes，與卡片顯示一致。無圖表函式庫（CSS bars），bundle 保持輕。隨版加入 start-dev.bat / build-check.bat（Windows 一鍵啟動）。|
| V0.6.0 | Excel 匯出（SheetJS xlsx 0.18.5）：報告式（摘要+各型分頁，欄位照 V4.0 excel_exporter，年度跟主畫面年篩選）+ 資料式（單張 16 欄可再匯入，未來匯入批對接）。**xlsx 動態 import**（點匯出才載 429KB chunk，首屏維持 272KB）。刻意差異：品保分頁補機器欄、資料式尾補跨日開始/結束兩欄（V4.0 缺會丟跨日資訊）、SheetJS CE 無儲存格樣式（表頭純文字）。AOA builder 純函式 7 測試過（累計 28）。|
| V0.7.0 | PDF 匯出＝瀏覽器列印方案：PrintReport 元件重用 Excel AOA builder（欄位與 Excel 報告一致）→ window.print() → 使用者選「另存為 PDF」。@media print 隱藏 app 只留報告、@page A4、break-inside 防表格截斷。零依賴零中文字型問題。取捨：頁碼交給瀏覽器頁首頁尾（Chrome 不支援 CSS margin box 內容），非 V4.0 自繪頁碼；若未來需精準頁碼/頁首再評估 pdfmake+字型子集。|
| V0.7.1 | 修 bug：V0.7.0 匯出 PDF 完全空白。主因 PrintReport 放在 .app 內、列印 CSS 的 .app{display:none} 連報告一起藏。改 createPortal 掛 document.body；並在 @media print 解除 html/body/#root 的 height:100%/overflow（多頁截斷預防）。|
| V0.8.0 | 資料匯入（對接 16 欄資料式）：表頭名稱對欄（14 欄舊檔相容）、類型標籤反查、驗證（型別/日期/必填機器/時間/跨日成對/影響人數）、重複判斷=型別+日期+機器、預覽顯示可匯入/重複/錯誤三數＋錯誤明細，重複策略由使用者當場勾選（跳過或一起匯入），bulkAdd 寫入。解析器純函式 6 測試過（累計 34）。＋PDF 排版美化：層次靠線條非底色（背景圖形未勾也好看）、封面主題色分隔線、表頭雙線、摘要置中數量靠右、position:fixed 頁尾逐頁重複。|
| V0.8.1 | 診斷版：使用者回報「點匯出沒反應」。async 匯出（動態 import xlsx）失敗時原本無聲吞錯 → 兩個 Excel 匯出 handler 補 .catch(alert) 讓錯誤可見並附 start-dev.bat 重跑指引。待使用者回報 alert 內容定位根因（最可能：node_modules 缺 xlsx）。|
| V0.8.2 | 根因修復：alert 揭露為 Vite dev 動態 import 快取雜湊失效（P9）。vite.config.ts 加 optimizeDeps.include:['xlsx']；start-dev.bat 換版時清 node_modules\.vite。|
| V0.9.0 | 備份（全庫 JSON：records+master+settings+中繼資料，下載 backup_radoncqa_時戳.json）／還原（parseBackup 六重驗證＋二次確認＋transaction 整庫覆蓋、去 id 重配）／設定五分頁（提醒週期天數可改存 settings['qa_schedule'] 覆寫 QA_SCHEDULE；執行人/機器/停機原因/標籤主檔 CRUD）。表單與進階搜尋下拉改吃「主檔優先＋記錄推導去重」合併清單；停機原因欄加 datalist。BottomBar 佔位 alert 全數移除。驗證 6 測試過（累計 40）。|
| V0.10.0（併入 V1.0.0 交付）| PWA：manifest.webmanifest（zh-Hant/standalone/192+512+apple-touch 圖示，sharp 從 sela.svg 產出後即移除依賴）＋手寫 sw.js 嚴守 P3（只 GET／外域放行／快取名含版本 radoncqa-v1.0.0）；導覽 network-first 退快取殼、資產 cache-first 回填；只在 PROD 註冊（dev 會干擾 HMR）。|
| V1.0.0 | 收尾：離線指示 chip（navigator.onLine）＋全邏輯回歸 38/38 過（downtime/reminder 含週期覆寫/stats/excelExport/excelImport/backup）＋PWA 檔案就位驗證（sw/manifest/icons HTTP 200）＋正式 handoff docs/SELA-handoff-V1.0.0.md。**升版注意：版本號現在有四處**——package.json、App.tsx VERSION、README、public/sw.js 的 CACHE 名（P4 延伸）。|
| V1.0.1 | 合規修正：全 UI 與文件清除 emoji（Kit 核心美學鐵律，開發時漏讀）。按鈕改純文字、警示改「注意：」、狀態符號只留 ✓ ✕；種子坑 P10 記錄。|
| V1.1.0 | UI 現代化（設計方向：工具的美感=操作手感）：卡片 350px 起跳/內距 16-18/圓角 14/懸停浮起/可鍵盤操作（Tab+Enter）；黏性控制區（分頁+篩選捲動常駐）；窄螢幕右下固定「＋ 新增」拇指鈕（篩選列新增鈕同時隱藏）；觸控目標全面 ≥42px（按鈕/輸入/分頁藥丸）；空狀態改邀請卡（虛線框+直接新增鈕）；焦點環 :focus-visible；文字對比加深（--text #33424F）、新增 --primary-soft/--shadow token；日期 tabular-nums。北歐霧藍與無 emoji 鐵律不動。|

---

## 七、下版候選工作（按優先序）

1. **附件功能（V1.1.0 候選）** — V4.0 有、Web 未移植；IndexedDB 存 Blob 可行，需評估容量與備份檔膨脹
2. 授權碼驗證（極輕雲端 API，只收授權碼＋醫院代號，不碰記錄）— 發給其他醫院前才需要
3. 程式碼混淆（發佈其他院區前）— vite build 已 minify；如需更強再評估 obfuscator
2. 進階搜尋（多條件）+ 提醒橫幅實作（品保到期）+ 即時關鍵字精修
3. 統計儀表板（前端運算）
4. PDF / Excel 匯出（中文字型內嵌是地雷區）+ 資料匯入
5. 備份 / 還原 / 設定（含機器、執行人、標籤主檔管理）
6. PWA 化（Service Worker + manifest + 離線快取，注意預埋的 P3）
7. → 以上到齊即 V1.0.0（第一個正式可用版）

---

## 八、升版必讀

### V0.1.0 部署動作（Railway 首次）

- [ ] 用 Git Pusher 推 main（RadOncQA 專案槽）
- [ ] Railway 新建專案 → 連到該 GitHub repo → 選 `main` 分支
- [ ] Railway 自動 Nixpacks：`npm install → npm run build → npm run start`
- [ ] **等 Railway build 完成（約 2-4 分鐘）**
- [ ] 開 Railway 給的網址，確認看到「RadOncQA V0.1.0」+ 兩個綠燈
- 注意：純靜態前端，**不需任何環境變數**。`MISE_PYTHON_GITHUB_ATTESTATIONS` 那條是 Python 專案才要，這裡用不到。

---

## 九、一句話總結

V1.1.0 完成 UI 現代化（大卡片＋黏性控制區＋手機拇指鈕＋42px 觸控目標）。V1.0.0 = 第一個正式完整版：全功能（六型別 CRUD/搜尋/提醒/統計/匯出匯入/備份還原/設定）+ PWA 離線 + 38 條回歸全過；資料層防線（Plan Issue 永不離地端）自 V0.1.0 寫死至今。升版記得同步四處版本號（含 sw.js CACHE）。
