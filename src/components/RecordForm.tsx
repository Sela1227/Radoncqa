import { useState } from 'react'
import { type QARecord, type RecordType } from '../db/database'
import { addRecord, updateRecord } from '../db/crud'
import { TYPE_FORM, typeLabel } from '../typeMeta'
import { TimeInput } from './TimeInput'
import {
  calculateDowntimeMinutes,
  formatDowntimeDuration,
} from '../logic/downtime'

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

export function RecordForm({
  type,
  record,
  machines,
  operators,
  reasons = [],
  onClose,
  onSaved,
}: {
  type: RecordType
  record?: QARecord // 有則為編輯
  machines: string[]
  operators: string[]
  reasons?: string[]
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!record
  const meta = TYPE_FORM[type]

  const [machine, setMachine] = useState(record?.machine ?? '')
  const [date, setDate] = useState(record?.date ?? today())
  const [operator, setOperator] = useState(record?.operator ?? '')
  const [tags, setTags] = useState((record?.tags ?? []).join('、'))
  const [notes, setNotes] = useState(record?.notes ?? '')
  const [problem, setProblem] = useState(record?.problem ?? '')
  const [solution, setSolution] = useState(record?.solution ?? '')
  const [reason, setReason] = useState(record?.downtimeReason ?? '')
  const [affected, setAffected] = useState(
    record?.affectedPatients != null ? String(record.affectedPatients) : '',
  )
  // 停機四時間（當天格式 HH:MM）
  const [occurTime, setOccurTime] = useState(record?.occurTime ?? '')
  const [notifyTime, setNotifyTime] = useState(record?.notifyTime ?? '')
  const [arriveTime, setArriveTime] = useState(record?.arriveTime ?? '')
  const [fixedTime, setFixedTime] = useState(record?.fixedTime ?? '')
  // 跨日（"YYYY-MM-DD HH:MM"，儲存時才組合）
  const initCross = !!(record?.downtimeStart && record?.downtimeEnd)
  const [crossDay, setCrossDay] = useState(initCross)
  const [crossStartDate, setCrossStartDate] = useState(
    record?.downtimeStart?.split(' ')[0] ?? '',
  )
  const [crossStartTime, setCrossStartTime] = useState(
    record?.downtimeStart?.split(' ')[1] ?? '',
  )
  const [crossEndDate, setCrossEndDate] = useState(
    record?.downtimeEnd?.split(' ')[0] ?? '',
  )
  const [crossEndTime, setCrossEndTime] = useState(
    record?.downtimeEnd?.split(' ')[1] ?? '',
  )
  const [saving, setSaving] = useState(false)

  const has = (k: string) => meta.fields.includes(k as never)

  // 即時時長（與儲存邏輯同一支運算）
  const liveMinutes = has('downtimeBasic')
    ? calculateDowntimeMinutes({
        downtimeStart:
          crossDay && crossStartDate && crossStartTime
            ? `${crossStartDate} ${crossStartTime}`
            : undefined,
        downtimeEnd:
          crossDay && crossEndDate && crossEndTime
            ? `${crossEndDate} ${crossEndTime}`
            : undefined,
        occurTime,
        fixedTime,
      })
    : 0

  async function save() {
    if (meta.machine === 'required' && !machine.trim()) {
      alert('請填入機器')
      return
    }
    if (has('downtimeBasic') && crossDay) {
      const halfFilled =
        [crossStartDate, crossStartTime, crossEndDate, crossEndTime].filter(Boolean)
          .length % 4 !== 0
      if (halfFilled) {
        alert('跨日停機需完整填入開始與結束的日期和時間（或關閉跨日）')
        return
      }
    }
    setSaving(true)
    const isDt = has('downtimeBasic')
    const crossOk =
      isDt && crossDay && crossStartDate && crossStartTime && crossEndDate && crossEndTime
    const payload: Partial<QARecord> = {
      type,
      machine: machine.trim(),
      date,
      operator: operator.trim() || undefined,
      tags: tags
        .split(/[,，、]/)
        .map((t) => t.trim())
        .filter(Boolean),
      notes: has('notes') ? notes.trim() || undefined : undefined,
      problem: has('problem') ? problem.trim() || undefined : undefined,
      solution: has('solution') ? solution.trim() || undefined : undefined,
      downtimeReason: isDt ? reason.trim() || undefined : undefined,
      affectedPatients: isDt
        ? affected.trim()
          ? Number(affected)
          : undefined
        : undefined,
      occurTime: isDt ? occurTime || undefined : undefined,
      notifyTime: isDt ? notifyTime || undefined : undefined,
      arriveTime: isDt ? arriveTime || undefined : undefined,
      fixedTime: isDt ? fixedTime || undefined : undefined,
      downtimeStart: crossOk ? `${crossStartDate} ${crossStartTime}` : undefined,
      downtimeEnd: crossOk ? `${crossEndDate} ${crossEndTime}` : undefined,
    }
    if (isEdit && record?.id != null) {
      await updateRecord(record.id, payload)
    } else {
      await addRecord(payload as Omit<QARecord, 'id' | 'createdAt' | 'updatedAt'>)
    }
    setSaving(false)
    onSaved()
  }

  const machineLabel = meta.machine === 'required' ? '機器 *' : '機器（可選）'

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>
            {isEdit ? '編輯' : '新增'} {typeLabel(type)}
          </h2>
          <button className="icon-btn" onClick={onClose} title="關閉">
            ✕
          </button>
        </header>

        <div className="modal-body">
          <label className="field">
            <span>{machineLabel}</span>
            <input
              list="machines-dl"
              value={machine}
              onChange={(e) => setMachine(e.target.value)}
              placeholder="輸入或選擇機器"
            />
            <datalist id="machines-dl">
              {machines.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </label>

          <div className="field-row">
            <label className="field">
              <span>日期</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label className="field">
              <span>執行人</span>
              <input
                list="operators-dl"
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
              />
              <datalist id="operators-dl">
                {operators.map((o) => (
                  <option key={o} value={o} />
                ))}
              </datalist>
            </label>
          </div>

          {has('downtimeBasic') && (
            <>
              <div className="field-row">
                <label className="field">
                  <span>停機原因</span>
                  <input
                    list="reasons-dl"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <datalist id="reasons-dl">
                    {reasons.map((r) => (
                      <option key={r} value={r} />
                    ))}
                  </datalist>
                </label>
                <label className="field">
                  <span>影響人數</span>
                  <input
                    type="number"
                    min={0}
                    value={affected}
                    onChange={(e) => setAffected(e.target.value)}
                  />
                </label>
              </div>

              {!crossDay && (
                <div className="time-grid">
                  <TimeInput label="發生" value={occurTime} onChange={setOccurTime} />
                  <TimeInput label="通報" value={notifyTime} onChange={setNotifyTime} />
                  <TimeInput label="到場" value={arriveTime} onChange={setArriveTime} />
                  <TimeInput label="修復" value={fixedTime} onChange={setFixedTime} />
                </div>
              )}

              <label className="crossday-toggle">
                <input
                  type="checkbox"
                  checked={crossDay}
                  onChange={(e) => setCrossDay(e.target.checked)}
                />
                <span>跨日停機（超過一天，改用起訖日期時間）</span>
              </label>

              {crossDay && (
                <div className="crossday-box">
                  <div className="field-row">
                    <label className="field">
                      <span>開始日期</span>
                      <input
                        type="date"
                        value={crossStartDate}
                        onChange={(e) => setCrossStartDate(e.target.value)}
                      />
                    </label>
                    <TimeInput
                      label="開始時間"
                      value={crossStartTime}
                      onChange={setCrossStartTime}
                    />
                  </div>
                  <div className="field-row">
                    <label className="field">
                      <span>結束日期</span>
                      <input
                        type="date"
                        value={crossEndDate}
                        onChange={(e) => setCrossEndDate(e.target.value)}
                      />
                    </label>
                    <TimeInput
                      label="結束時間"
                      value={crossEndTime}
                      onChange={setCrossEndTime}
                    />
                  </div>
                  <p className="hint">跨日填了完整起訖後，發生/修復時間僅供紀錄，不參與時長計算。</p>
                </div>
              )}

              <p className="duration-line">
                停機時長：
                <strong>
                  {liveMinutes > 0 ? formatDowntimeDuration(liveMinutes) : '—（填發生+修復，或跨日起訖）'}
                </strong>
              </p>
            </>
          )}

          {has('problem') && (
            <label className="field">
              <span>問題描述</span>
              <textarea
                rows={2}
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
              />
            </label>
          )}
          {has('solution') && (
            <label className="field">
              <span>解決方法</span>
              <textarea
                rows={2}
                value={solution}
                onChange={(e) => setSolution(e.target.value)}
              />
            </label>
          )}
          {has('notes') && (
            <label className="field">
              <span>備註</span>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
          )}

          <p className="warn">注意：自由文字欄位請勿填入可識別病患之資訊。</p>

          <label className="field">
            <span>標籤（頓號或逗號分隔）</span>
            <input value={tags} onChange={(e) => setTags(e.target.value)} />
          </label>
        </div>

        <footer className="modal-foot">
          <button className="btn-ghost" onClick={onClose}>
            取消
          </button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? '儲存中…' : '儲存'}
          </button>
        </footer>
      </div>
    </div>
  )
}
