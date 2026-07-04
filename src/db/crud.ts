import { db, type QARecord, type RecordType } from './database'

export type TabKey = RecordType | 'overview'

export interface RecordFilter {
  tab: TabKey
  year: string // 'all' | 'YYYY'
  machine: string // 'all' | name
  keyword: string
}

export async function listRecords(f: RecordFilter): Promise<QARecord[]> {
  let arr = await db.records.toArray()

  if (f.tab !== 'overview') arr = arr.filter((r) => r.type === f.tab)
  if (f.year !== 'all') arr = arr.filter((r) => (r.date || '').startsWith(f.year))
  if (f.machine !== 'all') arr = arr.filter((r) => r.machine === f.machine)

  const k = f.keyword.trim().toLowerCase()
  if (k) {
    arr = arr.filter((r) =>
      [r.machine, r.operator, r.result, r.problem, r.solution, ...(r.tags ?? [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(k),
    )
  }

  arr.sort(
    (a, b) =>
      (b.date || '').localeCompare(a.date || '') ||
      (b.updatedAt || '').localeCompare(a.updatedAt || ''),
  )
  return arr
}

export type NewRecord = Omit<QARecord, 'id' | 'createdAt' | 'updatedAt'>

export async function addRecord(r: NewRecord): Promise<number> {
  const now = new Date().toISOString()
  return db.records.add({ ...r, createdAt: now, updatedAt: now })
}

export async function deleteRecord(id: number): Promise<void> {
  await db.records.delete(id)
}

export async function updateRecord(
  id: number,
  patch: Partial<QARecord>,
): Promise<void> {
  await db.records.update(id, { ...patch, updatedAt: new Date().toISOString() })
}

// 機器 / 執行人由既有記錄推導（不塞假資料；主檔管理留設定批次）
export async function distinctMachines(): Promise<string[]> {
  const arr = await db.records.toArray()
  return [...new Set(arr.map((r) => r.machine).filter(Boolean))].sort()
}

export async function distinctOperators(): Promise<string[]> {
  const arr = await db.records.toArray()
  return [
    ...new Set(arr.map((r) => r.operator).filter(Boolean) as string[]),
  ].sort()
}

export async function availableYears(): Promise<string[]> {
  const arr = await db.records.toArray()
  return [...new Set(arr.map((r) => (r.date || '').slice(0, 4)).filter(Boolean))]
    .sort()
    .reverse()
}

// ── 進階搜尋（照 V4.0 search_cards 條件集）────────────────────
export interface AdvancedFilter {
  types: RecordType[] // 空 = 全部
  dateFrom: string // '' = 不限
  dateTo: string
  operator: string
  machine: string
  tag: string
  keyword: string // 搜 notes / problem / solution（照 V4.0 範圍）
}

export const EMPTY_ADVANCED: AdvancedFilter = {
  types: [],
  dateFrom: '',
  dateTo: '',
  operator: '',
  machine: '',
  tag: '',
  keyword: '',
}

export function isAdvancedEmpty(f: AdvancedFilter): boolean {
  return (
    f.types.length === 0 &&
    !f.dateFrom &&
    !f.dateTo &&
    !f.operator.trim() &&
    !f.machine.trim() &&
    !f.tag.trim() &&
    !f.keyword.trim()
  )
}

export async function advancedSearch(f: AdvancedFilter): Promise<QARecord[]> {
  let arr = await db.records.toArray()

  if (f.types.length) arr = arr.filter((r) => f.types.includes(r.type))
  if (f.dateFrom) arr = arr.filter((r) => (r.date || '') >= f.dateFrom)
  if (f.dateTo) arr = arr.filter((r) => (r.date || '') <= f.dateTo)
  if (f.operator.trim()) {
    const op = f.operator.trim().toLowerCase()
    arr = arr.filter((r) => (r.operator || '').toLowerCase().includes(op))
  }
  if (f.machine.trim()) {
    const mc = f.machine.trim().toLowerCase()
    arr = arr.filter((r) => (r.machine || '').toLowerCase().includes(mc))
  }
  if (f.tag.trim()) {
    const tg = f.tag.trim().toLowerCase()
    arr = arr.filter((r) => (r.tags ?? []).some((t) => t.toLowerCase().includes(tg)))
  }
  if (f.keyword.trim()) {
    const k = f.keyword.trim().toLowerCase()
    arr = arr.filter((r) =>
      [r.notes, r.problem, r.solution]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(k),
    )
  }

  arr.sort(
    (a, b) =>
      (b.date || '').localeCompare(a.date || '') ||
      (b.updatedAt || '').localeCompare(a.updatedAt || ''),
  )
  return arr
}

// ── 主檔管理（V0.9.0；對應 V4.0 settings 表四分類）──────────────
import type { MasterItem } from './database'

export async function listMaster(
  category: MasterItem['category'],
): Promise<MasterItem[]> {
  const arr = await db.master.where('category').equals(category).toArray()
  return arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.id ?? 0) - (b.id ?? 0))
}

export async function addMaster(
  category: MasterItem['category'],
  value: string,
): Promise<number | null> {
  const v = value.trim()
  if (!v) return null
  const dup = await db.master
    .where('category')
    .equals(category)
    .filter((m) => m.value === v)
    .count()
  if (dup) return null
  return db.master.add({ category, value: v })
}

export async function deleteMaster(id: number): Promise<void> {
  await db.master.delete(id)
}

// ── 設定存取（提醒週期等）────────────────────────────────────
export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.settings.get(key)
  return row ? (row.value as T) : fallback
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value })
}
