import React, { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('ledger_token'))
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    api.me(token)
      .then((res) => setUser(res.user))
      .catch(() => {
        setToken(null)
        localStorage.removeItem('ledger_token')
      })
      .finally(() => setLoading(false))
  }, [token])

  function login(tok, usr) {
    localStorage.setItem('ledger_token', tok)
    setToken(tok)
    setUser(usr)
  }

  function logout() {
    localStorage.removeItem('ledger_token')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
