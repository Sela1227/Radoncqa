import { useState } from 'react'
import { RECORD_TYPES, SENSITIVITY, type RecordType } from '../db/database'
import { EMPTY_ADVANCED, type AdvancedFilter } from '../db/crud'

export function AdvancedSearchDialog({
  initial,
  machines,
  operators,
  onApply,
  onClose,
}: {
  initial: AdvancedFilter
  machines: string[]
  operators: string[]
  onApply: (f: AdvancedFilter) => void
  onClose: () => void
}) {
  const [f, setF] = useState<AdvancedFilter>(initial)

  const patch = (p: Partial<AdvancedFilter>) => setF((v) => ({ ...v, ...p }))

  function toggleType(t: RecordType) {
    patch({
      types: f.types.includes(t)
        ? f.types.filter((x) => x !== t)
        : [...f.types, t],
    })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>進階搜尋</h2>
          <button className="icon-btn" onClick={onClose} title="關閉">
            ✕
          </button>
        </header>

        <div className="modal-body">
          <div className="field">
            <span>類型（不勾 = 全部）</span>
            <div className="type-checks">
              {RECORD_TYPES.map((t) => (
                <label key={t} className="type-check">
                  <input
                    type="checkbox"
                    checked={f.types.includes(t)}
                    onChange={() => toggleType(t)}
                  />
                  <span>{SENSITIVITY[t].label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="field-row">
            <label className="field">
              <span>起始日期</span>
              <input
                type="date"
                value={f.dateFrom}
                onChange={(e) => patch({ dateFrom: e.target.value })}
              />
            </label>
            <label className="field">
              <span>結束日期</span>
              <input
                type="date"
                value={f.dateTo}
                onChange={(e) => patch({ dateTo: e.target.value })}
              />
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span>執行人</span>
              <input
                list="adv-operators"
                value={f.operator}
                onChange={(e) => patch({ operator: e.target.value })}
              />
              <datalist id="adv-operators">
                {operators.map((o) => (
                  <option key={o} value={o} />
                ))}
              </datalist>
            </label>
            <label className="field">
              <span>機器</span>
              <input
                list="adv-machines"
                value={f.machine}
                onChange={(e) => patch({ machine: e.target.value })}
              />
              <datalist id="adv-machines">
                {machines.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span>標籤</span>
              <input
                value={f.tag}
                onChange={(e) => patch({ tag: e.target.value })}
              />
            </label>
            <label className="field">
              <span>內容關鍵字（備註/問題/解法）</span>
              <input
                value={f.keyword}
                onChange={(e) => patch({ keyword: e.target.value })}
              />
            </label>
          </div>
        </div>

        <footer className="modal-foot">
          <button className="btn-ghost" onClick={() => setF(EMPTY_ADVANCED)}>
            清空條件
          </button>
          <span className="card-spacer" />
          <button className="btn-ghost" onClick={onClose}>
            取消
          </button>
          <button className="btn-primary" onClick={() => onApply(f)}>
            搜尋
          </button>
        </footer>
      </div>
    </div>
  )
}
