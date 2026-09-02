import React from 'react'
import TransactionManager from '../components/TransactionManager.jsx'

const CATEGORIES = ['Salary', 'Bonus', 'Freelance', 'Investment', 'Gift', 'Other']

export default function Income() {
  return <TransactionManager type="income" title="Salary & Income" categories={CATEGORIES} tone="credit" />
}
