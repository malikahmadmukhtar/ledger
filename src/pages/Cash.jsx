import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { usePeriod } from '../context/PeriodContext.jsx'
import { api } from '../api.js'
import { formatMoney, shortDate } from '../format.js'
import EntryCard from '../components/EntryCard.jsx'

export default function Cash() {
  const { token } = useAuth()
  const { range, getQueryParams } = usePeriod()
  const [items, setItems] = useState([])
  const [direction, setDirection] = useState('lent')
  const [person, setPerson] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(range.formDate)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('open')

  useEffect(() => {
    setDate(range.formDate)
  }, [range.formDate])

  function load() {
    const params = {
      ...(filter === 'open' ? { settled: 'false' } : filter === 'settled' ? { settled: 'true' } : {}),
      ...getQueryParams({ forBalances: true }),
    }
    api.listCash(token, params).then(setItems).catch(() => {})
  }

  useEffect(load, [token, filter, range.apiFrom, range.apiTo, range.isAllTime, range.cumulativeBalances])

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!person.trim()) return setError('Enter who this involves')
    if (!amount || Number(amount) <= 0) return setError('Enter an amount greater than 0')
    try {
      await api.createCash(token, {
        direction,
        person: person.trim(),
        amount: Number(amount),
        date,
        note: note.trim(),
      })
      setPerson(''); setAmount(''); setNote('')
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function settle(id) {
    await api.settleCash(token, id)
    load()
  }

  async function remove(id) {
    await api.deleteCash(token, id)
    load()
  }

  const owedToMe = items.filter(i => i.direction === 'lent' && !i.settled).reduce((s, i) => s + i.amount, 0)
  const iOwe = items.filter(i => i.direction === 'borrowed' && !i.settled).reduce((s, i) => s + i.amount, 0)
  const emptyMsg = range.cumulativeBalances
    ? 'Nothing here yet.'
    : `No cash entries in ${range.label}.`

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl">Cash — Give & Take</h1>
        <p className="text-ink/50 text-sm mt-1">
          Money you've lent out or borrowed, until it's settled.
          {range.cumulativeBalances ? '' : ` Showing ${range.label}.`}
        </p>
      </header>

      <section className="grid grid-cols-2 gap-4">
        <div className="border border-rule/60 bg-white/40 px-5 py-4">
          <p className="text-[11px] uppercase tracking-[0.15em] text-ink/45 mb-2">Owed to me</p>
          <p className="amount-credit text-2xl">{formatMoney(owedToMe)}</p>
        </div>
        <div className="border border-rule/60 bg-white/40 px-5 py-4">
          <p className="text-[11px] uppercase tracking-[0.15em] text-ink/45 mb-2">I owe</p>
          <p className="amount-debit text-2xl">{formatMoney(iOwe)}</p>
        </div>
      </section>

      <form onSubmit={submit} className="border border-rule/60 bg-white/40 p-5 grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-ink/45 mb-1">Direction</label>
          <select
            value={direction} onChange={(e) => setDirection(e.target.value)}
            className="w-full border-b border-rule bg-transparent py-1.5 outline-none focus:border-brass"
          >
            <option value="lent">I gave (they owe me)</option>
            <option value="borrowed">I took (I owe them)</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-ink/45 mb-1">Person</label>
          <input value={person} onChange={(e) => setPerson(e.target.value)} required
            className="w-full border-b border-rule bg-transparent py-1.5 outline-none focus:border-brass" placeholder="Name" />
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-ink/45 mb-1">Amount</label>
          <input type="number" step="0.01" min="0.01" value={amount} required onChange={(e) => setAmount(e.target.value)}
            className="w-full border-b border-rule bg-transparent py-1.5 outline-none focus:border-brass font-mono" placeholder="0.00" />
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-ink/45 mb-1">Date</label>
          <input type="date" value={date} required onChange={(e) => setDate(e.target.value)}
            className="w-full border-b border-rule bg-transparent py-1.5 outline-none focus:border-brass" />
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-ink/45 mb-1">Note</label>
          <input value={note} onChange={(e) => setNote(e.target.value)}
            className="w-full border-b border-rule bg-transparent py-1.5 outline-none focus:border-brass" placeholder="Optional" />
        </div>
        <button className="w-full md:w-auto bg-ink text-paper py-2 uppercase text-xs tracking-[0.15em] hover:bg-ink-light transition-colors">
          Add entry
        </button>
      </form>
      {error && <p className="text-debit text-sm -mt-4">{error}</p>}

      <div className="flex gap-4 text-xs uppercase tracking-wider overflow-x-auto">
        {['open', 'settled', 'all'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`pb-1 border-b-2 shrink-0 ${filter === f ? 'border-brass text-ink' : 'border-transparent text-ink/40'}`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="border border-rule/60 bg-white/40 md:hidden">
        {items.length === 0 && (
          <p className="py-8 text-center text-ink/40 text-sm">{emptyMsg}</p>
        )}
        {items.map((i) => (
          <EntryCard
            key={i._id}
            date={i.date}
            primary={
              <span>
                {i.person}
                {i.settled && <span className="ml-2 text-[10px] uppercase tracking-wider text-credit/70 border border-credit/30 px-1.5 py-0.5 rounded-sm">settled</span>}
              </span>
            }
            secondary={i.note}
            amount={formatMoney(i.amount, { sign: i.direction === 'lent' ? '+' : '-' })}
            amountClassName={i.direction === 'lent' ? 'text-credit' : 'text-debit'}
            actions={
              <div className="flex gap-2">
                {!i.settled && (
                  <button onClick={() => settle(i._id)} className="text-brass hover:underline text-xs">settle</button>
                )}
                <button onClick={() => remove(i._id)} className="text-ink/30 hover:text-debit text-xs">remove</button>
              </div>
            }
          />
        ))}
      </div>

      <div className="border border-rule/60 bg-white/40 hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-ink/45 border-b border-rule/50">
              <th className="py-2 px-4 font-normal">Date</th>
              <th className="py-2 px-4 font-normal">Person</th>
              <th className="py-2 px-4 font-normal">Note</th>
              <th className="py-2 px-4 font-normal text-right">Amount</th>
              <th className="py-2 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-ink/40">{emptyMsg}</td></tr>
            )}
            {items.map((i) => (
              <tr key={i._id} className="border-b border-rule/30 last:border-0">
                <td className="py-2 px-4 font-mono text-ink/60">{shortDate(i.date)}</td>
                <td className="py-2 px-4">
                  {i.person}
                  {i.settled && <span className="ml-2 text-[10px] uppercase tracking-wider text-credit/70 border border-credit/30 px-1.5 py-0.5 rounded-sm">settled</span>}
                </td>
                <td className="py-2 px-4 text-ink/50">{i.note}</td>
                <td className={`py-2 px-4 text-right font-mono ${i.direction === 'lent' ? 'text-credit' : 'text-debit'}`}>
                  {formatMoney(i.amount, { sign: i.direction === 'lent' ? '+' : '-' })}
                </td>
                <td className="py-2 px-4 text-right whitespace-nowrap">
                  {!i.settled && (
                    <button onClick={() => settle(i._id)} className="text-brass hover:underline text-xs mr-3">mark settled</button>
                  )}
                  <button onClick={() => remove(i._id)} className="text-ink/30 hover:text-debit text-xs">remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
