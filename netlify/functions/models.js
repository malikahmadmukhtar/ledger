import mongoose from 'mongoose'

const { Schema, model, models } = mongoose

const UserSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  name: { type: String, default: '' },
}, { timestamps: true })

// type: 'income' | 'expense'. Income entries with category 'Salary' power the salary views.
const TransactionSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['income', 'expense'], required: true },
  category: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0 },
  date: { type: Date, required: true, default: Date.now },
  note: { type: String, default: '' },
}, { timestamps: true })

// direction: 'lent' (cash I gave, they owe me) | 'borrowed' (cash I took, I owe them)
const CashEntrySchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  direction: { type: String, enum: ['lent', 'borrowed'], required: true },
  person: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0 },
  date: { type: Date, required: true, default: Date.now },
  note: { type: String, default: '' },
  settled: { type: Boolean, default: false },
  settledDate: { type: Date, default: null },
}, { timestamps: true })

const ContributionSchema = new Schema({
  amount: { type: Number, required: true, min: 0 },
  date: { type: Date, required: true, default: Date.now },
  note: { type: String, default: '' },
}, { _id: true })

const SavingsGoalSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  targetAmount: { type: Number, default: 0 },
  contributions: { type: [ContributionSchema], default: [] },
}, { timestamps: true })

export const User = models.User || model('User', UserSchema)
export const Transaction = models.Transaction || model('Transaction', TransactionSchema)
export const CashEntry = models.CashEntry || model('CashEntry', CashEntrySchema)
export const SavingsGoal = models.SavingsGoal || model('SavingsGoal', SavingsGoalSchema)
