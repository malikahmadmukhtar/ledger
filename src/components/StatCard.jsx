import React from 'react'
import { formatMoney } from '../format.js'

export default function StatCard({ label, value, tone = 'ink', suffix }) {
  const toneClass = {
    ink: 'text-ink',
    credit: 'text-credit',
    debit: 'text-debit',
    brass: 'text-brass',
  }[tone]

  return (
    <div className="border border-rule/60 bg-white/40 px-5 py-4">
      <p className="text-[11px] uppercase tracking-[0.15em] text-ink/45 mb-2">{label}</p>
      <p className={`font-mono text-2xl tabular-nums ${toneClass}`}>
        {formatMoney(value)}
        {suffix && <span className="text-sm text-ink/40 ml-1 font-body">{suffix}</span>}
      </p>
    </div>
  )
}
