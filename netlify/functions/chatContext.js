import { Transaction, CashEntry, SavingsGoal } from './models.js'
import { parseDateRange } from './dateRange.js'

export async function buildLedgerContext(userId, options = {}) {
  const {
    from = null,
    to = null,
    cumulativeBalances = true,
    periodLabel = 'This month',
  } = options

  const now = new Date()
  const txDate = parseDateRange(from, to)
  const txQuery = { user: userId }
  if (txDate) txQuery.date = txDate

  let trendStart
  if (txDate?.$gte) {
    trendStart = new Date(txDate.$gte)
    trendStart.setMonth(trendStart.getMonth() - 5)
  } else {
    trendStart = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  }

  const cashQ = { user: userId, settled: false }
  if (!cumulativeBalances && txDate) cashQ.date = txDate

  const savingsDate = (!cumulativeBalances && txDate) ? txDate : null

  const recentQuery = { user: userId }
  if (txDate) recentQuery.date = txDate

  const trendQuery = { user: userId, date: { $gte: trendStart } }
  if (txDate?.$lte) trendQuery.date.$lte = txDate.$lte

  const [periodTx, trendTx, cashEntries, savingsGoals, recentTx] = await Promise.all([
    Transaction.find(txQuery),
    Transaction.find(trendQuery),
    CashEntry.find(cashQ).sort({ date: -1 }),
    SavingsGoal.find({ user: userId }).sort({ createdAt: 1 }),
    Transaction.find(recentQuery).sort({ date: -1 }).limit(50),
  ])

  const monthIncome = periodTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const monthSalary = periodTx.filter(t => t.type === 'income' && t.category === 'Salary').reduce((s, t) => s + t.amount, 0)
  const monthExpense = periodTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  const expenseByCategory = {}
  periodTx.filter(t => t.type === 'expense').forEach(t => {
    expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount
  })

  const buckets = []
  const endRef = txDate?.$lte ? new Date(txDate.$lte) : now
  for (let i = 5; i >= 0; i--) {
    const d = new Date(endRef.getFullYear(), endRef.getMonth() - i, 1)
    buckets.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleString('en-PK', { month: 'short', year: 'numeric' }),
      income: 0,
      expense: 0,
    })
  }
  trendTx.forEach(t => {
    const d = new Date(t.date)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const bucket = buckets.find(b => b.key === key)
    if (bucket) bucket[t.type] += t.amount
  })

  const owedToMe = cashEntries.filter(c => c.direction === 'lent').reduce((s, c) => s + c.amount, 0)
  const iOwe = cashEntries.filter(c => c.direction === 'borrowed').reduce((s, c) => s + c.amount, 0)

  const savings = savingsGoals.map(g => {
    let contributions = g.contributions || []
    if (savingsDate) {
      contributions = contributions.filter((c) => {
        const d = new Date(c.date)
        if (savingsDate.$gte && d < savingsDate.$gte) return false
        if (savingsDate.$lte && d > savingsDate.$lte) return false
        return true
      })
    }
    return {
      name: g.name,
      targetAmount: g.targetAmount,
      currentAmount: contributions.reduce((a, c) => a + c.amount, 0),
    }
  })

  const totalSavings = savings.reduce((s, g) => s + g.currentAmount, 0)

  return {
    currency: 'PKR',
    currencySymbol: 'Rs.',
    periodLabel,
    period: {
      income: monthIncome,
      salary: monthSalary,
      expenses: monthExpense,
      net: monthIncome - monthExpense,
      expenseByCategory,
    },
    trend: buckets.map(({ label, income, expense }) => ({ label, income, expense })),
    cash: {
      owedToMe,
      iOwe,
      openEntries: cashEntries.map(c => ({
        person: c.person,
        direction: c.direction === 'lent' ? 'they owe me' : 'I owe them',
        amount: c.amount,
        date: c.date,
        note: c.note || '',
      })),
    },
    savings: {
      total: totalSavings,
      goals: savings,
    },
    recentTransactions: recentTx.map(t => ({
      date: t.date,
      type: t.type,
      category: t.category,
      amount: t.amount,
      note: t.note || '',
    })),
  }
}
