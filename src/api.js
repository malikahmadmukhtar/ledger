const BASE = '/api'

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Something went wrong')
  return data
}

function withQuery(path, params = {}) {
  const cleaned = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v != null && v !== '')
  )
  const qs = new URLSearchParams(cleaned).toString()
  return `${path}${qs ? `?${qs}` : ''}`
}

export const api = {
  authStatus: () => request('/auth/status'),
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  me: (token) => request('/auth/me', { token }),

  listTransactions: (token, params = {}) =>
    request(withQuery('/transactions', params), { token }),
  createTransaction: (token, payload) => request('/transactions', { method: 'POST', body: payload, token }),
  updateTransaction: (token, id, payload) => request(`/transactions/${id}`, { method: 'PUT', body: payload, token }),
  deleteTransaction: (token, id) => request(`/transactions/${id}`, { method: 'DELETE', token }),

  listCash: (token, params = {}) =>
    request(withQuery('/cash', params), { token }),
  createCash: (token, payload) => request('/cash', { method: 'POST', body: payload, token }),
  settleCash: (token, id) => request(`/cash/${id}/settle`, { method: 'POST', token }),
  deleteCash: (token, id) => request(`/cash/${id}`, { method: 'DELETE', token }),

  listSavings: (token, params = {}) =>
    request(withQuery('/savings', params), { token }),
  createSavings: (token, payload) => request('/savings', { method: 'POST', body: payload, token }),
  contributeSavings: (token, id, payload) => request(`/savings/${id}/contribute`, { method: 'POST', body: payload, token }),
  deleteSavings: (token, id) => request(`/savings/${id}`, { method: 'DELETE', token }),

  dashboard: (token, params = {}) =>
    request(withQuery('/dashboard', params), { token }),

  chat: (token, payload) => request('/chat', { method: 'POST', body: payload, token }),
}
