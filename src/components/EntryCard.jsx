import React from 'react'
import { shortDate } from '../format.js'

export default function EntryCard({ date, primary, secondary, amount, amountClassName, actions }) {
  return (
    <div className="border-b border-rule/30 last:border-0 px-4 py-3 hover:bg-white/40">
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {date && <span className="font-mono text-xs text-ink/50 shrink-0">{shortDate(date)}</span>}
            <span className="text-sm truncate">{primary}</span>
          </div>
          {secondary && <p className="text-xs text-ink/50 mt-0.5 truncate">{secondary}</p>}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {amount && <span className={`font-mono text-sm ${amountClassName || ''}`}>{amount}</span>}
          {actions}
        </div>
      </div>
    </div>
  )
}
