import { useState } from 'react'

export function BottomBar({
  onStats,
  onExportReport,
  onExportData,
  onExportPdf,
  onImport,
  onBackup,
  onRestore,
  onSettings,
}: {
  onStats: () => void
  onExportReport: () => void
  onExportData: () => void
  onExportPdf: () => void
  onImport: () => void
  onBackup: () => void
  onRestore: () => void
  onSettings: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="bottombar">
      <button className="btn-ghost" onClick={onExportReport}>
        匯出 Excel
      </button>
      <button className="btn-ghost" onClick={onExportPdf}>
        匯出 PDF
      </button>
      <button className="btn-ghost" onClick={onStats}>
        統計儀表板
      </button>
      <span className="card-spacer" />
      <div className="overflow">
        <button
          className="btn-ghost"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          ⋯ 更多
        </button>
        {open && (
          <div className="overflow-menu" onMouseLeave={() => setOpen(false)}>
            <button
              className="overflow-item"
              onClick={() => {
                setOpen(false)
                onExportData()
              }}
            >
              資料匯出（可再匯入）
            </button>
            <button
              className="overflow-item"
              onClick={() => {
                setOpen(false)
                onImport()
              }}
            >
              資料匯入
            </button>
            {(
              [
                ['備份', onBackup],
                ['還原', onRestore],
                ['設定', onSettings],
              ] as const
            ).map(([label, fn]) => (
              <button
                key={label}
                className="overflow-item"
                onClick={() => {
                  setOpen(false)
                  fn()
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
