import Dexie, { type Table } from 'dexie'

/**
 * RadOncQA 本地資料層（IndexedDB / Dexie）
 *
 * 架構鐵則：
 * 1. 所有記錄一律存在地端 IndexedDB，雲端零儲存。
 * 2. 敏感度「由型別決定、不可由單筆記錄覆寫」 — 寫死在資料層。
 *    Plan Issue（含病患治療計畫資訊）永遠 syncable=false，永不離開地端。
 * 3. 任何未來的同步 / 上傳邏輯，一律只能透過 getSyncableRecords() 取資料，
 *    禁止直接 db.records.toArray() 後上傳 —— 這是病患資料外洩的唯一現實破口。
 */

// ── 六種記錄類型 ───────────────────────────────────────────────
export type RecordType =
  | 'daily' // 日品保
  | 'monthly' // 月品保
  | 'yearly' // 年品保
  | 'machine' // 機器處理
  | 'plan_issue' // Plan Issue（病患相關）
  | 'downtime' // 停機事件

// ── 敏感度：型別 → 是否可同步（單一真相，不可被記錄覆寫）─────────
export const SENSITIVITY: Record<
  RecordType,
  { label: string; syncable: boolean }
> = {
  daily: { label: '日品保', syncable: true },
  monthly: { label: '月品保', syncable: true },
  yearly: { label: '年品保', syncable: true },
  machine: { label: '機器處理', syncable: true },
  plan_issue: { label: 'Plan Issue', syncable: false }, // ← 病患相關，永不同步
  downtime: { label: '停機事件', syncable: true },
}

export const RECORD_TYPES = Object.keys(SENSITIVITY) as RecordType[]

// ── 記錄結構（V0.1.0 先放共通骨架，型別專屬欄位之後批次擴充）──────
export interface QARecord {
  id?: number
  type: RecordType
  machine: string // 機器
  date: string // YYYY-MM-DD（主要日期，用於排序 / 篩選）
  operator?: string // 執行人
  result?: string // pass / fail 等（由前端運算填入）
  tags?: string[] // 標籤

  // 停機事件專用（跨日：存完整 datetime，不是只有時:分）
  downtimeStart?: string // YYYY-MM-DD HH:MM
  downtimeEnd?: string // YYYY-MM-DD HH:MM

  // 自由文字欄位 ── 注意：請勿填入可識別病患之資訊（UI 會加提示）
  problem?: string // 問題描述
  solution?: string // 解決方法
  notes?: string // 備註（品保用）

  // 停機事件（V0.3.1 完整時間機制）
  downtimeReason?: string // 停機原因
  affectedPatients?: number // 影響人數
  occurTime?: string // 發生時間 "HH:MM"（當天格式）
  notifyTime?: string // 通報時間 "HH:MM"
  arriveTime?: string // 到場時間 "HH:MM"
  fixedTime?: string // 修復時間 "HH:MM"
  // 跨日格式（優先於當天格式）：downtimeStart / downtimeEnd 於上方定義（"YYYY-MM-DD HH:MM"）

  data?: Record<string, unknown> // 各型別專屬結構化欄位（彈性容器，保留給未來時間欄位）
  attachments?: number[] // 附件 id（附件 store 之後批次補）

  createdAt: string
  updatedAt: string
}

// ── 主檔（執行人 / 機器 / 標籤 / 停機原因）─────────────────────
export interface MasterItem {
  id?: number
  category: 'operator' | 'machine' | 'tag' | 'downtime_reason'
  value: string
  order?: number
}

// ── 設定（報告標題、管理者參數等）────────────────────────────
export interface AppSetting {
  key: string
  value: unknown
}

// ── Dexie 資料庫 ──────────────────────────────────────────────
export class RadOncQADB extends Dexie {
  records!: Table<QARecord, number>
  master!: Table<MasterItem, number>
  settings!: Table<AppSetting, string>

  constructor() {
    super('RadOncQA')
    // 注意（Dexie 鐵律）：每次升版，version().stores() 必須列出「所有要保留的 table」，
    //   未列出的 table 會被自動刪除。新增 table 或改索引才動 version()。
    this.version(1).stores({
      records: '++id, type, machine, date, updatedAt',
      master: '++id, category, value',
      settings: 'key',
    })
  }
}

export const db = new RadOncQADB()

/**
 * 唯一的「可同步資料」入口。病患型別在此被過濾掉。
 * 未來任何同步 / 上傳功能只能呼叫這支 —— 不要繞過它直接查 records table。
 */
export async function getSyncableRecords(): Promise<QARecord[]> {
  const all = await db.records.toArray()
  return all.filter((r) => SENSITIVITY[r.type]?.syncable === true)
}

/**
 * 部署自測用：開啟 DB、回報版本與各型別筆數。
 * 注意：不要把 seed 包進 transaction（Dexie 坑：seed 失敗會被誤判 schema 損壞 → 無限 reload）。
 */
export async function dbHealthCheck() {
  await db.open()
  const counts = {} as Record<RecordType, number>
  for (const t of RECORD_TYPES) {
    counts[t] = await db.records.where('type').equals(t).count()
  }
  return {
    name: db.name,
    version: db.verno,
    tables: db.tables.map((t) => t.name),
    counts,
  }
}
