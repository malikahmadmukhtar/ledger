import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../api.js'
import { formatMoney, shortDate } from '../format.js'
import EntryCard from './EntryCard.jsx'

export default function TransactionManager({ type, title, categories, tone }) {
  const { token } = useAuth()
  const [items, setItems] = useState([])
  const [category, setCategory] = useState(categories[0])
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const toneAmount = tone === 'credit' ? 'amount-credit' : 'amount-debit'
  const sign = type === 'income' ? '+' : '-'

  function load() {
    api.listTransactions(token, { type }).then(setItems).catch(() => {})
  }

  useEffect(load, [token, type])

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!amount || Number(amount) <= 0) return setError('Enter an amount greater than 0')
    try {
      await api.createTransaction(token, { type, category, amount: Number(amount), date, note })
      setAmount('')
      setNote('')
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function remove(id) {
    await api.deleteTransaction(token, id)
    load()
  }

  const total = items.reduce((s, t) => s + t.amount, 0)

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between">
        <h1 className="font-display text-3xl">{title}</h1>
        <p className={`font-mono text-xl ${toneAmount}`}>{formatMoney(total, { sign })} <span className="text-xs text-ink/40 font-body">total logged</span></p>
      </header>

      <form onSubmit={submit} className="border border-rule/60 bg-white/40 p-5 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
        <div className="md:col-span-1">
          <label className="block text-[11px] uppercase tracking-wider text-ink/45 mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border-b border-rule bg-transparent py-1.5 outline-none focus:border-brass"
          >
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-ink/45 mb-1">Amount</label>
          <input
            type="number" step="0.01" min="0" value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border-b border-rule bg-transparent py-1.5 outline-none focus:border-brass font-mono"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-ink/45 mb-1">Date</label>
          <input
            type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full border-b border-rule bg-transparent py-1.5 outline-none focus:border-brass"
          />
        </div>
        <div className="md:col-span-1">
          <label className="block text-[11px] uppercase tracking-wider text-ink/45 mb-1">Note</label>
          <input
            value={note} onChange={(e) => setNote(e.target.value)}
            className="w-full border-b border-rule bg-transparent py-1.5 outline-none focus:border-brass"
            placeholder="Optional"
          />
        </div>
        <button className="w-full md:w-auto bg-ink text-paper py-2 uppercase text-xs tracking-[0.15em] hover:bg-ink-light transition-colors">
          Add entry
        </button>
      </form>
      {error && <p className="text-debit text-sm -mt-4">{error}</p>}

      <div className="border border-rule/60 bg-white/40 md:hidden">
        {items.length === 0 && (
          <p className="py-8 text-center text-ink/40 text-sm">Nothing logged yet — add your first entry above.</p>
        )}
        {items.map((t) => (
          <EntryCard
            key={t._id}
            date={t.date}
            primary={t.category}
            secondary={t.note}
            amount={formatMoney(t.amount, { sign })}
            amountClassName={toneAmount}
            actions={
              <button onClick={() => remove(t._id)} className="text-ink/30 hover:text-debit text-xs">remove</button>
            }
          />
        ))}
      </div>

      <div className="border border-rule/60 bg-white/40 hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-ink/45 border-b border-rule/50">
              <th className="py-2 px-4 font-normal">Date</th>
              <th className="py-2 px-4 font-normal">Category</th>
              <th className="py-2 px-4 font-normal">Note</th>
              <th className="py-2 px-4 font-normal text-right">Amount</th>
              <th className="py-2 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-ink/40">Nothing logged yet — add your first entry above.</td></tr>
            )}
            {items.map((t) => (
              <tr key={t._id} className="border-b border-rule/30 last:border-0 hover:bg-white/40">
                <td className="py-2 px-4 font-mono text-ink/60">{shortDate(t.date)}</td>
                <td className="py-2 px-4">{t.category}</td>
                <td className="py-2 px-4 text-ink/50">{t.note}</td>
                <td className={`py-2 px-4 text-right font-mono ${toneAmount}`}>{formatMoney(t.amount, { sign })}</td>
                <td className="py-2 px-4 text-right">
                  <button onClick={() => remove(t._id)} className="text-ink/30 hover:text-debit text-xs">remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
