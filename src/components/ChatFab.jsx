import React from 'react'

export default function ChatFab({ onClick, open }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={open ? 'Close chat' : 'Open chat'}
      className="fixed bottom-20 right-3 md:bottom-6 md:right-6 z-40 w-10 h-10 md:w-12 md:h-12 rounded-full bg-ink text-brass border border-brass/40 shadow-lg flex items-center justify-center hover:bg-ink-light transition-colors"
    >
      {open ? (
        <span className="text-base md:text-lg leading-none">×</span>
      ) : (
        <span className="font-mono text-xs md:text-sm">?</span>
      )}
    </button>
  )
}
