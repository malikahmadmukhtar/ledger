import React, { useState } from 'react'
import ChatFab from './ChatFab.jsx'
import ChatPanel from './ChatPanel.jsx'

export default function ChatWidget() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <ChatFab open={open} onClick={() => setOpen((v) => !v)} />
      <ChatPanel open={open} onClose={() => setOpen(false)} />
    </>
  )
}
