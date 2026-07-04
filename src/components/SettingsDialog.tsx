import { useCallback, useEffect, useState } from 'react'
import type { MasterItem } from '../db/database'
import {
  addMaster,
  deleteMaster,
  getSetting,
  listMaster,
  setSetting,
} from '../db/crud'
import { QA_SCHEDULE } from '../logic/reminder'

type MasterCat = MasterItem['category']

const TABS: { key: 'reminder' | MasterCat; label: string }[] = [
  { key: 'reminder', label: '提醒設定' },
  { key: 'operator', label: '執行人' },
  { key: 'machine', label: '機器種類' },
  { key: 'downtime_reason', label: '停機原因' },
  { key: 'tag', label: '標籤' },
]

export interface ScheduleOverride {
  daily: number
  monthly: number
  yearly: number
}

export function SettingsDialog({
  onClose,
  onChanged,
}: {
  onClose: () => void
  onChanged: () => void
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('reminder')

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>設定</h2>
          <button className="icon-btn" onClick={onClose} title="關閉">
            ✕
          </button>
        </header>

        <div className="settings-tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={'tab' + (t.key === tab ? ' tab-active' : '')}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="modal-body">
          {tab === 'reminder' ? (
            <ReminderTab onChanged={onChanged} />
          ) : (
            <MasterTab category={tab} onChanged={onChanged} />
          )}
        </div>

        <footer className="modal-foot">
          <button className="btn-primary" onClick={onClose}>
            完成
          </button>
        </footer>
      </div>
    </div>
  )
}

function ReminderTab({ onChanged }: { onChanged: () => void }) {
  const [sched, setSched] = useState<ScheduleOverride | null>(null)

  useEffect(() => {
    getSetting<ScheduleOverride>('qa_schedule', {
      daily: QA_SCHEDULE.daily!,
      monthly: QA_SCHEDULE.monthly!,
      yearly: QA_SCHEDULE.yearly!,
    }).then(setSched)
  }, [])

  if (!sched) return <p className="hint">載入中…</p>

  async function save(patch: Partial<ScheduleOverride>) {
    const next = { ...sched!, ...patch }
    setSched(next)
    await setSetting('qa_schedule', next)
    onChanged()
  }

  const Row = ({ k, label }: { k: keyof ScheduleOverride; label: string }) => (
    <label className="field">
      <span>{label}到期週期（天）</span>
      <input
        type="number"
        min={1}
        value={sched![k]}
        onChange={(e) => {
          const n = Math.max(1, Number(e.target.value) || 1)
          save({ [k]: n } as Partial<ScheduleOverride>)
        }}
      />
    </label>
  )

  return (
    <>
      <p className="hint">
        超過「最後執行日 + 週期」未做該項品保，提醒橫幅就會顯示逾期。
      </p>
      <div className="field-row">
        <Row k="daily" label="日品保" />
        <Row k="monthly" label="月品保" />
        <Row k="yearly" label="年品保" />
      </div>
    </>
  )
}

function MasterTab({
  category,
  onChanged,
}: {
  category: MasterCat
  onChanged: () => void
}) {
  const [items, setItems] = useState<MasterItem[]>([])
  const [input, setInput] = useState('')

  const reload = useCallback(async () => {
    setItems(await listMaster(category))
  }, [category])

  useEffect(() => {
    reload()
  }, [reload])

  async function add() {
    const id = await addMaster(category, input)
    if (id == null && input.trim()) {
      alert('已存在相同項目')
      return
    }
    setInput('')
    await reload()
    onChanged()
  }

  async function remove(id: number) {
    await deleteMaster(id)
    await reload()
    onChanged()
  }

  return (
    <>
      <p className="hint">
        這裡的項目會出現在表單的下拉建議中。刪除項目不影響既有記錄。
      </p>
      <div className="master-add">
        <input
          value={input}
          placeholder="輸入新項目…"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') add()
          }}
        />
        <button className="btn-primary" onClick={add} disabled={!input.trim()}>
          ＋ 新增
        </button>
      </div>
      {items.length === 0 ? (
        <p className="hint">尚無項目</p>
      ) : (
        <ul className="master-list">
          {items.map((m) => (
            <li key={m.id}>
              <span>{m.value}</span>
              <button
                className="icon-btn"
                title="刪除"
                onClick={() => m.id != null && remove(m.id)}
              >
                刪除
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
