import type { QARecord, RecordType } from '../db/database'

/**
 * 品保到期提醒 — 照搬 V4.0 get_last_qa_dates + get_overdue_qa：
 * - QA_SCHEDULE：daily 1 天、monthly 30 天、yearly 365 天
 * - 各類型取全域最後執行日（不分機器，與 V4.0 一致）
 * - 逾期 = 今天 > 最後執行日 + 週期；從未執行 → days_overdue = 999
 * - 依逾期天數大→小排序
 */
export const QA_SCHEDULE: Partial<Record<RecordType, number>> = {
  daily: 1,
  monthly: 30,
  yearly: 365,
}

export interface OverdueItem {
  type: RecordType
  lastDate: string | null
  daysOverdue: number
  scheduleDays: number
}

export function getOverdueQA(
  records: QARecord[],
  today = new Date(),
  scheduleOverride?: Partial<Record<RecordType, number>>,
): OverdueItem[] {
  const t = startOfDay(today)
  const overdue: OverdueItem[] = []

  for (const qaType of Object.keys(QA_SCHEDULE) as RecordType[]) {
    const scheduleDays = scheduleOverride?.[qaType] ?? QA_SCHEDULE[qaType]!
    const dates = records
      .filter((r) => r.type === qaType && r.date)
      .map((r) => r.date)
      .sort()
    const last = dates.length ? dates[dates.length - 1] : null

    if (!last) {
      overdue.push({ type: qaType, lastDate: null, daysOverdue: 999, scheduleDays })
      continue
    }

    const lastDate = parseDate(last)
    if (!lastDate) continue
    const nextDue = new Date(lastDate)
    nextDue.setDate(nextDue.getDate() + scheduleDays)

    if (t.getTime() > nextDue.getTime()) {
      const daysOverdue = Math.floor((t.getTime() - nextDue.getTime()) / 86400000)
      overdue.push({ type: qaType, lastDate: last, daysOverdue, scheduleDays })
    }
  }

  return overdue.sort((a, b) => b.daysOverdue - a.daysOverdue)
}

function parseDate(v: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.trim())
  if (!m) return null
  const d = new Date(+m[1], +m[2] - 1, +m[3])
  return isNaN(d.getTime()) ? null : d
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
