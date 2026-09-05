import React, { createContext, useContext, useMemo, useState } from 'react'

const STORAGE_KEY = 'ledger_period'
const PeriodContext = createContext(null)

function currentMonthStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function monthBounds(monthStr) {
  const [y, m] = monthStr.split('-').map(Number)
  const from = `${monthStr}-01`
  const lastDay = new Date(y, m, 0).getDate()
  const to = `${monthStr}-${String(lastDay).padStart(2, '0')}`
  return { from, to }
}

function formatMonthLabel(monthStr) {
  const [y, m] = monthStr.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleString('en-PK', { month: 'short', year: 'numeric' })
}

function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.mode) return null
    return parsed
  } catch {
    return null
  }
}

function toApiEnd(dateStr) {
  if (!dateStr) return undefined
  return `${dateStr}T23:59:59.999`
}

export function PeriodProvider({ children }) {
  const stored = loadStored()
  const [mode, setMode] = useState(stored?.mode || 'thisMonth')
  const [month, setMonth] = useState(stored?.month || currentMonthStr())
  const [from, setFrom] = useState(stored?.from || todayStr())
  const [to, setTo] = useState(stored?.to || todayStr())

  function persist(next) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  function updatePeriod(patch) {
    const next = {
      mode: patch.mode ?? mode,
      month: patch.month ?? month,
      from: patch.from ?? from,
      to: patch.to ?? to,
    }
    if (patch.mode != null) setMode(patch.mode)
    if (patch.month != null) setMonth(patch.month)
    if (patch.from != null) setFrom(patch.from)
    if (patch.to != null) setTo(patch.to)
    persist(next)
  }

  const range = useMemo(() => {
    const thisMonth = currentMonthStr()

    if (mode === 'all') {
      return {
        from: null,
        to: null,
        apiFrom: undefined,
        apiTo: undefined,
        isDefaultMonth: false,
        isAllTime: true,
        label: 'All time',
        formDate: todayStr(),
        cumulativeBalances: false,
      }
    }

    if (mode === 'thisMonth') {
      const bounds = monthBounds(thisMonth)
      return {
        from: bounds.from,
        to: bounds.to,
        apiFrom: bounds.from,
        apiTo: toApiEnd(bounds.to),
        isDefaultMonth: true,
        isAllTime: false,
        label: 'This month',
        formDate: todayStr(),
        cumulativeBalances: true,
      }
    }

    if (mode === 'month') {
      const bounds = monthBounds(month || thisMonth)
      return {
        from: bounds.from,
        to: bounds.to,
        apiFrom: bounds.from,
        apiTo: toApiEnd(bounds.to),
        isDefaultMonth: false,
        isAllTime: false,
        label: formatMonthLabel(month || thisMonth),
        formDate: bounds.from,
        cumulativeBalances: false,
      }
    }

    const safeFrom = from || todayStr()
    const safeTo = to || todayStr()
    return {
      from: safeFrom,
      to: safeTo,
      apiFrom: safeFrom,
      apiTo: toApiEnd(safeTo),
      isDefaultMonth: false,
      isAllTime: false,
      label: `${safeFrom} – ${safeTo}`,
      formDate: safeFrom,
      cumulativeBalances: false,
    }
  }, [mode, month, from, to])

  function getQueryParams({ forBalances = false } = {}) {
    if (range.isAllTime) return {}
    if (forBalances && range.cumulativeBalances) return {}
    const params = {}
    if (range.apiFrom) params.from = range.apiFrom
    if (range.apiTo) params.to = range.apiTo
    return params
  }

  const value = {
    mode,
    month,
    from,
    to,
    range,
    updatePeriod,
    getQueryParams,
    setMode: (m) => updatePeriod({ mode: m }),
    setMonth: (m) => updatePeriod({ mode: 'month', month: m }),
    setFrom: (v) => updatePeriod({ mode: 'custom', from: v }),
    setTo: (v) => updatePeriod({ mode: 'custom', to: v }),
  }

  return <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>
}

export function usePeriod() {
  const ctx = useContext(PeriodContext)
  if (!ctx) throw new Error('usePeriod must be used within PeriodProvider')
  return ctx
}
