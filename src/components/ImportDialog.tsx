import { useRef, useState } from 'react'
import { db, type QARecord } from '../db/database'
import type { NewRecord } from '../db/crud'
import {
  parseDataAOA,
  splitDuplicates,
  type ImportError,
} from '../logic/excelImport'

type Phase =
  | { step: 'pick' }
  | {
      step: 'preview'
      fresh: NewRecord[]
      duplicates: NewRecord[]
      errors: ImportError[]
      fileName: string
    }
  | { step: 'done'; imported: number; skipped: number }

export function ImportDialog({
  existing,
  onClose,
  onImported,
}: {
  existing: QARecord[]
  onClose: () => void
  onImported: () => void
}) {
  const [phase, setPhase] = useState<Phase>({ step: 'pick' })
  const [includeDup, setIncludeDup] = useState(false)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function onFile(f: File) {
    setBusy(true)
    try {
      const X = await import('xlsx')
      const buf = await f.arrayBuffer()
      const wb = X.read(buf, { cellDates: false })
      const sheetName = wb.SheetNames.includes('資料') ? '資料' : wb.SheetNames[0]
      const aoa = X.utils.sheet_to_json(wb.Sheets[sheetName], {
        header: 1,
        raw: false,
        dateNF: 'yyyy-mm-dd',
        defval: '',
      }) as (string | number)[][]
      const { records, errors } = parseDataAOA(aoa)
      const { fresh, duplicates } = splitDuplicates(records, existing)
      setPhase({ step: 'preview', fresh, duplicates, errors, fileName: f.name })
    } catch (e) {
      alert(`讀取失敗：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  async function doImport() {
    if (phase.step !== 'preview') return
    setBusy(true)
    const toAdd = includeDup ? [...phase.fresh, ...phase.duplicates] : phase.fresh
    const now = new Date().toISOString()
    await db.records.bulkAdd(
      toAdd.map((r) => ({ ...r, createdAt: now, updatedAt: now })),
    )
    setBusy(false)
    setPhase({
      step: 'done',
      imported: toAdd.length,
      skipped: includeDup ? 0 : phase.duplicates.length,
    })
    onImported()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>資料匯入</h2>
          <button className="icon-btn" onClick={onClose} title="關閉">
            ✕
          </button>
        </header>

        <div className="modal-body">
          {phase.step === 'pick' && (
            <>
              <p className="hint">
                選擇「資料匯出（可再匯入）」產生的 Excel 檔（.xlsx）。舊版 14
                欄格式也支援。
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                disabled={busy}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) onFile(f)
                }}
              />
              {busy && <p className="hint">解析中…</p>}
            </>
          )}

          {phase.step === 'preview' && (
            <>
              <p className="import-file">{phase.fileName}</p>
              <div className="import-counts">
                <span className="import-ok">可匯入 {phase.fresh.length} 筆</span>
                <span className="import-dup">重複 {phase.duplicates.length} 筆</span>
                <span className="import-err">錯誤 {phase.errors.length} 筆</span>
              </div>

              {phase.duplicates.length > 0 && (
                <label className="crossday-toggle">
                  <input
                    type="checkbox"
                    checked={includeDup}
                    onChange={(e) => setIncludeDup(e.target.checked)}
                  />
                  <span>連重複的一起匯入（重複判斷：型別＋日期＋機器）</span>
                </label>
              )}

              {phase.errors.length > 0 && (
                <div className="import-errors">
                  <p className="detail-label">錯誤明細（這些列不會匯入）</p>
                  <ul>
                    {phase.errors.slice(0, 20).map((e, i) => (
                      <li key={i}>
                        第 {e.rowNumber} 列：{e.reason}
                      </li>
                    ))}
                    {phase.errors.length > 20 && (
                      <li>… 其餘 {phase.errors.length - 20} 筆略</li>
                    )}
                  </ul>
                </div>
              )}
            </>
          )}

          {phase.step === 'done' && (
            <p>
              ✓ 已匯入 {phase.imported} 筆
              {phase.skipped > 0 && `，跳過重複 ${phase.skipped} 筆`}。
            </p>
          )}
        </div>

        <footer className="modal-foot">
          {phase.step === 'preview' && (
            <>
              <button
                className="btn-ghost"
                onClick={() => setPhase({ step: 'pick' })}
              >
                重選檔案
              </button>
              <span className="card-spacer" />
              <button className="btn-ghost" onClick={onClose}>
                取消
              </button>
              <button
                className="btn-primary"
                disabled={
                  busy ||
                  (includeDup
                    ? phase.fresh.length + phase.duplicates.length === 0
                    : phase.fresh.length === 0)
                }
                onClick={doImport}
              >
                {busy ? '匯入中…' : '確認匯入'}
              </button>
            </>
          )}
          {phase.step !== 'preview' && (
            <button className="btn-primary" onClick={onClose}>
              關閉
            </button>
          )}
        </footer>
      </div>
    </div>
  )
}
