export const CURRENCY_SYMBOL = 'Rs.'
const CURRENCY_LOCALE = 'en-PK'

export function money(n) {
  const v = Number(n || 0)
  return v.toLocaleString(CURRENCY_LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatMoney(n, { sign } = {}) {
  const prefix = sign ? `${sign}${CURRENCY_SYMBOL} ` : `${CURRENCY_SYMBOL} `
  return `${prefix}${money(n)}`
}

export function shortDate(d) {
  return new Date(d).toLocaleDateString(CURRENCY_LOCALE, { day: '2-digit', month: 'short' })
}

export function displayCategory({ category, note }) {
  if (category === 'Other' && note?.trim()) return note.trim()
  return category
}
