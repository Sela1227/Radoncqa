import { RECORD_TYPES, type QARecord, type RecordType } from '../db/database'
import { calculateDowntimeMinutes } from './downtime'

/**
 * 統計 — 移植 V4.0 統計分析函式群（get_cards_count_by_type / by_month /
 * get_operator_stats / get_machine_stats / get_downtime_stats）。
 *
 * 刻意修正（與 V4.0 不同）：V4.0 統計裡的停機時長只算 occur/fixed 當天格式，
 * 跨日停機會被統計成 0 分鐘（文件宣稱支援跨日但未接上）。
 * Web 版統計一律走 calculateDowntimeMinutes（跨日優先、當天回退、跨半夜 +24h），
 * 與卡片/詳情顯示同一套運算，數字才會一致。
 */

const inYear = (r: QARecord, year: string) => (r.date || '').startsWith(year)

export function countByType(records: QARecord[], year: string): Record<RecordType, number> {
  const out = Object.fromEntries(RECORD_TYPES.map((t) => [t, 0])) as Record<
    RecordType,
    number
  >
  for (const r of records) if (inYear(r, year)) out[r.type] += 1
  return out
}

/** type × 月份（1..12）矩陣 */
export function countByMonth(
  records: QARecord[],
  year: string,
): Record<RecordType, number[]> {
  const out = Object.fromEntries(
    RECORD_TYPES.map((t) => [t, Array(12).fill(0)]),
  ) as Record<RecordType, number[]>
  for (const r of records) {
    if (!inYear(r, year)) continue
    const m = parseInt((r.date || '').slice(5, 7), 10)
    if (m >= 1 && m <= 12) out[r.type][m - 1] += 1
  }
  return out
}

export interface OperatorStat {
  operator: string
  count: number
  types: Partial<Record<RecordType, number>>
}

export function operatorStats(records: QARecord[], year: string): OperatorStat[] {
  const map = new Map<string, OperatorStat>()
  for (const r of records) {
    if (!inYear(r, year)) continue
    const op = r.operator || '未指定'
    let s = map.get(op)
    if (!s) {
      s = { operator: op, count: 0, types: {} }
      map.set(op, s)
    }
    s.count += 1
    s.types[r.type] = (s.types[r.type] ?? 0) + 1
  }
  return [...map.values()].sort((a, b) => b.count - a.count)
}

export interface MachineStat {
  machine: string
  machineCount: number // 機器處理筆數
  downtimeCount: number
  downtimeMinutes: number
  affectedPatients: number
}

export function machineStats(records: QARecord[], year: string): MachineStat[] {
  const map = new Map<string, MachineStat>()
  for (const r of records) {
    if (!inYear(r, year)) continue
    if (r.type !== 'machine' && r.type !== 'downtime') continue
    const m = r.machine || '未指定'
    let s = map.get(m)
    if (!s) {
      s = {
        machine: m,
        machineCount: 0,
        downtimeCount: 0,
        downtimeMinutes: 0,
        affectedPatients: 0,
      }
      map.set(m, s)
    }
    if (r.type === 'machine') {
      s.machineCount += 1
    } else {
      s.downtimeCount += 1
      s.affectedPatients += r.affectedPatients ?? 0
      s.downtimeMinutes += calculateDowntimeMinutes(r)
    }
  }
  return [...map.values()].sort(
    (a, b) => b.downtimeCount + b.machineCount - (a.downtimeCount + a.machineCount),
  )
}

export interface DowntimeSummary {
  totalCount: number
  totalMinutes: number
  totalAffected: number
  mttrMinutes: number // 平均修復時長 = totalMinutes / totalCount（0 筆時為 0）
  byReason: Record<string, number>
  byMonth: number[] // index 0 = 1 月
}

export function downtimeStats(records: QARecord[], year: string): DowntimeSummary {
  const out: DowntimeSummary = {
    totalCount: 0,
    totalMinutes: 0,
    totalAffected: 0,
    mttrMinutes: 0,
    byReason: {},
    byMonth: Array(12).fill(0),
  }
  for (const r of records) {
    if (!inYear(r, year) || r.type !== 'downtime') continue
    out.totalCount += 1
    out.totalAffected += r.affectedPatients ?? 0
    out.totalMinutes += calculateDowntimeMinutes(r)
    const m = parseInt((r.date || '').slice(5, 7), 10)
    if (m >= 1 && m <= 12) out.byMonth[m - 1] += 1
    const reason = r.downtimeReason || '其他'
    out.byReason[reason] = (out.byReason[reason] ?? 0) + 1
  }
  out.mttrMinutes = out.totalCount ? Math.round(out.totalMinutes / out.totalCount) : 0
  return out
}
