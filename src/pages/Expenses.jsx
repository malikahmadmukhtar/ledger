import React from 'react'
import TransactionManager from '../components/TransactionManager.jsx'

const CATEGORIES = ['Food', 'Rent', 'Utilities', 'Transport', 'Shopping', 'Health', 'Entertainment', 'Other']

export default function Expenses() {
  return <TransactionManager type="expense" title="Expenses" categories={CATEGORIES} tone="debit" />
}
