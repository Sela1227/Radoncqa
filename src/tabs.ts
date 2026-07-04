import { SENSITIVITY, type RecordType } from './db/database'
import type { TabKey } from './db/crud'

export interface TabDef {
  key: TabKey
  label: string
}

export const TABS: TabDef[] = [
  { key: 'overview', label: '總覽' },
  ...(Object.keys(SENSITIVITY) as RecordType[]).map((k) => ({
    key: k as TabKey,
    label: SENSITIVITY[k].label,
  })),
]
