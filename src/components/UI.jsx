import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  IconDashboard, IconInventory, IconSales, IconUsers,
  IconLogout, IconCheck, IconX, IconWarning
} from './Icons'

// ── Sidebar ───────────────────────────────────────────────────────────
export function Sidebar() {
  const navigate   = useNavigate()
  const location   = useLocation()
  const { user, logout } = useAuth()

  const items = [
    { path: '/dashboard',  label: 'Dashboard',  icon: <IconDashboard /> },
    { path: '/inventario', label: 'Inventario', icon: <IconInventory /> },
    { path: '/ventas',     label: 'Ventas',     icon: <IconSales /> },
    { path: '/usuarios',   label: 'Usuarios',   icon: <IconUsers /> },
  ]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const initials = user?.nombre
    ? user.nombre.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'AD'

  return (
    <aside className="w-56 flex-shrink-0 bg-primary-900 border-r border-primary-800 flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-primary-800 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-primary-600 flex items-center justify-center font-bold text-white text-sm shadow-lg shadow-primary-500/30">
          S
        </div>
        <div>
          <p className="font-bold text-white text-xs leading-tight">SysPOS</p>
          <p className="text-[10px] text-slate-500">Sistema de Ventas</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {items.map(i => {
          const active = location.pathname === i.path
          return (
            <button
              key={i.path}
              onClick={() => navigate(i.path)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                active ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-slate-100 hover:bg-primary-800'
              }`}
            >
              {i.icon}
              {i.label}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-2 pb-3 border-t border-primary-800 pt-3 space-y-1">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-primary-800">
          <div className="w-7 h-7 rounded-full bg-secondary-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{user?.nombre || 'Administrador'}</p>
            <p className="text-[10px] text-slate-500 truncate">{user?.email || 'admin@syspos.com'}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-all"
        >
          <IconLogout /> Cerrar sesión
        </button>
      </div>
    </aside>
  )
}

// ── Layout principal (Sidebar + contenido) ─────────────────────────────
export function AppLayout({ children }) {
  return (
    <div className="flex h-screen bg-gradient-to-br from-secondary-950 via-secondary-900 to-primary-950 text-slate-100 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  )
}

// ── Toast ─────────────────────────────────────────────────────────────
export function Toast({ toast }) {
  if (!toast) return null
  return (
    <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl border shadow-2xl text-sm font-medium transition-all ${
      toast.type === 'success'
        ? 'bg-emerald-900 border-emerald-600 text-emerald-300'
        : 'bg-red-900 border-red-600 text-red-300'
    }`}>
      {toast.type === 'success' ? <IconCheck /> : <IconX />}
      {toast.message}
    </div>
  )
}

// ── Confirm Modal ─────────────────────────────────────────────────────
export function ConfirmModal({ data, onConfirm, onCancel }) {
  if (!data) return null
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-primary-800 border border-primary-700 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            data.variant === 'warning' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'
          }`}>
            <IconWarning />
          </div>
          <h3 className="font-semibold text-white text-base">{data.title}</h3>
        </div>
        <p className="text-slate-400 text-sm mb-6 leading-relaxed">{data.message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg border border-primary-600 text-slate-300 text-sm font-medium hover:bg-primary-700 transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-lg text-white text-sm font-medium transition-colors ${
              data.variant === 'warning' ? 'bg-amber-600 hover:bg-amber-500' : 'bg-red-600 hover:bg-red-500'
            }`}>
            {data.confirmLabel || 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Hook para toast ───────────────────────────────────────────────────
import { useState, useCallback } from 'react'

export function useToast() {
  const [toast, setToast] = useState(null)
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3200)
  }, [])
  return { toast, showToast }
}
