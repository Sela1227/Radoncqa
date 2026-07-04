import { useMemo, useState } from 'react'
import { RECORD_TYPES, SENSITIVITY, type QARecord } from '../db/database'
import { typeColor } from '../typeMeta'
import { formatDowntimeDuration } from '../logic/downtime'
import {
  countByMonth,
  countByType,
  downtimeStats,
  machineStats,
  operatorStats,
} from '../logic/stats'

export function StatsDashboard({
  records,
  years,
  onClose,
}: {
  records: QARecord[]
  years: string[]
  onClose: () => void
}) {
  const currentYear = String(new Date().getFullYear())
  const yearOptions = years.length ? years : [currentYear]
  const [year, setYear] = useState(
    yearOptions.includes(currentYear) ? currentYear : yearOptions[0],
  )

  const byType = useMemo(() => countByType(records, year), [records, year])
  const byMonth = useMemo(() => countByMonth(records, year), [records, year])
  const dt = useMemo(() => downtimeStats(records, year), [records, year])
  const mStats = useMemo(() => machineStats(records, year), [records, year])
  const opStats = useMemo(() => operatorStats(records, year), [records, year])

  const totalRecords = Object.values(byType).reduce((a, b) => a + b, 0)
  // 月度總量（全類型加總）給長條圖
  const monthTotals = Array.from({ length: 12 }, (_, i) =>
    RECORD_TYPES.reduce((sum, t) => sum + byMonth[t][i], 0),
  )
  const monthMax = Math.max(...monthTotals, 1)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>統計儀表板</h2>
          <select
            className="select"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            aria-label="統計年度"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y} 年
              </option>
            ))}
          </select>
          <span className="card-spacer" />
          <button className="icon-btn" onClick={onClose} title="關閉">
            ✕
          </button>
        </header>

        <div className="modal-body">
          {/* 總覽數字 */}
          <div className="stat-summary">
            <SummaryBox label="總記錄" value={String(totalRecords)} />
            <SummaryBox label="停機次數" value={String(dt.totalCount)} />
            <SummaryBox
              label="停機總時長"
              value={dt.totalMinutes ? formatDowntimeDuration(dt.totalMinutes) : '0 分鐘'}
            />
            <SummaryBox
              label="平均修復（MTTR）"
              value={dt.mttrMinutes ? formatDowntimeDuration(dt.mttrMinutes) : '—'}
            />
            <SummaryBox label="影響人數" value={String(dt.totalAffected)} />
          </div>

          {/* 各類型筆數 */}
          <section className="stat-section">
            <h3>各類型筆數</h3>
            <div className="type-count-grid">
              {RECORD_TYPES.map((t) => (
                <div key={t} className="type-count" style={{ borderLeftColor: typeColor(t) }}>
                  <span className="type-count-label">{SENSITIVITY[t].label}</span>
                  <span className="type-count-num">{byType[t]}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 月度分布 */}
          <section className="stat-section">
            <h3>月度分布（全類型）</h3>
            <div className="month-bars">
              {monthTotals.map((v, i) => (
                <div key={i} className="month-bar-col" title={`${i + 1} 月：${v} 筆`}>
                  <span className="month-bar-num">{v || ''}</span>
                  <div
                    className="month-bar"
                    style={{ height: `${Math.max((v / monthMax) * 100, v ? 6 : 2)}%` }}
                  />
                  <span className="month-bar-label">{i + 1}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 各機器統計 */}
          <section className="stat-section">
            <h3>各機器統計（機器處理 / 停機）</h3>
            {mStats.length === 0 ? (
              <p className="hint">本年度無機器處理或停機記錄</p>
            ) : (
              <table className="stat-table">
                <thead>
                  <tr>
                    <th>機器</th>
                    <th>機器處理</th>
                    <th>停機次數</th>
                    <th>停機時長</th>
                    <th>影響人數</th>
                  </tr>
                </thead>
                <tbody>
                  {mStats.map((s) => (
                    <tr key={s.machine}>
                      <td>{s.machine}</td>
                      <td>{s.machineCount}</td>
                      <td>{s.downtimeCount}</td>
                      <td>
                        {s.downtimeMinutes
                          ? formatDowntimeDuration(s.downtimeMinutes)
                          : '—'}
                      </td>
                      <td>{s.affectedPatients}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* 停機原因 */}
          {Object.keys(dt.byReason).length > 0 && (
            <section className="stat-section">
              <h3>停機原因分布</h3>
              <div className="reason-list">
                {Object.entries(dt.byReason)
                  .sort((a, b) => b[1] - a[1])
                  .map(([reason, n]) => (
                    <span key={reason} className="tag">
                      {reason} × {n}
                    </span>
                  ))}
              </div>
            </section>
          )}

          {/* 執行人統計 */}
          {opStats.length > 0 && (
            <section className="stat-section">
              <h3>執行人統計</h3>
              <table className="stat-table">
                <thead>
                  <tr>
                    <th>執行人</th>
                    <th>總筆數</th>
                    <th>明細</th>
                  </tr>
                </thead>
                <tbody>
                  {opStats.map((s) => (
                    <tr key={s.operator}>
                      <td>{s.operator}</td>
                      <td>{s.count}</td>
                      <td className="stat-detail">
                        {Object.entries(s.types)
                          .map(([t, n]) => `${SENSITIVITY[t as keyof typeof SENSITIVITY].label} ${n}`)
                          .join('、')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="summary-box">
      <span className="summary-num">{value}</span>
      <span className="summary-label">{label}</span>
    </div>
  )
}
