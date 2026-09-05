import React, { useEffect, useState } from 'react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts'
import { useAuth } from '../context/AuthContext.jsx'
import { usePeriod } from '../context/PeriodContext.jsx'
import { api } from '../api.js'
import StatCard from '../components/StatCard.jsx'
import EntryCard from '../components/EntryCard.jsx'
import { formatMoney, shortDate, displayCategory } from '../format.js'

const PIE_COLORS = ['#A63D40', '#C79A3E', '#2F6F4E', '#6B7280', '#8B5E3C', '#7C6FA6']

export default function Dashboard() {
  const { token } = useAuth()
  const { range, getQueryParams } = usePeriod()
  const [data, setData] = useState(null)

  useEffect(() => {
    setData(null)
    const params = {
      ...getQueryParams(),
      ...(range.cumulativeBalances ? { cumulativeBalances: '1' } : {}),
    }
    api.dashboard(token, params).then(setData).catch(() => {})
  }, [token, range.apiFrom, range.apiTo, range.isAllTime, range.cumulativeBalances])

  if (!data) return <p className="text-ink/40 font-mono text-sm">reading the ledger…</p>

  const net = data.monthNet
  const salaryLabel = range.isDefaultMonth ? 'Salary this month' : `Salary · ${range.label}`

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[11px] uppercase tracking-[0.2em] text-ink/40">{range.label}</p>
        <h1 className="font-display text-3xl mt-1">
          Net position{' '}
          <span className={net >= 0 ? 'amount-credit' : 'amount-debit'}>
            {formatMoney(net, { sign: net >= 0 ? '+' : '-' })}
          </span>
        </h1>
        <div className="mt-4 h-[3px] w-full bg-gradient-to-r from-credit via-brass to-debit rounded-full opacity-70" />
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label={salaryLabel} value={data.monthSalary} tone="credit" />
        <StatCard label="Total income" value={data.monthIncome} tone="credit" />
        <StatCard label="Expenses" value={data.monthExpense} tone="debit" />
        <StatCard label="Total savings" value={data.totalSavings} tone="brass" />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 border border-rule/60 bg-white/40 p-5">
          <p className="text-[11px] uppercase tracking-[0.15em] text-ink/45 mb-4">Income vs expense trend</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data.trend}>
              <defs>
                <linearGradient id="inc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2F6F4E" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#2F6F4E" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#A63D40" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#A63D40" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#C9C2B0" strokeOpacity={0.4} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#14213D99' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#14213D66' }} axisLine={false} tickLine={false} width={40} />
              <Tooltip
                formatter={(v) => formatMoney(v)}
                contentStyle={{ background: '#14213D', border: 'none', borderRadius: 2 }}
                labelStyle={{ color: '#F7F3E9' }}
                itemStyle={{ color: '#F7F3E9' }}
              />
              <Area type="monotone" dataKey="income" stroke="#2F6F4E" fill="url(#inc)" strokeWidth={2} />
              <Area type="monotone" dataKey="expense" stroke="#A63D40" fill="url(#exp)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="border border-rule/60 bg-white/40 p-5">
          <p className="text-[11px] uppercase tracking-[0.15em] text-ink/45 mb-4">Expenses by category</p>
          {data.expenseByCategory.length === 0 ? (
            <p className="text-ink/40 text-sm py-10 text-center">No expenses in {range.label}.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={data.expenseByCategory} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                  {data.expenseByCategory.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatMoney(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <ul className="mt-2 space-y-1">
            {data.expenseByCategory.map((c, i) => (
              <li key={c.name} className="flex justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  {c.name}
                </span>
                <span className="font-mono">{formatMoney(c.value)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-rule/60 bg-white/40 p-5">
          <p className="text-[11px] uppercase tracking-[0.15em] text-ink/45 mb-4">
            Cash — open balances{range.cumulativeBalances ? '' : ` · ${range.label}`}
          </p>
          <div className="flex justify-between items-center py-2 border-b border-rule/50">
            <span className="text-sm text-ink/70">Owed to me</span>
            <span className="amount-credit text-lg">{formatMoney(data.owedToMe)}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-ink/70">I owe</span>
            <span className="amount-debit text-lg">{formatMoney(data.iOwe)}</span>
          </div>
        </div>

        <div className="border border-rule/60 bg-white/40 p-5">
          <p className="text-[11px] uppercase tracking-[0.15em] text-ink/45 mb-4">
            Savings progress{range.cumulativeBalances ? '' : ` · ${range.label}`}
          </p>
          {data.savingsGoals.length === 0 ? (
            <p className="text-ink/40 text-sm">No savings goals yet.</p>
          ) : (
            <div className="space-y-3">
              {data.savingsGoals.map((g) => {
                const pct = g.targetAmount ? Math.min(100, (g.currentAmount / g.targetAmount) * 100) : 0
                return (
                  <div key={g._id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{g.name}</span>
                      <span className="font-mono">{formatMoney(g.currentAmount)}{g.targetAmount ? ` / ${formatMoney(g.targetAmount)}` : ''}</span>
                    </div>
                    <div className="h-2 bg-rule/30 rounded-full overflow-hidden">
                      <div className="h-full bg-brass rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      <section className="border border-rule/60 bg-white/40 p-5">
        <p className="text-[11px] uppercase tracking-[0.15em] text-ink/45 mb-4">Recent entries · {range.label}</p>
        <div className="md:hidden -mx-1">
          {data.recent.length === 0 && (
            <p className="py-4 text-center text-ink/40 text-sm">No entries in {range.label}.</p>
          )}
          {data.recent.map((t) => (
            <EntryCard
              key={t._id}
              date={t.date}
              primary={displayCategory(t)}
              amount={formatMoney(t.amount, { sign: t.type === 'income' ? '+' : '-' })}
              amountClassName={t.type === 'income' ? 'text-credit' : 'text-debit'}
            />
          ))}
        </div>
        <table className="w-full text-sm hidden md:table">
          <tbody>
            {data.recent.length === 0 && (
              <tr><td className="py-4 text-center text-ink/40">No entries in {range.label}.</td></tr>
            )}
            {data.recent.map((t) => (
              <tr key={t._id} className="border-b border-rule/40 last:border-0">
                <td className="py-2 text-ink/50 font-mono w-20">{shortDate(t.date)}</td>
                <td className="py-2">{displayCategory(t)}</td>
                <td className={`py-2 text-right font-mono ${t.type === 'income' ? 'text-credit' : 'text-debit'}`}>
                  {formatMoney(t.amount, { sign: t.type === 'income' ? '+' : '-' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
