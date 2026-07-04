import type { QARecord } from '../db/database'

/**
 * 停機時長計算 — 照搬 V4.0 calculate_downtime_minutes 邏輯：
 * 1. 優先用跨日格式 downtimeStart / downtimeEnd（"YYYY-MM-DD HH:MM"，含空格才視為有效）
 *    → datetime 差，負值 clamp 0
 * 2. 回退當天格式 occurTime / fixedTime（"HH:MM"）
 *    → 分鐘差；若為負（跨半夜）則 +24 小時
 * 3. 無法計算 → 0
 */
export function calculateDowntimeMinutes(rec: {
  downtimeStart?: string
  downtimeEnd?: string
  occurTime?: string
  fixedTime?: string
}): number {
  const s = rec.downtimeStart ?? ''
  const e = rec.downtimeEnd ?? ''

  if (s && e && s.includes(' ') && e.includes(' ')) {
    const start = parseDateTime(s)
    const end = parseDateTime(e)
    if (start != null && end != null) {
      const diff = Math.floor((end - start) / 60000)
      return diff > 0 ? diff : 0
    }
  }

  const occur = rec.occurTime ?? ''
  const fixed = rec.fixedTime ?? ''
  if (!occur || !fixed) return 0

  const om = parseHHMM(occur)
  const fm = parseHHMM(fixed)
  if (om == null || fm == null) return 0

  let diff = fm - om
  if (diff < 0) diff += 24 * 60 // 跨半夜
  return diff
}

/** "YYYY-MM-DD HH:MM" → epoch ms（本地時區），格式錯回 null */
function parseDateTime(v: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(v.trim())
  if (!m) return null
  const [, Y, Mo, D, H, Mi] = m
  const d = new Date(+Y, +Mo - 1, +D, +H, +Mi)
  return isNaN(d.getTime()) ? null : d.getTime()
}

/** "HH:MM" → 當日分鐘數，格式錯回 null */
function parseHHMM(v: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim())
  if (!m) return null
  const h = +m[1]
  const mi = +m[2]
  if (h > 23 || mi > 59) return null
  return h * 60 + mi
}

/** 照搬 V4.0 format_downtime_duration：天 / 小時 / 分鐘 */
export function formatDowntimeDuration(minutes: number): string {
  if (minutes <= 0) return '0 分鐘'
  const days = Math.floor(minutes / 1440)
  const remaining = minutes % 1440
  const hours = Math.floor(remaining / 60)
  const mins = remaining % 60
  const parts: string[] = []
  if (days > 0) parts.push(`${days} 天`)
  if (hours > 0) parts.push(`${hours} 小時`)
  if (mins > 0) parts.push(`${mins} 分鐘`)
  return parts.length ? parts.join(' ') : '0 分鐘'
}

/** 便利：直接從記錄算出顯示字串，算不出回 null（讓 UI 決定藏或提示）*/
export function downtimeDurationDisplay(rec: QARecord): string | null {
  const mins = calculateDowntimeMinutes(rec)
  if (mins <= 0) return null
  return formatDowntimeDuration(mins)
}
