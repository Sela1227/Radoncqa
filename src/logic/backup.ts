import { db, RECORD_TYPES, type AppSetting, type MasterItem, type QARecord } from '../db/database'

/**
 * 備份 / 還原（V0.9.0）— 對應 V4.0 backup_manager（原為 SQLite+附件 zip；
 * Web 版為全庫 JSON：records + master + settings + 中繼資料）。
 * 還原 = 整庫覆蓋（清空後寫入），UI 層負責二次確認。
 */

export interface BackupPayload {
  app: 'RadOncQA'
  formatVersion: 1
  exportedAt: string
  counts: { records: number; master: number; settings: number }
  records: QARecord[]
  master: MasterItem[]
  settings: AppSetting[]
}

export async function buildBackup(): Promise<BackupPayload> {
  const [records, master, settings] = await Promise.all([
    db.records.toArray(),
    db.master.toArray(),
    db.settings.toArray(),
  ])
  return {
    app: 'RadOncQA',
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    counts: { records: records.length, master: master.length, settings: settings.length },
    records,
    master,
    settings,
  }
}

export function downloadBackup(payload: BackupPayload) {
  const stamp = payload.exportedAt.replace(/[-:T]/g, '').slice(0, 12)
  const blob = new Blob([JSON.stringify(payload, null, 1)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `backup_radoncqa_${stamp}.json`
  a.click()
  URL.revokeObjectURL(url)
}

const TYPE_SET = new Set<string>(RECORD_TYPES)

/** 驗證還原檔；回傳可用 payload 或錯誤訊息（純函式，可測）*/
export function parseBackup(
  text: string,
): { ok: true; payload: BackupPayload } | { ok: false; reason: string } {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, reason: '不是有效的 JSON 檔' }
  }
  const p = raw as Partial<BackupPayload>
  if (p?.app !== 'RadOncQA') return { ok: false, reason: '不是 RadOncQA 備份檔' }
  if (p.formatVersion !== 1)
    return { ok: false, reason: `不支援的備份格式版本（${String(p.formatVersion)}）` }
  if (!Array.isArray(p.records) || !Array.isArray(p.master) || !Array.isArray(p.settings))
    return { ok: false, reason: '備份內容缺漏（records / master / settings）' }
  for (const r of p.records) {
    if (!r || typeof r !== 'object' || !TYPE_SET.has((r as QARecord).type))
      return { ok: false, reason: '記錄含無法辨識的類型，檔案可能已損壞' }
  }
  return { ok: true, payload: p as BackupPayload }
}

/** 整庫覆蓋還原：清空三表後寫入（去掉自增 id 讓 Dexie 重配）*/
export async function restoreBackup(payload: BackupPayload): Promise<void> {
  await db.transaction('rw', db.records, db.master, db.settings, async () => {
    await Promise.all([db.records.clear(), db.master.clear(), db.settings.clear()])
    await db.records.bulkAdd(payload.records.map(({ id: _id, ...r }) => r as QARecord))
    await db.master.bulkAdd(payload.master.map(({ id: _id, ...m }) => m as MasterItem))
    await db.settings.bulkPut(payload.settings)
  })
}
