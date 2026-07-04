import { type QARecord } from '../db/database'
import { typeColor, typeLabel } from '../typeMeta'
import { downtimeDurationDisplay } from '../logic/downtime'

function Row({ label, value }: { label: string; value?: string | number }) {
  if (value == null || value === '') return null
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value}</span>
    </div>
  )
}

export function DetailPanel({
  record,
  onClose,
  onEdit,
  onDelete,
}: {
  record: QARecord
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const color = typeColor(record.type)
  return (
    <div className="detail-backdrop" onClick={onClose}>
      <aside
        className="detail-panel"
        onClick={(e) => e.stopPropagation()}
        style={{ borderTopColor: color }}
      >
        <header className="detail-head">
          <span className="card-type" style={{ color }}>
            {typeLabel(record.type)}
          </span>
          <span className="card-spacer" />
          <button className="icon-btn" onClick={onClose} title="關閉">
            ✕
          </button>
        </header>

        <div className="detail-body">
          <Row label="日期" value={record.date} />
          <Row label="機器" value={record.machine} />
          <Row label="執行人" value={record.operator} />
          <Row label="停機原因" value={record.downtimeReason} />
          <Row label="影響人數" value={record.affectedPatients} />
          <Row label="發生時間" value={record.occurTime} />
          <Row label="通報時間" value={record.notifyTime} />
          <Row label="到場時間" value={record.arriveTime} />
          <Row label="修復時間" value={record.fixedTime} />
          {record.downtimeStart && record.downtimeEnd && (
            <Row
              label="跨日起訖"
              value={`${record.downtimeStart} → ${record.downtimeEnd}`}
            />
          )}
          {record.type === 'downtime' && (
            <Row label="停機時長" value={downtimeDurationDisplay(record) ?? undefined} />
          )}
          {record.problem && (
            <div className="detail-block">
              <span className="detail-label">問題描述</span>
              <p>{record.problem}</p>
            </div>
          )}
          {record.solution && (
            <div className="detail-block">
              <span className="detail-label">解決方法</span>
              <p>{record.solution}</p>
            </div>
          )}
          {record.notes && (
            <div className="detail-block">
              <span className="detail-label">備註</span>
              <p>{record.notes}</p>
            </div>
          )}
          {record.tags && record.tags.length > 0 && (
            <div className="detail-block">
              <span className="detail-label">標籤</span>
              <div className="card-tags">
                {record.tags.map((t) => (
                  <span key={t} className="tag">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <footer className="detail-foot">
          <button className="btn-ghost" onClick={onDelete}>
            刪除
          </button>
          <span className="card-spacer" />
          <button className="btn-primary" onClick={onEdit}>
            編輯
          </button>
        </footer>
      </aside>
    </div>
  )
}
