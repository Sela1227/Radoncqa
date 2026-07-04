import { TABS } from '../tabs'
import type { TabKey } from '../db/crud'

export function TabBar({
  active,
  onChange,
}: {
  active: TabKey
  onChange: (k: TabKey) => void
}) {
  return (
    <nav className="tabbar" aria-label="記錄類型">
      {TABS.map((t) => (
        <button
          key={t.key}
          className={'tab' + (t.key === active ? ' tab-active' : '')}
          onClick={() => onChange(t.key)}
          aria-pressed={t.key === active}
        >
          {t.label}
        </button>
      ))}
    </nav>
  )
}
