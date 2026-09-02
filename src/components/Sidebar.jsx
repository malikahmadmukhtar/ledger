import React from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { navLinks } from '../config/nav.js'

export default function Sidebar() {
  const { user, logout } = useAuth()

  return (
    <aside className="w-[240px] shrink-0 bg-ink text-paper flex-col justify-between min-h-screen hidden md:flex">
      <div>
        <div className="px-6 pt-8 pb-6 border-b border-white/10">
          <p className="font-display italic text-2xl tracking-tight text-brass">Ledger</p>
          <p className="text-[11px] uppercase tracking-[0.2em] text-paper/40 mt-1">Personal Register</p>
        </div>
        <nav className="mt-4">
          {navLinks.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-6 py-3 text-sm border-l-2 transition-colors ${
                  isActive
                    ? 'border-brass bg-white/5 text-paper'
                    : 'border-transparent text-paper/60 hover:text-paper hover:bg-white/5'
                }`
              }
            >
              <span className="font-mono text-xs w-4 text-brass/80">{l.letter}</span>
              {l.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="px-6 py-6 border-t border-white/10">
        <p className="text-xs text-paper/50 truncate">{user?.email}</p>
        <button
          onClick={logout}
          className="mt-2 text-xs uppercase tracking-wider text-paper/60 hover:text-brass transition-colors"
        >
          Sign out →
        </button>
      </div>
    </aside>
  )
}
