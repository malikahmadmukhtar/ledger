import express from 'express'
import serverless from 'serverless-http'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { connectDB } from './db.js'
import { User, Transaction, CashEntry, SavingsGoal } from './models.js'
import { buildLedgerContext } from './chatContext.js'
import { applyDateFilter, parseDateRange } from './dateRange.js'

const app = express()
const router = express.Router()

app.use(cors())
app.use(express.json())

app.use((req, res, next) => {
  req.url = req.url
    .replace(/^\/\.netlify\/functions\/api/, '')
    .replace(/^\/api/, '')
  if (req.url === '') req.url = '/'
  next()
})

app.use(async (req, res, next) => {
  try {
    await connectDB()
    next()
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Database connection failed' })
  }
})

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'

function signToken(user) {
  return jwt.sign({ uid: user._id.toString() }, JWT_SECRET, { expiresIn: '30d' })
}

function auth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Not authenticated' })
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.userId = payload.uid
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' })
  }
}

function positiveAmount(amount) {
  const n = Number(amount)
  return Number.isFinite(n) && n > 0
}

// ---------- AUTH ----------

router.post('/auth/register', async (req, res) => {
  const existing = await User.countDocuments()
  if (existing > 0) return res.status(403).json({ error: 'Registration is closed' })
  const { email, password, name } = req.body
  if (!email || !password || password.length < 6) {
    return res.status(400).json({ error: 'Email and a password of at least 6 characters are required' })
  }
  const passwordHash = await bcrypt.hash(password, 10)
  const user = await User.create({ email, passwordHash, name: name || '' })
  res.json({ token: signToken(user), user: { email: user.email, name: user.name } })
})

router.get('/auth/status', async (req, res) => {
  const existing = await User.countDocuments()
  res.json({ hasUser: existing > 0 })
})

router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body
  const user = await User.findOne({ email: (email || '').toLowerCase().trim() })
  if (!user) return res.status(401).json({ error: 'Invalid email or password' })
  const ok = await bcrypt.compare(password || '', user.passwordHash)
  if (!ok) return res.status(401).json({ error: 'Invalid email or password' })
  res.json({ token: signToken(user), user: { email: user.email, name: user.name } })
})

router.get('/auth/me', auth, async (req, res) => {
  const user = await User.findById(req.userId).select('email name')
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json({ user })
})

// ---------- TRANSACTIONS ----------

router.get('/transactions', auth, async (req, res) => {
  const { type, category, from, to, limit } = req.query
  const q = { user: req.userId }
  if (type) q.type = type
  if (category) q.category = category
  applyDateFilter(q, from, to)
  const cursor = Transaction.find(q).sort({ date: -1 })
  if (limit) cursor.limit(Number(limit))
  res.json(await cursor)
})

router.post('/transactions', auth, async (req, res) => {
  const { type, category, amount, date, note } = req.body
  const cat = typeof category === 'string' ? category.trim() : ''
  if (!type || !cat) return res.status(400).json({ error: 'type and category are required' })
  if (!positiveAmount(amount)) return res.status(400).json({ error: 'amount must be greater than 0' })
  const tx = await Transaction.create({
    user: req.userId,
    type,
    category: cat,
    amount: Number(amount),
    date: date || Date.now(),
    note: note || '',
  })
  res.status(201).json(tx)
})

router.put('/transactions/:id', auth, async (req, res) => {
  const tx = await Transaction.findOneAndUpdate(
    { _id: req.params.id, user: req.userId },
    req.body,
    { new: true }
  )
  if (!tx) return res.status(404).json({ error: 'Not found' })
  res.json(tx)
})

router.delete('/transactions/:id', auth, async (req, res) => {
  const tx = await Transaction.findOneAndDelete({ _id: req.params.id, user: req.userId })
  if (!tx) return res.status(404).json({ error: 'Not found' })
  res.json({ ok: true })
})

// ---------- CASH LEDGER ----------

router.get('/cash', auth, async (req, res) => {
  const { direction, settled, from, to } = req.query
  const q = { user: req.userId }
  if (direction) q.direction = direction
  if (settled != null) q.settled = settled === 'true'
  applyDateFilter(q, from, to)
  res.json(await CashEntry.find(q).sort({ settled: 1, date: -1 }))
})

