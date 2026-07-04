import { SENSITIVITY, type QARecord, type RecordType } from '../db/database'
import { TYPE_FORM } from '../typeMeta'
import type { NewRecord } from '../db/crud'

/**
 * Excel 資料匯入 — 對接 V0.6.0 資料式 16 欄格式（excelExport.DATA_FORMAT_HEADERS）。
 * - 以「表頭名稱」對欄，不靠欄位順序 → 舊版 14 欄檔（無跨日兩欄）也能匯入
 * - 類型以中文標籤反查（日品保 → daily …）
 * - 驗證：類型可辨識、日期 YYYY-MM-DD、必填機器（machine/downtime）
 * - 重複判斷 key：型別 + 日期 + 機器
 */

type Cell = string | number | undefined | null
export type AOA = Cell[][]

const LABEL_TO_TYPE: Record<string, RecordType> = Object.fromEntries(
  (Object.keys(SENSITIVITY) as RecordType[]).map((t) => [SENSITIVITY[t].label, t]),
) as Record<string, RecordType>

const str = (c: Cell) => (c == null ? '' : String(c).trim())

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^\d{1,2}:\d{2}$/
const DT_RE = /^\d{4}-\d{2}-\d{2} \d{1,2}:\d{2}$/

export interface ImportError {
  rowNumber: number // Excel 列號（含表頭偏移，給人看）
  reason: string
}

export interface ParseResult {
  records: NewRecord[]
  errors: ImportError[]
}

export function parseDataAOA(aoa: AOA): ParseResult {
  const records: NewRecord[] = []
  const errors: ImportError[] = []

  if (!aoa.length) return { records, errors: [{ rowNumber: 1, reason: '檔案沒有內容' }] }

  const header = aoa[0].map(str)
  const col = (name: string) => header.indexOf(name)
  const idx = {
    type: col('類型'),
    date: col('執行日期'),
    operator: col('執行人'),
    machine: col('機器'),
    notes: col('備註'),
    problem: col('問題'),
    solution: col('解法'),
    reason: col('停機原因'),
    occur: col('發生時間'),
    notify: col('通知時間'),
    arrive: col('到場時間'),
    fixed: col('修復時間'),
    affected: col('影響人數'),
    tags: col('標籤'),
    crossStart: col('跨日開始'),
    crossEnd: col('跨日結束'),
  }
  if (idx.type < 0 || idx.date < 0) {
    return {
      records,
      errors: [{ rowNumber: 1, reason: '表頭缺少「類型」或「執行日期」，不是資料匯出格式' }],
    }
  }

  const get = (row: Cell[], i: number) => (i >= 0 ? str(row[i]) : '')

  for (let r = 1; r < aoa.length; r++) {
    const row = aoa[r]
    const rowNumber = r + 1
    if (!row || row.every((c) => str(c) === '')) continue // 空列跳過

    const typeLabel = get(row, idx.type)
    const type = LABEL_TO_TYPE[typeLabel]
    if (!type) {
      errors.push({ rowNumber, reason: `無法辨識的類型「${typeLabel}」` })
      continue
    }

    const date = get(row, idx.date)
    if (!DATE_RE.test(date)) {
      errors.push({ rowNumber, reason: `日期格式錯誤「${date}」（需 YYYY-MM-DD）` })
      continue
    }

    const machine = get(row, idx.machine)
    if (TYPE_FORM[type].machine === 'required' && !machine) {
      errors.push({ rowNumber, reason: `${typeLabel} 的機器為必填` })
      continue
    }

    const timeOrEmpty = (v: string, label: string): string | null => {
      if (!v) return ''
      if (TIME_RE.test(v)) return v.padStart(5, '0')
      errors.push({ rowNumber, reason: `${label}格式錯誤「${v}」（需 HH:MM）` })
      return null
    }
    const occur = timeOrEmpty(get(row, idx.occur), '發生時間')
    const notify = timeOrEmpty(get(row, idx.notify), '通知時間')
    const arrive = timeOrEmpty(get(row, idx.arrive), '到場時間')
    const fixed = timeOrEmpty(get(row, idx.fixed), '修復時間')
    if (occur === null || notify === null || arrive === null || fixed === null) continue

    const crossStart = get(row, idx.crossStart)
    const crossEnd = get(row, idx.crossEnd)
    if ((crossStart && !DT_RE.test(crossStart)) || (crossEnd && !DT_RE.test(crossEnd))) {
      errors.push({ rowNumber, reason: '跨日欄位格式錯誤（需 YYYY-MM-DD HH:MM）' })
      continue
    }
    if ((crossStart && !crossEnd) || (!crossStart && crossEnd)) {
      errors.push({ rowNumber, reason: '跨日開始/結束必須成對' })
      continue
    }

    const affectedRaw = get(row, idx.affected)
    let affectedPatients: number | undefined
    if (affectedRaw) {
      const n = Number(affectedRaw)
      if (!Number.isFinite(n) || n < 0) {
        errors.push({ rowNumber, reason: `影響人數需為非負數字「${affectedRaw}」` })
        continue
      }
      affectedPatients = n
    }

    const tags = get(row, idx.tags)
      .split(/[,，、]/)
      .map((t) => t.trim())
      .filter(Boolean)

    records.push({
      type,
      machine,
      date,
      operator: get(row, idx.operator) || undefined,
      notes: get(row, idx.notes) || undefined,
      problem: get(row, idx.problem) || undefined,
      solution: get(row, idx.solution) || undefined,
      downtimeReason: get(row, idx.reason) || undefined,
      occurTime: occur || undefined,
      notifyTime: notify || undefined,
      arriveTime: arrive || undefined,
      fixedTime: fixed || undefined,
      affectedPatients,
      downtimeStart: crossStart || undefined,
      downtimeEnd: crossEnd || undefined,
      tags: tags.length ? tags : undefined,
    })
  }

  return { records, errors }
}

const dupKey = (r: { type: RecordType; date?: string; machine?: string }) =>
  `${r.type}|${r.date || ''}|${r.machine || ''}`

/** 將匯入清單分成「新」與「與現有資料重複」兩組 */
export function splitDuplicates(
  incoming: NewRecord[],
  existing: QARecord[],
): { fresh: NewRecord[]; duplicates: NewRecord[] } {
  const seen = new Set(existing.map(dupKey))
  const fresh: NewRecord[] = []
  const duplicates: NewRecord[] = []
  for (const r of incoming) {
    if (seen.has(dupKey(r))) duplicates.push(r)
    else fresh.push(r)
  }
  return { fresh, duplicates }
}
