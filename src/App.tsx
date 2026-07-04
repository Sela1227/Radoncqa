import { useCallback, useEffect, useState } from 'react'
import {
  advancedSearch,
  availableYears,
  deleteRecord,
  distinctMachines,
  distinctOperators,
  isAdvancedEmpty,
  listRecords,
  EMPTY_ADVANCED,
  type AdvancedFilter,
  type RecordFilter,
  type TabKey,
} from './db/crud'
import { db, type QARecord, type RecordType } from './db/database'
import { getOverdueQA, type OverdueItem } from './logic/reminder'
import { TabBar } from './components/TabBar'
import { FilterBar } from './components/FilterBar'
import { CardList } from './components/CardList'
import { BottomBar } from './components/BottomBar'
import { RecordForm } from './components/RecordForm'
import { DetailPanel } from './components/DetailPanel'
import { ReminderBanner } from './components/ReminderBanner'
import { AdvancedSearchDialog } from './components/AdvancedSearchDialog'
import { StatsDashboard } from './components/StatsDashboard'
import { exportDataXlsx, exportReportXlsx } from './logic/excelExport'
import { PrintReport } from './components/PrintReport'
import { ImportDialog } from './components/ImportDialog'
import { SettingsDialog, type ScheduleOverride } from './components/SettingsDialog'
import { buildBackup, downloadBackup, parseBackup, restoreBackup } from './logic/backup'
import { getSetting, listMaster } from './db/crud'

const VERSION = 'V1.1.0'

type FormState =
  | { mode: 'closed' }
  | { mode: 'add'; type: RecordType }
  | { mode: 'edit'; record: QARecord }