router.post('/cash', auth, async (req, res) => {
  const { direction, person, amount, date, note } = req.body
  const who = typeof person === 'string' ? person.trim() : ''
  if (!direction || !who) return res.status(400).json({ error: 'direction and person are required' })
  if (!positiveAmount(amount)) return res.status(400).json({ error: 'amount must be greater than 0' })
  const entry = await CashEntry.create({
    user: req.userId,
    direction,
    person: who,
    amount: Number(amount),
    date: date || Date.now(),
    note: note || '',
  })
  res.status(201).json(entry)
})

router.put('/cash/:id', auth, async (req, res) => {
  const entry = await CashEntry.findOneAndUpdate(
    { _id: req.params.id, user: req.userId },
    req.body,
    { new: true }
  )
  if (!entry) return res.status(404).json({ error: 'Not found' })
  res.json(entry)
})

router.post('/cash/:id/settle', auth, async (req, res) => {
  const entry = await CashEntry.findOneAndUpdate(
    { _id: req.params.id, user: req.userId },
    { settled: true, settledDate: new Date() },
    { new: true }
  )
  if (!entry) return res.status(404).json({ error: 'Not found' })
  res.json(entry)
})

router.delete('/cash/:id', auth, async (req, res) => {
  const entry = await CashEntry.findOneAndDelete({ _id: req.params.id, user: req.userId })
  if (!entry) return res.status(404).json({ error: 'Not found' })
  res.json({ ok: true })
})

// ---------- SAVINGS GOALS ----------

router.get('/savings', auth, async (req, res) => {
  const { from, to } = req.query
  const goals = await SavingsGoal.find({ user: req.userId }).sort({ createdAt: 1 })
  const dateRange = parseDateRange(from, to)

  if (!dateRange) {
    return res.json(goals)
  }

  const filtered = goals.map((g) => {
    const contributions = (g.contributions || []).filter((c) => {
      const d = new Date(c.date)
      if (dateRange.$gte && d < dateRange.$gte) return false
      if (dateRange.$lte && d > dateRange.$lte) return false
      return true
    })
    const obj = g.toObject()
    return { ...obj, contributions }
  })
  res.json(filtered)
})

router.post('/savings', auth, async (req, res) => {
  const { name, targetAmount } = req.body
  const goalName = typeof name === 'string' ? name.trim() : ''
  if (!goalName) return res.status(400).json({ error: 'name is required' })
  const target = Number(targetAmount) || 0
  if (target < 0) return res.status(400).json({ error: 'target must be 0 or greater' })
  const goal = await SavingsGoal.create({ user: req.userId, name: goalName, targetAmount: target })
  res.status(201).json(goal)
})

router.put('/savings/:id', auth, async (req, res) => {
  const { name, targetAmount } = req.body
  const patch = {}
  if (name != null) {
    const goalName = String(name).trim()
    if (!goalName) return res.status(400).json({ error: 'name cannot be empty' })
    patch.name = goalName
  }
  if (targetAmount != null) patch.targetAmount = targetAmount
  const goal = await SavingsGoal.findOneAndUpdate(
    { _id: req.params.id, user: req.userId },
    patch,
    { new: true }
  )
  if (!goal) return res.status(404).json({ error: 'Not found' })
  res.json(goal)
})

router.post('/savings/:id/contribute', auth, async (req, res) => {
  const { amount, note, date } = req.body
  if (!positiveAmount(amount)) return res.status(400).json({ error: 'amount must be greater than 0' })
  const goal = await SavingsGoal.findOneAndUpdate(
    { _id: req.params.id, user: req.userId },
    { $push: { contributions: { amount: Number(amount), note: note || '', date: date || Date.now() } } },
    { new: true }
  )
  if (!goal) return res.status(404).json({ error: 'Not found' })
  res.json(goal)
})

router.delete('/savings/:id', auth, async (req, res) => {
  const goal = await SavingsGoal.findOneAndDelete({ _id: req.params.id, user: req.userId })
  if (!goal) return res.status(404).json({ error: 'Not found' })
  res.json({ ok: true })
})

// ---------- DASHBOARD SUMMARY ----------

