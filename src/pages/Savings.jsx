import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { usePeriod } from '../context/PeriodContext.jsx'
import { api } from '../api.js'
import { formatMoney } from '../format.js'

export default function Savings() {
  const { token } = useAuth()
  const { range, getQueryParams } = usePeriod()
  const [goals, setGoals] = useState([])
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [error, setError] = useState('')
  const [contribError, setContribError] = useState('')
  const [contribAmount, setContribAmount] = useState({})

  function load() {
    api.listSavings(token, getQueryParams({ forBalances: true })).then(setGoals).catch(() => {})
  }

  useEffect(load, [token, range.apiFrom, range.apiTo, range.isAllTime, range.cumulativeBalances])

  async function createGoal(e) {
    e.preventDefault()
    setError('')
    if (!name.trim()) return setError('Give the goal a name')
    try {
      await api.createSavings(token, { name: name.trim(), targetAmount: Number(target) || 0 })
      setName(''); setTarget('')
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function contribute(id) {
    setContribError('')
    const amount = Number(contribAmount[id])
    if (!amount || amount <= 0) {
      setContribError('Enter an amount greater than 0')
      return
    }
    try {
      await api.contributeSavings(token, id, { amount, date: range.formDate })
      setContribAmount((s) => ({ ...s, [id]: '' }))
      load()
    } catch (err) {
      setContribError(err.message)
    }
  }

  async function remove(id) {
    await api.deleteSavings(token, id)
    load()
  }

  const totalSaved = goals.reduce((s, g) => s + g.contributions.reduce((a, c) => a + c.amount, 0), 0)
  const totalLabel = range.cumulativeBalances ? 'saved in total' : `saved · ${range.label}`

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between">
        <h1 className="font-display text-3xl">Savings</h1>
        <p className="font-mono text-xl text-brass">{formatMoney(totalSaved)} <span className="text-xs text-ink/40 font-body">{totalLabel}</span></p>
      </header>

      <form onSubmit={createGoal} className="border border-rule/60 bg-white/40 p-5 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <div className="md:col-span-2">
          <label className="block text-[11px] uppercase tracking-wider text-ink/45 mb-1">Goal name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required
            className="w-full border-b border-rule bg-transparent py-1.5 outline-none focus:border-brass" placeholder="e.g. Emergency fund" />
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-ink/45 mb-1">Target (optional)</label>
          <input type="number" step="0.01" min="0" value={target} onChange={(e) => setTarget(e.target.value)}
            className="w-full border-b border-rule bg-transparent py-1.5 outline-none focus:border-brass font-mono" placeholder="0.00" />
        </div>
        <button className="bg-ink text-paper py-2 uppercase text-xs tracking-[0.15em] hover:bg-ink-light transition-colors">
          Create goal
        </button>
      </form>
      {error && <p className="text-debit text-sm -mt-4">{error}</p>}
      {contribError && <p className="text-debit text-sm">{contribError}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.length === 0 && (
          <p className="text-ink/40 text-sm">
            {range.cumulativeBalances
              ? 'No savings goals yet — create one above.'
              : `No savings activity in ${range.label}.`}
          </p>
        )}
        {goals.map((g) => {
          const current = g.contributions.reduce((a, c) => a + c.amount, 0)
          const pct = g.targetAmount ? Math.min(100, (current / g.targetAmount) * 100) : null
          return (
            <div key={g._id} className="border border-rule/60 bg-white/40 p-5">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-display text-lg">{g.name}</h3>
                <button onClick={() => remove(g._id)} className="text-ink/30 hover:text-debit text-xs">remove</button>
              </div>
              <p className="font-mono text-brass text-xl">
                {formatMoney(current)}
                {g.targetAmount ? <span className="text-ink/40 text-sm"> / {formatMoney(g.targetAmount)}</span> : null}
              </p>
              {pct != null && (
                <div className="h-2 bg-rule/30 rounded-full overflow-hidden mt-2 mb-4">
                  <div className="h-full bg-brass rounded-full" style={{ width: `${pct}%` }} />
                </div>
              )}
              <div className="flex gap-2 mt-3">
                <input
                  type="number" step="0.01" min="0.01"
                  value={contribAmount[g._id] || ''}
                  onChange={(e) => setContribAmount((s) => ({ ...s, [g._id]: e.target.value }))}
                  placeholder="Add amount"
                  className="flex-1 border-b border-rule bg-transparent py-1.5 outline-none focus:border-brass font-mono text-sm"
                />
                <button onClick={() => contribute(g._id)} className="text-xs uppercase tracking-wider text-brass hover:underline">
                  Add to savings
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
