import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import { lazy, Suspense } from 'react'

const LoginPage      = lazy(() => import('./pages/LoginPage'))
const DashboardPage  = lazy(() => import('./pages/DashboardPage'))
const InventarioPage = lazy(() => import('./pages/InventarioPage'))
const VentasPage     = lazy(() => import('./pages/VentasPage'))
const UsuariosPage   = lazy(() => import('./pages/UsuariosPage'))

// ── Spinner de carga ──────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center font-bold text-white text-xl animate-pulse">S</div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
        <p className="text-slate-500 text-xs">Cargando SysPOS...</p>
      </div>
    </div>
  )
}

// ── Rutas protegidas ──────────────────────────────────────────────────
function PrivateRoute({ children }) {
  const { user, cargando } = useAuth()
  if (cargando) return <PageLoader />
  return user ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { user, cargando } = useAuth()
  if (cargando) return <PageLoader />
  return user ? <Navigate to="/dashboard" replace /> : children
}

// ── Rutas ─────────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/dashboard"  element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/inventario" element={<PrivateRoute><InventarioPage /></PrivateRoute>} />
        <Route path="/ventas"     element={<PrivateRoute><VentasPage /></PrivateRoute>} />
        <Route path="/usuarios"   element={<PrivateRoute><UsuariosPage /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  )
}

// ── App ───────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <AppRoutes />
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
