function parseLocalDate(dateStr) {
  if (!dateStr) return null
  const s = String(dateStr)
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m && !/T\d/.test(s)) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  }
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

export function startOfDay(dateStr) {
  const d = parseLocalDate(dateStr)
  if (!d) return null
  if (/T\d/.test(String(dateStr))) return d
  d.setHours(0, 0, 0, 0)
  return d
}

export function endOfDay(dateStr) {
  const d = parseLocalDate(dateStr)
  if (!d) return null
  if (/T\d/.test(String(dateStr))) return d
  d.setHours(23, 59, 59, 999)
  return d
}

export function parseDateRange(from, to) {
  const range = {}
  const start = startOfDay(from)
  const end = endOfDay(to)
  if (start) range.$gte = start
  if (end) range.$lte = end
  return Object.keys(range).length ? range : null
}

export function applyDateFilter(query, from, to) {
  const range = parseDateRange(from, to)
  if (range) query.date = range
  return query
}
