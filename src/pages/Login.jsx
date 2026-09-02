import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function Login() {
  const { token, login } = useAuth()
  const navigate = useNavigate()
  const [hasUser, setHasUser] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (token) navigate('/', { replace: true })
  }, [token])

  useEffect(() => {
    api.authStatus().then((r) => setHasUser(r.hasUser)).catch(() => setHasUser(true))
  }, [])

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const fn = hasUser ? api.login : api.register
      const res = await fn({ email, password, name })
      login(res.token, res.user)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-ink px-6">
      <div className="w-full max-w-sm">
        <p className="font-display italic text-4xl text-brass text-center mb-1">Ledger</p>
        <p className="text-paper/40 text-center text-xs uppercase tracking-[0.2em] mb-10">
          {hasUser === false ? 'Set up your account' : 'Sign in to your register'}
        </p>

        <form onSubmit={submit} className="bg-paper rounded-sm p-8 shadow-2xl space-y-4">
          {hasUser === false && (
            <div>
              <label className="block text-xs uppercase tracking-wider text-ink/50 mb-1">Name</label>
              <input
                className="w-full border-b border-rule bg-transparent py-2 font-body focus:border-brass outline-none"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
          )}
          <div>
            <label className="block text-xs uppercase tracking-wider text-ink/50 mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full border-b border-rule bg-transparent py-2 font-body focus:border-brass outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-ink/50 mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full border-b border-rule bg-transparent py-2 font-body focus:border-brass outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-debit text-sm">{error}</p>}

          <button
            disabled={busy || hasUser === null}
            type="submit"
            className="w-full bg-ink text-paper py-3 mt-2 uppercase text-xs tracking-[0.2em] hover:bg-ink-light transition-colors disabled:opacity-50"
          >
            {hasUser === false ? 'Create account' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