export default function App() {
  const [filter, setFilter] = useState<RecordFilter>({
    tab: 'overview',
    year: 'all',
    machine: 'all',
    keyword: '',
  })
  const [records, setRecords] = useState<QARecord[]>([])
  const [years, setYears] = useState<string[]>([])
  const [machines, setMachines] = useState<string[]>([])
  const [operators, setOperators] = useState<string[]>([])
  const [form, setForm] = useState<FormState>({ mode: 'closed' })
  const [selected, setSelected] = useState<QARecord | null>(null)

  // 提醒（真邏輯）
  const [overdue, setOverdue] = useState<OverdueItem[]>([])
  const [reminderDismissed, setReminderDismissed] = useState(false)

  // 進階搜尋模式
  const [advOpen, setAdvOpen] = useState(false)
  const [statsOpen, setStatsOpen] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])
  const [masterMachines, setMasterMachines] = useState<string[]>([])
  const [masterOperators, setMasterOperators] = useState<string[]>([])
  const [masterReasons, setMasterReasons] = useState<string[]>([])
  const [allRecords, setAllRecords] = useState<QARecord[]>([])
  const [adv, setAdv] = useState<AdvancedFilter>(EMPTY_ADVANCED)
  const advActive = !isAdvancedEmpty(adv)

  const reloadMeta = useCallback(async () => {
    setYears(await availableYears())
    setMachines(await distinctMachines())
    setOperators(await distinctOperators())
    const all = await db.records.toArray()
    setAllRecords(all)
    const [mm, mo, mr, sched] = await Promise.all([
      listMaster('machine'),
      listMaster('operator'),
      listMaster('downtime_reason'),
      getSetting<ScheduleOverride | null>('qa_schedule', null),
    ])
    setMasterMachines(mm.map((m) => m.value))
    setMasterOperators(mo.map((m) => m.value))
    setMasterReasons(mr.map((m) => m.value))
    setOverdue(getOverdueQA(all, new Date(), sched ?? undefined))
  }, [])

  const reloadList = useCallback(async () => {
    if (advActive) {
      setRecords(await advancedSearch(adv))
    } else {
      setRecords(await listRecords(filter))
    }
  }, [filter, adv, advActive])

  useEffect(() => {
    reloadMeta()
  }, [reloadMeta])
  useEffect(() => {
    reloadList()
  }, [reloadList])

  const patchFilter = (patch: Partial<RecordFilter>) =>
    setFilter((f) => ({ ...f, ...patch }))

  async function refresh() {
    await reloadList()
    await reloadMeta()
  }

  async function onDelete(id: number) {
    if (!confirm('確定刪除這筆記錄？')) return
    await deleteRecord(id)
    setSelected(null)
    await refresh()
  }

  async function onSaved() {
    setForm({ mode: 'closed' })
    await refresh()
  }

  const merge = (master: string[], derived: string[]) => [
    ...master,
    ...derived.filter((d) => !master.includes(d)),
  ]
  const formMachines = merge(masterMachines, machines)
  const formOperators = merge(masterOperators, operators)

  const addType: RecordType =
    filter.tab === 'overview' ? 'daily' : (filter.tab as RecordType)

  return (
    <div className="app">
      <header className="appbar">
        <img src="/sela.svg" alt="SELA" width={26} height={26} />
        <span className="appbar-title">RadOncQA</span>
        <span className="appbar-sub">放射腫瘤科 QA 資料庫</span>
        <span className="card-spacer" />
        {!online && <span className="offline-chip">離線中 · 資料照常可用</span>}
        <span className="appbar-ver">{VERSION}</span>
      </header>

      {!reminderDismissed && (
        <ReminderBanner
          items={overdue}
          onDismiss={() => setReminderDismissed(true)}
        />
      )}

      <div className="container">
        <div className="command-deck">
          <TabBar
            active={filter.tab}
            onChange={(tab: TabKey) => patchFilter({ tab })}
          />

          <FilterBar
            filter={filter}
            years={years}
            machines={machines}
            onChange={patchFilter}
            onAdd={() => setForm({ mode: 'add', type: addType })}
            onAdvanced={() => setAdvOpen(true)}
          />
        </div>

        {advActive && (
          <div className="search-indicator">
            <span>
              進階搜尋中 — {records.length} 筆結果（分頁/篩選暫停作用）
            </span>
            <button className="btn-ghost" onClick={() => setAdv(EMPTY_ADVANCED)}>
              清除搜尋
            </button>
          </div>
        )}

        <main className="content">
          <CardList
            records={records}
            onSelect={setSelected}
            onAdd={() => setForm({ mode: 'add', type: addType })}
          />
        </main>
      </div>

      <button
        className="fab"
        onClick={() => setForm({ mode: 'add', type: addType })}
        aria-label="新增記錄"
      >
        ＋ 新增
      </button>

      <BottomBar
        onStats={() => setStatsOpen(true)}
        onExportReport={() => {
          if (!allRecords.length) {
            alert('目前沒有任何記錄可匯出')
            return
          }
          exportReportXlsx(allRecords, filter.year).catch((e) =>
            alert(`Excel 匯出失敗：${String(e)}\n\n若訊息含「Failed to fetch」或「xlsx」，請關閉後重新執行 start-dev.bat（會自動補裝套件）。`),
          )
        }}
        onExportData={() => {
          if (!allRecords.length) {
            alert('目前沒有任何記錄可匯出')
            return
          }
          exportDataXlsx(allRecords).catch((e) =>
            alert(`資料匯出失敗：${String(e)}\n\n若訊息含「Failed to fetch」或「xlsx」，請關閉後重新執行 start-dev.bat（會自動補裝套件）。`),
          )
        }}
        onExportPdf={() => {
          if (!allRecords.length) {
            alert('目前沒有任何記錄可匯出')
            return
          }
          setPrinting(true)
        }}
        onImport={() => setImportOpen(true)}
        onBackup={async () => {
          downloadBackup(await buildBackup())
        }}
        onRestore={() => {
          const input = document.createElement('input')
          input.type = 'file'
          input.accept = '.json,application/json'
          input.onchange = async () => {
            const f = input.files?.[0]
            if (!f) return
            const parsed = parseBackup(await f.text())
            if (!parsed.ok) {
              alert(`還原失敗：${parsed.reason}`)
              return
            }
            const c = parsed.payload.counts
            if (
              !confirm(
                `注意：還原會「清空現有全部資料」並以備份內容取代：\n` +
                  `記錄 ${c.records} 筆、主檔 ${c.master} 筆、設定 ${c.settings} 筆\n` +
                  `（備份時間 ${parsed.payload.exportedAt.slice(0, 16).replace('T', ' ')}）\n\n確定繼續？`,
              )
            )
              return
            if (!confirm('最後確認：現有資料將被覆蓋且無法復原。確定還原？')) return
            await restoreBackup(parsed.payload)
            await refresh()
            alert('✓ 還原完成')
          }
          input.click()
        }}
        onSettings={() => setSettingsOpen(true)}
      />

      {settingsOpen && (
        <SettingsDialog
          onClose={() => setSettingsOpen(false)}
          onChanged={() => reloadMeta()}
        />
      )}

      {importOpen && (
        <ImportDialog
          existing={allRecords}
          onClose={() => setImportOpen(false)}
          onImported={() => refresh()}
        />
      )}

      {printing && (
        <PrintReport
          records={allRecords}
          year={filter.year}
          onDone={() => setPrinting(false)}
        />
      )}

      {form.mode !== 'closed' && (
        <RecordForm
          type={form.mode === 'add' ? form.type : form.record.type}
          record={form.mode === 'edit' ? form.record : undefined}
          machines={formMachines}
          operators={formOperators}
          reasons={masterReasons}
          onClose={() => setForm({ mode: 'closed' })}
          onSaved={onSaved}
        />
      )}

      {selected && (
        <DetailPanel
          record={selected}
          onClose={() => setSelected(null)}
          onEdit={() => {
            setForm({ mode: 'edit', record: selected })
            setSelected(null)
          }}
          onDelete={() => selected.id != null && onDelete(selected.id)}
        />
      )}

      {statsOpen && (
        <StatsDashboard
          records={allRecords}
          years={years}
          onClose={() => setStatsOpen(false)}
        />
      )}

      {advOpen && (
        <AdvancedSearchDialog
          initial={adv}
          machines={formMachines}
          operators={formOperators}
          onClose={() => setAdvOpen(false)}
          onApply={(f) => {
            setAdv(f)
            setAdvOpen(false)
          }}
        />
      )}
    </div>
  )
}
