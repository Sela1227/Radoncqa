import type * as XLSXType from 'xlsx'
import { RECORD_TYPES, SENSITIVITY, type QARecord, type RecordType } from '../db/database'
import { calculateDowntimeMinutes, formatDowntimeDuration } from './downtime'

/**
 * Excel 匯出 — 移植 V4.0 excel_exporter.py：
 * 1. 報告式 export()：摘要工作表（院名/年度/產生時間/各型統計）+ 各型別分頁
 * 2. 資料式 export_data_format()：單張統一欄位，可再匯入（未來匯入批次對接此格式）
 *
 * 與 V4.0 的刻意差異：
 * - 品保三型分頁補「機器」欄（V4.0 後期讓所有型別都能選機器，但匯出欄位沒跟上）
 * - 資料式尾端補「跨日開始/跨日結束」兩欄（V4.0 缺，匯出再匯入會丟失跨日資訊）
 * - SheetJS 社群版不支援儲存格底色/字型樣式 → 表頭為純文字（openpyxl 版有橘底），
 *   欄寬有設定；功能優先。
 */

const TYPE_DESCRIPTIONS: Record<RecordType, string> = {
  daily: '每日例行品質保證',
  monthly: '每月定期品質保證',
  yearly: '年度品質保證',
  machine: '機器問題處理記錄',
  plan_issue: '治療計畫問題記錄',
  downtime: '機器停機事件記錄',
}

type AOA = (string | number)[][]

const fmtNow = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

const fmtStamp = () => fmtNow().replace(/[-: ]/g, '').slice(0, 12)

// ── 報告式：摘要 ─────────────────────────────────────────────
export function buildSummaryAOA(records: QARecord[], yearText: string): AOA {
  const counts = Object.fromEntries(RECORD_TYPES.map((t) => [t, 0])) as Record<
    RecordType,
    number
  >
  for (const r of records) counts[r.type] += 1
  const total = records.length

  const rows: AOA = [
    ['彰濱秀傳紀念醫院 放射腫瘤科'],
    [`品質保證資料庫報告 - ${yearText}`],
    [`報告產生時間：${fmtNow()}`],
    [],
    ['類型', '數量', '說明'],
  ]
  for (const t of RECORD_TYPES) {
    rows.push([SENSITIVITY[t].label, counts[t], TYPE_DESCRIPTIONS[t]])
  }
  rows.push(['總計', total, ''])
  return rows
}

// ── 報告式：各型別分頁（欄位照 V4.0 _create_type_sheet + 機器欄補齊）──
export function buildTypeSheetAOA(type: RecordType, records: QARecord[]): AOA {
  const sorted = [...records].sort((a, b) => (a.date || '').localeCompare(b.date || ''))

  if (type === 'daily' || type === 'monthly' || type === 'yearly') {
    const rows: AOA = [['執行日期', '執行人', '機器', '備註']]
    for (const r of sorted)
      rows.push([r.date || '', r.operator || '', r.machine || '', r.notes || ''])
    return rows
  }

  if (type === 'machine') {
    const rows: AOA = [['執行日期', '執行人', '機器', '問題', '解法']]
    for (const r of sorted)
      rows.push([
        r.date || '',
        r.operator || '',
        r.machine || '',
        r.problem || '',
        r.solution || '',
      ])
    return rows
  }

  if (type === 'plan_issue') {
    const rows: AOA = [['執行日期', '執行人', '機器', '問題', '解法']]
    for (const r of sorted)
      rows.push([
        r.date || '',
        r.operator || '',
        r.machine || '',
        r.problem || '',
        r.solution || '',
      ])
    return rows
  }

  // downtime（照 V4.0 報告欄位；時長走跨日感知運算）
  const rows: AOA = [
    [
      '執行日期',
      '機器',
      '停機原因',
      '發生時間',
      '修復時間',
      '停機時長',
      '影響人數',
      '跨日起訖',
    ],
  ]
  for (const r of sorted) {
    const mins = calculateDowntimeMinutes(r)
    rows.push([
      r.date || '',
      r.machine || '',
      r.downtimeReason || '',
      r.occurTime || '',
      r.fixedTime || '',
      mins > 0 ? formatDowntimeDuration(mins) : '',
      r.affectedPatients ?? '',
      r.downtimeStart && r.downtimeEnd ? `${r.downtimeStart} → ${r.downtimeEnd}` : '',
    ])
  }
  return rows
}

