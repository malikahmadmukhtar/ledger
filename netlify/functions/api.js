import express from 'express'
import serverless from 'serverless-http'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { connectDB } from './db.js'
import { User, Transaction, CashEntry, SavingsGoal } from './models.js'
import { buildLedgerContext } from './chatContext.js'

const app = express()
const router = express.Router()

app.use(cors())
app.use(express.json())

// Netlify Dev and production Netlify Functions don't always agree on whether
// the incoming path still has the function's own prefix on it. Strip whichever
// prefix is present so the routes below always see a clean path like "/auth/login".
app.use((req, res, next) => {
  req.url = req.url
    .replace(/^\/\.netlify\/functions\/api/, '')
    .replace(/^\/api/, '')
  if (req.url === '') req.url = '/'
  next()
})

// Ensure DB is connected before any route runs
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

// ---------- AUTH ----------

// Bootstrap registration: only works when no user exists yet, so this app stays single-user.
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

// ---------- TRANSACTIONS (income + expenses; salary = income with category "Salary") ----------

router.get('/transactions', auth, async (req, res) => {
  const { type, category, from, to, limit } = req.query
  const q = { user: req.userId }
  if (type) q.type = type
  if (category) q.category = category
  if (from || to) {
    q.date = {}
    if (from) q.date.$gte = new Date(from)
    if (to) q.date.$lte = new Date(to)
  }
  const cursor = Transaction.find(q).sort({ date: -1 })
  if (limit) cursor.limit(Number(limit))
  res.json(await cursor)
})

router.post('/transactions', auth, async (req, res) => {
  const { type, category, amount, date, note } = req.body
  if (!type || !category || amount == null) return res.status(400).json({ error: 'type, category and amount are required' })
  const tx = await Transaction.create({ user: req.userId, type, category, amount, date: date || Date.now(), note })
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

// ---------- CASH LEDGER (money lent / borrowed) ----------

router.get('/cash', auth, async (req, res) => {
  const { direction, settled } = req.query
  const q = { user: req.userId }
  if (direction) q.direction = direction
  if (settled != null) q.settled = settled === 'true'
  res.json(await CashEntry.find(q).sort({ settled: 1, date: -1 }))
})

router.post('/cash', auth, async (req, res) => {
  const { direction, person, amount, date, note } = req.body
  if (!direction || !person || amount == null) return res.status(400).json({ error: 'direction, person and amount are required' })
  const entry = await CashEntry.create({ user: req.userId, direction, person, amount, date: date || Date.now(), note })
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
  res.json(await SavingsGoal.find({ user: req.userId }).sort({ createdAt: 1 }))
})

router.post('/savings', auth, async (req, res) => {
  const { name, targetAmount } = req.body
  if (!name) return res.status(400).json({ error: 'name is required' })
  const goal = await SavingsGoal.create({ user: req.userId, name, targetAmount: targetAmount || 0 })
  res.status(201).json(goal)
})

router.put('/savings/:id', auth, async (req, res) => {
  const { name, targetAmount } = req.body
  const goal = await SavingsGoal.findOneAndUpdate(
    { _id: req.params.id, user: req.userId },
    { ...(name != null && { name }), ...(targetAmount != null && { targetAmount }) },
    { new: true }
  )
  if (!goal) return res.status(404).json({ error: 'Not found' })
  res.json(goal)
})

router.post('/savings/:id/contribute', auth, async (req, res) => {
  const { amount, note, date } = req.body
  if (amount == null) return res.status(400).json({ error: 'amount is required' })
  const goal = await SavingsGoal.findOneAndUpdate(
    { _id: req.params.id, user: req.userId },
    { $push: { contributions: { amount, note, date: date || Date.now() } } },
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
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

  const [monthTx, trendTx, cashEntries, savingsGoals, recent] = await Promise.all([
    Transaction.find({ user: userId, date: { $gte: startOfMonth } }),
    Transaction.find({ user: userId, date: { $gte: sixMonthsAgo } }),
    CashEntry.find({ user: userId, settled: false }),
    SavingsGoal.find({ user: userId }),
    Transaction.find({ user: userId }).sort({ date: -1 }).limit(8),
  ])

  const monthIncome = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const monthSalary = monthTx.filter(t => t.type === 'income' && t.category === 'Salary').reduce((s, t) => s + t.amount, 0)
  const monthExpense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  const expenseByCategory = {}
  monthTx.filter(t => t.type === 'expense').forEach(t => {
    expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount
  })

  // Build 6-month trend buckets
  const buckets = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
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

  const totalSavings = savingsGoals.reduce((s, g) => s + g.contributions.reduce((a, c) => a + c.amount, 0), 0)

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
    savingsGoals: savingsGoals.map(g => ({
      _id: g._id,
      name: g.name,
      targetAmount: g.targetAmount,
      currentAmount: g.contributions.reduce((a, c) => a + c.amount, 0),
    })),
    recent,
  })
})

// ---------- CHAT (Gemini) ----------

router.post('/chat', auth, async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(503).json({ error: 'Chat is not configured. Set GEMINI_API_KEY on the server.' })
  }

  const { message, history = [] } = req.body
  if (!message || !String(message).trim()) {
    return res.status(400).json({ error: 'message is required' })
  }

  try {
    const context = await buildLedgerContext(req.userId)
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' })

    const systemPrompt = `You are a personal finance assistant for a ledger app. All amounts are in PKR (Pakistani Rupees), displayed as Rs. Answer only from the provided ledger data. If the data does not contain enough information to answer, say so clearly. Be concise and helpful. Do not invent transactions or amounts.`

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
