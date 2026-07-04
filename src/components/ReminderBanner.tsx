import { SENSITIVITY } from '../db/database'
import type { OverdueItem } from '../logic/reminder'

export function ReminderBanner({
  items,
  onDismiss,
}: {
  items: OverdueItem[]
  onDismiss: () => void
}) {
  if (items.length === 0) return null

  const msgs = items.map((it) => {
    const label = SENSITIVITY[it.type].label
    if (it.lastDate == null) return `${label}尚未有任何記錄`
    return `${label}已逾期 ${it.daysOverdue} 天（上次 ${it.lastDate}）`
  })

  return (
    <div className="reminder">
      <span>
        {msgs.join('；')}
      </span>
      <button className="icon-btn" onClick={onDismiss} title="本次先關閉">
        ✕
      </button>
    </div>
  )
}
