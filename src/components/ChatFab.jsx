import React from 'react'

function SparkleIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2.5c.35 3.55 1.7 6.05 4.5 8.1-2.8 2.05-4.15 4.55-4.5 8.1-.35-3.55-1.7-6.05-4.5-8.1 2.8-2.05 4.15-4.55 4.5-8.1z" />
      <path d="M18.5 5c.2 1.55.75 2.55 1.9 3.4-1.15.85-1.7 1.85-1.9 3.4-.2-1.55-.75-2.55-1.9-3.4 1.15-.85 1.7-1.85 1.9-3.4z" opacity="0.9" />
      <path d="M6.2 14.2c.15 1.15.55 1.9 1.4 2.55-.85.65-1.25 1.4-1.4 2.55-.15-1.15-.55-1.9-1.4-2.55.85-.65 1.25-1.4 1.4-2.55z" opacity="0.85" />
    </svg>
  )
}

export default function ChatFab({ onClick, open }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={open ? 'Close chat' : 'Open chat'}
      className="fixed bottom-20 right-3 md:bottom-6 md:right-6 z-40 w-10 h-10 md:w-12 md:h-12 rounded-full bg-ink text-paper border border-brass/40 shadow-lg flex items-center justify-center hover:bg-ink-light transition-colors"
    >
      {open ? (
        <span className="text-base md:text-lg leading-none text-brass">×</span>
      ) : (
        <SparkleIcon className="w-5 h-5 md:w-6 md:h-6 text-paper" />
      )}
    </button>
  )
}
