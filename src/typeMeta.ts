import { SENSITIVITY, type RecordType } from './db/database'

export type FieldKey = 'notes' | 'problem' | 'solution' | 'downtimeBasic'

export interface TypeForm {
  color: string
  machine: 'required' | 'optional'
  fields: FieldKey[]
}

// 型別顏色沿用 V4.0（略調和入北歐霧藍），機器必填/可選與專屬欄位依 V4.0 _build_dynamic_fields
export const TYPE_FORM: Record<RecordType, TypeForm> = {
  daily: { color: '#5b8fb0', machine: 'optional', fields: ['notes'] },
  monthly: { color: '#6aa67a', machine: 'optional', fields: ['notes'] },
  yearly: { color: '#d98a4a', machine: 'optional', fields: ['notes'] },
  machine: { color: '#8a9ba8', machine: 'required', fields: ['problem', 'solution'] },
  plan_issue: {
    color: '#c79a3a',
    machine: 'optional',
    fields: ['problem', 'solution'],
  },
  downtime: { color: '#b5675f', machine: 'required', fields: ['downtimeBasic'] },
}

export const typeLabel = (t: RecordType): string => SENSITIVITY[t].label
export const typeColor = (t: RecordType): string => TYPE_FORM[t].color