router.get('/dashboard', auth, async (req, res) => {
  const userId = req.userId
  const { from, to } = req.query
  const now = new Date()
  const cumulative = req.query.cumulativeBalances === '1'

  const txDate = parseDateRange(from, to)
  const txQuery = { user: userId }
  if (txDate) txQuery.date = txDate

  const cashQ = { user: userId, settled: false }
  if (!cumulative && txDate) cashQ.date = txDate

  const savingsDate = (!cumulative && txDate) ? txDate : null

  let trendStart
  if (txDate?.$gte) {
    trendStart = new Date(txDate.$gte)
    trendStart.setMonth(trendStart.getMonth() - 5)
  } else {
    trendStart = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  }

  const recentQuery = { user: userId }
  if (txDate) recentQuery.date = txDate

  const trendQuery = { user: userId, date: { $gte: trendStart } }
  if (txDate?.$lte) trendQuery.date.$lte = txDate.$lte

  const [periodTx, trendTx, cashEntries, savingsGoals, recent] = await Promise.all([
    Transaction.find(txQuery),
    Transaction.find(trendQuery),
    CashEntry.find(cashQ),
    SavingsGoal.find({ user: userId }),
    Transaction.find(recentQuery).sort({ date: -1 }).limit(8),
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
    buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString('default', { month: 'short' }), income: 0, expense: 0 })
  }
  trendTx.forEach(t => {
    const d = new Date(t.date)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const bucket = buckets.find(b => b.key === key)
    if (bucket) bucket[t.type] += t.amount
  })

  const owedToMe = cashEntries.filter(c => c.direction === 'lent').reduce((s, c) => s + c.amount, 0)
  const iOwe = cashEntries.filter(c => c.direction === 'borrowed').reduce((s, c) => s + c.amount, 0)

  const savingsGoalsMapped = savingsGoals.map(g => {
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
      _id: g._id,
      name: g.name,
      targetAmount: g.targetAmount,
      currentAmount: contributions.reduce((a, c) => a + c.amount, 0),
    }
  })
  const totalSavings = savingsGoalsMapped.reduce((s, g) => s + g.currentAmount, 0)

  res.json({
    monthIncome,
    monthSalary,
    monthExpense,
    monthNet: monthIncome - monthExpense,
    expenseByCategory: Object.entries(expenseByCategory).map(([name, value]) => ({ name, value })),
    trend: buckets.map(({ label, income, expense }) => ({ label, income, expense })),
    owedToMe,
    iOwe,
    totalSavings,
    savingsGoals: savingsGoalsMapped,
    recent,
  })
})

// ---------- CHAT (Gemini) ----------

router.post('/chat', auth, async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(503).json({ error: 'Chat is not configured. Set GEMINI_API_KEY on the server.' })
  }

  const { message, history = [], from, to, allTime, cumulativeBalances, periodLabel } = req.body
  if (!message || !String(message).trim()) {
    return res.status(400).json({ error: 'message is required' })
  }

  try {
    const context = await buildLedgerContext(req.userId, {
      from: allTime ? null : from,
      to: allTime ? null : to,
      cumulativeBalances: !!cumulativeBalances,
      periodLabel: periodLabel || 'selected period',
    })
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' })

    const systemPrompt = `You are a personal finance assistant for a ledger app. All amounts are in PKR (Pakistani Rupees), displayed as Rs. The active period is: ${periodLabel || 'selected period'}. Answer only from the provided ledger data for that period. If the data does not contain enough information to answer, say so clearly. Be concise and helpful. Do not invent transactions or amounts.`

    const recentHistory = history.slice(-5).map((h) => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`).join('\n')
    const prompt = `${systemPrompt}

LEDGER DATA (JSON):
${JSON.stringify(context, null, 2)}

${recentHistory ? `RECENT CONVERSATION:\n${recentHistory}\n\n` : ''}User: ${String(message).trim()}
Assistant:`

    const result = await model.generateContent(prompt)
    const reply = result.response.text()
    res.json({ reply })
  } catch (err) {
    console.error('Chat error:', err)
    res.status(500).json({ error: 'Failed to get a response. Please try again.' })
  }
})

app.use('/', router)

export const handler = serverless(app)
