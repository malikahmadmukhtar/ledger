import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import Sidebar from './components/Sidebar.jsx'
import MobileNav from './components/MobileNav.jsx'
import ChatWidget from './components/ChatWidget.jsx'
import PeriodBar from './components/PeriodBar.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Income from './pages/Income.jsx'
import Expenses from './pages/Expenses.jsx'
import Cash from './pages/Cash.jsx'
import Savings from './pages/Savings.jsx'

function Protected({ children }) {
  const { token, loading } = useAuth()
  if (loading) return <div className="min-h-screen grid place-items-center text-ink/50 font-mono">loading ledger…</div>
  if (!token) return <Navigate to="/login" replace />
  return children
}

function Shell({ children }) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar />
      <main className="flex-1 px-4 py-6 pb-24 md:px-10 md:py-10 md:pb-10 max-w-6xl mx-auto w-full">
        <PeriodBar />
        {children}
      </main>
      <MobileNav />
      <ChatWidget />
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Protected><Shell><Dashboard /></Shell></Protected>} />
      <Route path="/income" element={<Protected><Shell><Income /></Shell></Protected>} />
      <Route path="/expenses" element={<Protected><Shell><Expenses /></Shell></Protected>} />
      <Route path="/cash" element={<Protected><Shell><Cash /></Shell></Protected>} />
      <Route path="/savings" element={<Protected><Shell><Savings /></Shell></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
