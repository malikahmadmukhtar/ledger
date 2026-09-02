import React from 'react'
import { NavLink } from 'react-router-dom'
import { navLinks } from '../config/nav.js'

export default function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-ink border-t border-white/10 pb-safe">
      <div className="flex">
        {navLinks.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-0.5 py-2 px-1 border-t-2 transition-colors ${
                isActive
                  ? 'border-brass text-brass'
                  : 'border-transparent text-paper/50'
              }`
            }
          >
            <span className="font-mono text-[10px]">{l.letter}</span>
            <span className="text-[9px] uppercase tracking-wider leading-tight text-center">{l.shortLabel}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
