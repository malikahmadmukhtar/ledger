const PREFIX = 'ledger_chat_'

export function loadChatMessages(userKey) {
  if (!userKey) return []
  try {
    const raw = localStorage.getItem(PREFIX + userKey)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveChatMessages(userKey, messages) {
  if (!userKey) return
  localStorage.setItem(PREFIX + userKey, JSON.stringify(messages))
}

export function clearChatMessages(userKey) {
  if (!userKey) return
  localStorage.removeItem(PREFIX + userKey)
}
