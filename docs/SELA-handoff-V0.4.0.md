# SELA-handoff — RadOncQA V0.4.0

> 第一份正式交接文件（核心可用里程碑）。給下一個 session 的 Claude 或任何接手者。
> 日常工作上下文以專案內 `CLAUDE.md` 為準；本文件是里程碑快照。

---

## 一、這是什麼、為什麼存在

**RadOncQA** = 彰濱秀傳放射腫瘤科 QA 資料庫的 Web 重寫版。前身是 Flet 桌面版 V4.0（Python + SQLite，已淘汰）。

改寫動機（依重要性）：
1. **免安裝**——exe 打包（PyInstaller）因防毒誤判與反覆失敗被放棄
2. **可發給其他放腫科**——開網址就能用
3. **病患資料硬性不上雲**——所有記錄存瀏覽器 IndexedDB，雲端零儲存
4. **治療室斷網也要能用**——離線優先（PWA 尚未做，見待辦）

## 二、架構鐵則（動手前必讀）

1. **所有記錄在地端 IndexedDB，雲端零儲存。** Railway 只託管靜態前端。
2. **敏感度由型別寫死**：`src/db/database.ts` 的 `SENSITIVITY`。Plan Issue（病患相關）永遠 `syncable: false`。
3. **未來任何同步/上傳只能走 `getSyncableRecords()`**，禁止繞過直接 `db.records.toArray()` 上傳。
4. **運算邏輯放前端 `src/logic/`**（使用者已拍板方案乙：離線全功能優於藏公式；發佈時混淆）。
5. 自由文字欄位 UI 已有「勿填可識別病患資訊」警語，不可移除。

## 三、版本與交付規則（SELA Starter Kit）

- 雙 zip：`RadOncQA VX.Y.Z.zip`（部署版，無 dist，給 Git Pusher → Railway 雲端 build）+ `VX.Y.Z-source.zip`（含 dist 救命備份）
- 每版全綠才打包：`npx tsc --noEmit` → `npm run build` → serve 冒煙 → 無 console.log/TODO
- Git Pusher 匯入會清空目標資料夾 → **每批必須是完整可部署專案，不能只給 patch**
- Railway：nixpacks 自動 `npm install → npm run build → npm run start`；serve 綁 0.0.0.0 吃 $PORT；**不需任何環境變數**
- 中文輸出不可出現亂碼（bundle 若亂碼用 ftfy 修）

## 四、目前功能（V0.4.0）

| 功能 | 狀態 | 位置 |
|------|------|------|
| 六型別 CRUD（日/月/年品保、機器處理、Plan Issue、停機事件）| | RecordForm / DetailPanel / CardList |
| 型別專屬欄位（照 V4.0）| | `src/typeMeta.ts` 定義 |
| 停機四時間 + 跨日 + 時長（照搬 V4.0，含跨半夜 +24h）| | `src/logic/downtime.ts`（10 測試過）|
| 篩選（分頁/年/機器/即時關鍵字）| | `src/db/crud.ts` listRecords |
| 進階搜尋（類型多選/日期區間/執行人/機器/標籤/內容關鍵字）| | crud.ts advancedSearch + AdvancedSearchDialog |
| 到期提醒（QA_SCHEDULE 1/30/365 天，未執行=999）| | `src/logic/reminder.ts`（6 測試過）|
| 響應式（窄=單欄+貼底表單；寬=max-width 1240 置中）| | styles.css |
| 自製 TimeInput（禁原生 time input）| | components/TimeInput.tsx |

**尚未做（依優先序）**：統計儀表板 → PDF/Excel 匯出（中文字型內嵌是地雷）→ 匯入/備份/還原/設定（主檔管理）→ PWA（SW 只快取 GET、外部域名放行）→ V1.0.0。

## 五、V4.0 對照（照舊移植的依據）

- 原始碼 bundle 在專案知識庫：`放腫_QA_管理系統_bundle_20260112_1231.txt`（讀取需 ftfy 修亂碼）
- 已照搬：欄位定義（`_build_dynamic_fields`）、時長計算（`calculate_downtime_minutes`）、提醒（`get_overdue_qa` + `QA_SCHEDULE`）、搜尋條件集（`search_cards`）、型別色
- 刻意不照舊：詳情改點擊滑出（原常駐右欄）、底部列低頻收「⋯更多」、即時關鍵字（原 modal）、V4.0 品保無 pass/fail 故未加
- 附件功能 V4.0 有、Web 版尚未移植（IndexedDB 存 Blob 可行，排在設定批之後評估）

## 六、使用者工作習慣

- 分批小步交付，每批可跑可部署；大批次逐檔確認
- 提問要具體、選項式（甲/乙），拍板後才動工
- Windows 本機測試：免安裝 ZIP 版 Node（`C:\Users\cbrto\nodejs`，可能需 `set PATH=C:\Users\cbrto\nodejs;%PATH%`）
- 部署流程：Git Pusher 推 main → Railway 自動 build

## 七、一句話

V0.4.0 = 核心日常功能到齊的第一個可用版；資料層防線（Plan Issue 永不離地端）從 V0.1.0 起就寫死；接下來按 CLAUDE.md 第七章順序往 V1.0.0 推。
