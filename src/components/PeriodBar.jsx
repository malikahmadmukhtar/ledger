import React, { useState } from 'react'
import { usePeriod } from '../context/PeriodContext.jsx'

const MODES = [
  { id: 'thisMonth', label: 'This month' },
  { id: 'month', label: 'Month' },
  { id: 'custom', label: 'Custom' },
  { id: 'all', label: 'All time' },
]

export default function PeriodBar() {
  const { mode, month, from, to, updatePeriod, setMode } = usePeriod()
  const [error, setError] = useState('')

  function selectMode(id) {
    setError('')
    setMode(id)
  }

  function onCustomFrom(v) {
    setError('')
    if (to && v > to) {
      setError('From date must be on or before To date')
      return
    }
    updatePeriod({ mode: 'custom', from: v })
  }

  function onCustomTo(v) {
    setError('')
    if (from && v < from) {
      setError('To date must be on or after From date')
      return
    }
    updatePeriod({ mode: 'custom', to: v })
  }

  return (
    <div className="mb-6 border border-rule/60 bg-white/40 px-3 py-3 md:px-4 space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[10px] uppercase tracking-[0.15em] text-ink/45 mr-1">Period</span>
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => selectMode(m.id)}
            className={`text-[10px] md:text-xs uppercase tracking-wider pb-0.5 border-b-2 transition-colors ${
              mode === m.id ? 'border-brass text-ink' : 'border-transparent text-ink/40 hover:text-ink/70'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === 'month' && (
        <div className="max-w-[11rem]">
          <label className="block text-[10px] uppercase tracking-wider text-ink/45 mb-1">Month</label>
          <input
            type="month"
            value={month}
            onChange={(e) => updatePeriod({ mode: 'month', month: e.target.value })}
            className="w-full border-b border-rule bg-transparent py-1 outline-none focus:border-brass font-mono text-sm"
          />
        </div>
      )}

      {mode === 'custom' && (
        <div className="flex flex-wrap gap-3 items-end">
          <div className="min-w-[8.5rem] flex-1">
            <label className="block text-[10px] uppercase tracking-wider text-ink/45 mb-1">From</label>
            <input
              type="date"
              value={from}
              required
              onChange={(e) => onCustomFrom(e.target.value)}
              className="w-full border-b border-rule bg-transparent py-1 outline-none focus:border-brass font-mono text-sm"
            />
          </div>
          <div className="min-w-[8.5rem] flex-1">
            <label className="block text-[10px] uppercase tracking-wider text-ink/45 mb-1">To</label>
            <input
              type="date"
              value={to}
              required
              onChange={(e) => onCustomTo(e.target.value)}
              className="w-full border-b border-rule bg-transparent py-1 outline-none focus:border-brass font-mono text-sm"
            />
          </div>
        </div>
      )}

      {error && <p className="text-debit text-xs">{error}</p>}
    </div>
  )
}
