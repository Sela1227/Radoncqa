import { type QARecord } from '../db/database'
import { typeColor, typeLabel } from '../typeMeta'
import { downtimeDurationDisplay } from '../logic/downtime'

function RecordCard({
  rec,
  onSelect,
}: {
  rec: QARecord
  onSelect: (rec: QARecord) => void
}) {
  const color = typeColor(rec.type)
  const snippet = rec.problem || rec.notes || rec.solution || ''
  const duration = rec.type === 'downtime' ? downtimeDurationDisplay(rec) : null
  return (
    <article
      className="card"
      style={{ borderLeftColor: color }}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(rec)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(rec)
        }
      }}
    >
      <div className="card-head">
        <span className="card-type" style={{ color }}>
          {typeLabel(rec.type)}
        </span>
        <span className="card-date">{rec.date || '—'}</span>
        <span className="card-spacer" />
        {duration ? (
          <span className="duration-chip">{duration}</span>
        ) : (
          rec.downtimeReason && <span className="card-date">{rec.downtimeReason}</span>
        )}
      </div>
      <div className="card-body">
        <span className="card-machine">{rec.machine || '未指定機器'}</span>
        {rec.operator && <span className="card-op">· {rec.operator}</span>}
      </div>
      {snippet && <p className="card-problem">{snippet}</p>}
      {rec.tags && rec.tags.length > 0 && (
        <div className="card-tags">
          {rec.tags.map((t) => (
            <span key={t} className="tag">
              {t}
            </span>
          ))}
        </div>
      )}
    </article>
  )
}

export function CardList({
  records,
  onSelect,
  onAdd,
}: {
  records: QARecord[]
  onSelect: (rec: QARecord) => void
  onAdd: () => void
}) {
  if (records.length === 0) {
    return (
      <div className="empty">
        <p className="empty-title">這個分類還沒有記錄</p>
        <p className="empty-sub">新增第一筆，之後的篩選、統計與報告都從這裡開始。</p>
        <button className="btn-primary" onClick={onAdd}>
          ＋ 新增記錄
        </button>
      </div>
    )
  }
  return (
    <div className="cardlist">
      {records.map((r) => (
        <RecordCard key={r.id} rec={r} onSelect={onSelect} />
      ))}
    </div>
  )
}
