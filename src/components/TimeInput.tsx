/**
 * 自製時間輸入（Kit 規則：禁用原生 <input type="time">，跨瀏覽器/平板行為不一致）
 * 時 / 分 兩個 select，觸控友善；可清空回未填（"--:--"）。
 * value 格式 "HH:MM"，空字串 = 未填。
 */
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

export function TimeInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string // "HH:MM" 或 ""
  onChange: (v: string) => void
}) {
  const [h, m] = value ? value.split(':') : ['', '']

  function set(nh: string, nm: string) {
    if (nh === '' && nm === '') {
      onChange('')
      return
    }
    // 只填了一半時，另一半補預設
    onChange(`${nh || '00'}:${nm || '00'}`)
  }

  return (
    <div className="timeinput">
      <span className="timeinput-label">{label}</span>
      <div className="timeinput-controls">
        <select
          value={h}
          onChange={(e) => set(e.target.value, m)}
          aria-label={`${label} 時`}
        >
          <option value="">--</option>
          {HOURS.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        <span className="timeinput-colon">:</span>
        <select
          value={m}
          onChange={(e) => set(h, e.target.value)}
          aria-label={`${label} 分`}
        >
          <option value="">--</option>
          {MINUTES.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        {value && (
          <button
            type="button"
            className="icon-btn"
            title="清空"
            onClick={() => onChange('')}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