// ── 資料式（可再匯入；V4.0 14 欄 + 跨日 2 欄）───────────────────
export const DATA_FORMAT_HEADERS = [
  '類型',
  '執行日期',
  '執行人',
  '機器',
  '備註',
  '問題',
  '解法',
  '停機原因',
  '發生時間',
  '通知時間',
  '到場時間',
  '修復時間',
  '影響人數',
  '標籤',
  '跨日開始',
  '跨日結束',
] as const

export function buildDataFormatAOA(records: QARecord[]): AOA {
  const rows: AOA = [[...DATA_FORMAT_HEADERS]]
  const sorted = [...records].sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  for (const r of sorted) {
    rows.push([
      SENSITIVITY[r.type].label,
      r.date || '',
      r.operator || '',
      r.machine || '',
      r.notes || '',
      r.problem || '',
      r.solution || '',
      r.downtimeReason || '',
      r.occurTime || '',
      r.notifyTime || '',
      r.arriveTime || '',
      r.fixedTime || '',
      r.affectedPatients ?? '',
      (r.tags ?? []).join(','),
      r.downtimeStart || '',
      r.downtimeEnd || '',
    ])
  }
  return rows
}

// ── 下載包裝（xlsx 動態載入：點匯出才下載該模組，首屏維持輕量）──────
type XLSX = typeof XLSXType

function aoaToSheet(X: XLSX, aoa: AOA, colWidths?: number[]): XLSXType.WorkSheet {
  const ws = X.utils.aoa_to_sheet(aoa)
  if (colWidths) ws['!cols'] = colWidths.map((w) => ({ wch: w }))
  return ws
}

/** 報告式匯出：摘要 + 各型別分頁（只建有資料的分頁，照 V4.0）*/
export async function exportReportXlsx(records: QARecord[], year: string) {
  const X = await import('xlsx')
  const yearText = year === 'all' ? '全年度' : `${year} 年度`
  const scoped =
    year === 'all' ? records : records.filter((r) => (r.date || '').startsWith(year))

  const wb = X.utils.book_new()
  X.utils.book_append_sheet(
    wb,
    aoaToSheet(X, buildSummaryAOA(scoped, yearText), [16, 8, 26]),
    '摘要',
  )
  for (const t of RECORD_TYPES) {
    const typeRecords = scoped.filter((r) => r.type === t)
    if (!typeRecords.length) continue
    const widths =
      t === 'downtime' ? [12, 12, 14, 10, 10, 16, 8, 32] : [12, 10, 12, 40, 40]
    X.utils.book_append_sheet(
      wb,
      aoaToSheet(X, buildTypeSheetAOA(t, typeRecords), widths),
      SENSITIVITY[t].label,
    )
  }
  X.writeFile(wb, `QA報告_${yearText}_${fmtStamp()}.xlsx`, { compression: true })
}

/** 資料式匯出：單張可再匯入格式（全部記錄，不分年）*/
export async function exportDataXlsx(records: QARecord[]) {
  const X = await import('xlsx')
  const wb = X.utils.book_new()
  X.utils.book_append_sheet(
    wb,
    aoaToSheet(X, buildDataFormatAOA(records), [10, 12, 10, 12, 24, 30, 30, 12, 9, 9, 9, 9, 8, 16, 17, 17]),
    '資料',
  )
  X.writeFile(wb, `QA資料匯出_${fmtStamp()}.xlsx`, { compression: true })
}
