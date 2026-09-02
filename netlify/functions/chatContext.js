import { Transaction, CashEntry, SavingsGoal } from './models.js'

export async function buildLedgerContext(userId) {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

  const [monthTx, trendTx, cashEntries, savingsGoals, recentTx] = await Promise.all([
    Transaction.find({ user: userId, date: { $gte: startOfMonth } }),
    Transaction.find({ user: userId, date: { $gte: sixMonthsAgo } }),
    CashEntry.find({ user: userId, settled: false }).sort({ date: -1 }),
    SavingsGoal.find({ user: userId }).sort({ createdAt: 1 }),
    Transaction.find({ user: userId }).sort({ date: -1 }).limit(50),
  ])

  const monthIncome = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const monthSalary = monthTx.filter(t => t.type === 'income' && t.category === 'Salary').reduce((s, t) => s + t.amount, 0)
  const monthExpense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  const expenseByCategory = {}
  monthTx.filter(t => t.type === 'expense').forEach(t => {
    expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount
  })

  const buckets = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
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

  const savings = savingsGoals.map(g => ({
    name: g.name,
    targetAmount: g.targetAmount,
    currentAmount: g.contributions.reduce((a, c) => a + c.amount, 0),
  }))

  const totalSavings = savings.reduce((s, g) => s + g.currentAmount, 0)

  return {
    currency: 'PKR',
    currencySymbol: 'Rs.',
    thisMonth: {
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
