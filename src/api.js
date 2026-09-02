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

export const api = {
  authStatus: () => request('/auth/status'),
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  me: (token) => request('/auth/me', { token }),

  listTransactions: (token, params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/transactions${qs ? `?${qs}` : ''}`, { token })
  },
  createTransaction: (token, payload) => request('/transactions', { method: 'POST', body: payload, token }),
  updateTransaction: (token, id, payload) => request(`/transactions/${id}`, { method: 'PUT', body: payload, token }),
  deleteTransaction: (token, id) => request(`/transactions/${id}`, { method: 'DELETE', token }),

  listCash: (token, params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/cash${qs ? `?${qs}` : ''}`, { token })
  },
  createCash: (token, payload) => request('/cash', { method: 'POST', body: payload, token }),
  settleCash: (token, id) => request(`/cash/${id}/settle`, { method: 'POST', token }),
  deleteCash: (token, id) => request(`/cash/${id}`, { method: 'DELETE', token }),

  listSavings: (token) => request('/savings', { token }),
  createSavings: (token, payload) => request('/savings', { method: 'POST', body: payload, token }),
  contributeSavings: (token, id, payload) => request(`/savings/${id}/contribute`, { method: 'POST', body: payload, token }),
  deleteSavings: (token, id) => request(`/savings/${id}`, { method: 'DELETE', token }),

  dashboard: (token) => request('/dashboard', { token }),

  chat: (token, { message, history }) => request('/chat', { method: 'POST', body: { message, history }, token }),
}
