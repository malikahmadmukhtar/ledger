import React, { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { useAuth } from '../context/AuthContext.jsx'
import { usePeriod } from '../context/PeriodContext.jsx'
import { api } from '../api.js'
import { loadChatMessages, saveChatMessages, clearChatMessages } from '../utils/chatStorage.js'

const STARTER_PROMPTS = [
  'How much did I spend this month?',
  'Who owes me money?',
  "What's my savings progress?",
]

const CONTEXT_LIMIT = 5

const mdComponents = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-2 last:mb-0 list-disc pl-4 space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 last:mb-0 list-decimal pl-4 space-y-0.5">{children}</ol>,
  li: ({ children }) => <li className="leading-snug">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer" className="underline text-brass hover:opacity-80">
      {children}
    </a>
  ),
  code: ({ children, className }) => {
    const block = className?.includes('language-')
    if (block) {
      return (
        <code className="block font-mono text-[0.85em] bg-ink/5 px-2 py-1.5 rounded-sm overflow-x-auto my-2">
          {children}
        </code>
      )
    }
    return <code className="font-mono text-[0.85em] bg-ink/5 px-1 rounded-sm">{children}</code>
  },
  pre: ({ children }) => <pre className="my-2 overflow-x-auto">{children}</pre>,
  h1: ({ children }) => <p className="font-display text-base mb-2">{children}</p>,
  h2: ({ children }) => <p className="font-display text-sm mb-1.5">{children}</p>,
  h3: ({ children }) => <p className="font-semibold text-sm mb-1">{children}</p>,
}

export default function ChatPanel({ open, onClose }) {
  const { token, user } = useAuth()
  const { range } = usePeriod()
  const [messages, setMessages] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    if (user?.email) {
      setMessages(loadChatMessages(user.email))
      setLoaded(true)
    } else {
      setLoaded(false)
      setMessages([])
    }
  }, [user?.email])

  useEffect(() => {
    if (loaded && user?.email) {
      saveChatMessages(user.email, messages)
    }
  }, [messages, loaded, user?.email])

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open, loading])

  async function send(text) {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    setError('')
    const userMsg = { role: 'user', content: trimmed }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)

    try {
      const history = messages.slice(-CONTEXT_LIMIT).map((m) => ({ role: m.role, content: m.content }))
      const { reply } = await api.chat(token, {
        message: trimmed,
        history,
        from: range.apiFrom || null,
        to: range.apiTo || null,
        allTime: range.isAllTime,
        cumulativeBalances: range.cumulativeBalances,
        periodLabel: range.label,
      })
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      setError(err.message)
      setMessages(messages)
      setInput(trimmed)
    } finally {
      setLoading(false)
    }
  }

  function handleClear() {
    setMessages([])
    setError('')
    if (user?.email) clearChatMessages(user.email)
  }

  function handleSubmit(e) {
    e.preventDefault()
    send(input)
  }

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-ink/20 z-50 md:bg-transparent"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed z-50 flex flex-col bg-paper border border-rule/60 shadow-2xl rounded-sm overflow-hidden
        bottom-[4.75rem] left-3 right-3 max-h-[52vh]
        md:inset-y-0 md:left-auto md:right-0 md:bottom-0 md:max-h-none md:w-[380px] md:rounded-none md:border-l md:border-t-0">
        <header className="px-3 py-2.5 md:px-5 md:py-4 border-b border-rule/60 flex items-center justify-between shrink-0">
          <div>
            <p className="font-display text-base md:text-lg leading-tight">Ledger Assistant</p>
            <p className="text-[9px] md:text-[10px] uppercase tracking-wider text-ink/40">{range.label}</p>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="text-[10px] uppercase tracking-wider text-ink/40 hover:text-debit"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-ink/40 hover:text-ink text-lg leading-none p-1"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-3 py-3 md:px-5 md:py-4 space-y-3 min-h-0">
          {messages.length === 0 && (
            <div className="space-y-2">
              <p className="text-xs md:text-sm text-ink/50">Ask anything about your income, expenses, cash, or savings.</p>
              <div className="space-y-1.5">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => send(prompt)}
                    className="block w-full text-left text-xs md:text-sm border border-rule/60 bg-white/40 px-2.5 py-1.5 md:px-3 md:py-2 hover:border-brass/60 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={`text-xs md:text-sm ${m.role === 'user' ? 'text-right' : 'text-left'}`}
            >
              <div
                className={`inline-block max-w-[92%] px-2.5 py-1.5 md:px-3 md:py-2 rounded-sm ${
                  m.role === 'user'
                    ? 'bg-ink text-paper text-left'
                    : 'border border-rule/60 bg-white/40 text-ink'
                }`}
              >
                {m.role === 'user' ? (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                ) : (
                  <div className="chat-md text-left">
                    <ReactMarkdown components={mdComponents}>{m.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <p className="text-xs md:text-sm text-ink/40 font-mono">thinking…</p>
          )}

          {error && (
            <p className="text-xs md:text-sm text-debit">{error}</p>
          )}

          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSubmit} className="px-3 py-2.5 md:px-5 md:py-4 border-t border-rule/60 shrink-0">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question…"
              disabled={loading}
              className="flex-1 border-b border-rule bg-transparent py-1.5 md:py-2 outline-none focus:border-brass text-xs md:text-sm"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-ink text-paper px-3 py-1.5 md:px-4 md:py-2 uppercase text-[9px] md:text-[10px] tracking-wider hover:bg-ink-light transition-colors disabled:opacity-50 shrink-0"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
