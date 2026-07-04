import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { RECORD_TYPES, SENSITIVITY, type QARecord } from '../db/database'
import { buildSummaryAOA, buildTypeSheetAOA } from '../logic/excelExport'

/**
 * PDF 匯出（V0.7.0）— 瀏覽器列印方案：
 * 渲染報告版面 → window.print() → 使用者於列印對話框選「另存為 PDF」。
 * 零依賴、零中文字型問題（用系統字型）。欄位重用 Excel 報告的 AOA builder，
 * 兩種匯出格式保證一致。
 * 已知取捨：頁碼由瀏覽器頁首/頁尾控制（Chrome 不支援 CSS margin box 內容），
 * 與 V4.0 fpdf2 的自繪頁碼不同。
 */
export function PrintReport({
  records,
  year,
  onDone,
}: {
  records: QARecord[]
  year: string
  onDone: () => void
}) {
  const yearText = year === 'all' ? '全年度' : `${year} 年度`
  const scoped =
    year === 'all' ? records : records.filter((r) => (r.date || '').startsWith(year))

  const summary = buildSummaryAOA(scoped, yearText)
  // summary AOA：0 院名、1 標題、2 產生時間、4 表頭、5.. 各型、末列總計

  useEffect(() => {
    const after = () => onDone()
    window.addEventListener('afterprint', after)
    // 等版面掛上後再叫列印
    const t = window.setTimeout(() => window.print(), 150)
    return () => {
      window.removeEventListener('afterprint', after)
      window.clearTimeout(t)
    }
  }, [onDone])

  // Portal 掛到 body：報告必須在 .app 外，否則列印時 .app{display:none} 會連報告一起藏（V0.7.0 空白 PDF 主因）
  return createPortal(
    <div className="print-report">
      <header className="pr-cover">
        <h1>{String(summary[0][0])}</h1>
        <h2>{String(summary[1][0])}</h2>
        <p className="pr-gen">{String(summary[2][0])}</p>
      </header>

      <table className="pr-table pr-summary">
        <thead>
          <tr>
            {summary[4].map((h, i) => (
              <th key={i}>{String(h)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {summary.slice(5).map((row, i) => (
            <tr key={i} className={i === summary.length - 6 ? 'pr-total' : undefined}>
              {row.map((c, j) => (
                <td key={j}>{String(c)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {RECORD_TYPES.map((t) => {
        const typeRecords = scoped.filter((r) => r.type === t)
        if (!typeRecords.length) return null
        const aoa = buildTypeSheetAOA(t, typeRecords)
        return (
          <section key={t} className="pr-section">
            <h3>{SENSITIVITY[t].label}（{typeRecords.length} 筆）</h3>
            <table className="pr-table">
              <thead>
                <tr>
                  {aoa[0].map((h, i) => (
                    <th key={i}>{String(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {aoa.slice(1).map((row, i) => (
                  <tr key={i}>
                    {row.map((c, j) => (
                      <td key={j}>{String(c)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )
      })}

      <footer className="pr-footer">RadOncQA · 彰濱秀傳紀念醫院 放射腫瘤科 品質保證資料庫</footer>
    </div>
  , document.body)
}
