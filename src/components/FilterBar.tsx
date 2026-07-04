import type { RecordFilter } from '../db/crud'

export function FilterBar({
  filter,
  years,
  machines,
  onChange,
  onAdd,
  onAdvanced,
}: {
  filter: RecordFilter
  years: string[]
  machines: string[]
  onChange: (patch: Partial<RecordFilter>) => void
  onAdd: () => void
  onAdvanced: () => void
}) {
  return (
    <div className="filterbar">
      <select
        className="select"
        value={filter.year}
        onChange={(e) => onChange({ year: e.target.value })}
        aria-label="年度"
      >
        <option value="all">全部年</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>

      <select
        className="select"
        value={filter.machine}
        onChange={(e) => onChange({ machine: e.target.value })}
        aria-label="機器"
      >
        <option value="all">全部機器</option>
        {machines.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>

      <input
        className="search"
        type="search"
        placeholder="即時搜尋…"
        value={filter.keyword}
        onChange={(e) => onChange({ keyword: e.target.value })}
        aria-label="關鍵字搜尋"
      />

      <button className="btn-ghost" onClick={onAdvanced} title="進階搜尋">
        進階搜尋
      </button>

      <button className="btn-primary" onClick={onAdd}>
        ＋ 新增
      </button>
    </div>
  )
}
