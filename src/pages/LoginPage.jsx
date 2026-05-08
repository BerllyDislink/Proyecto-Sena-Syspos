import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { IconMail, IconLock, IconEye, IconEyeOff, IconArrowL, IconCheck, IconAlert } from '../components/Icons'

// ── Vista Login ───────────────────────────────────────────────────────
function LoginView({ onForgot }) {
  const { login }   = useAuth()
  const navigate    = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [errors, setErrors]     = useState({})
  const [loading, setLoading]   = useState(false)

  const clear = (k) => setErrors(e => ({ ...e, [k]: null, general: null }))

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    const e = {}
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) e.email = 'Ingresa un correo válido'
    if (!password) e.password = 'La contraseña es requerida'
    if (Object.keys(e).length) { setErrors(e); return }

    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      const msg = (err.message || '').toLowerCase()
      if (msg.includes('invalid login') || msg.includes('invalid credentials')) {
        setErrors({ general: 'Correo o contraseña incorrectos. Intenta de nuevo.' })
      } else if (msg.includes('email not confirmed')) {
        setErrors({ general: 'Tu correo aún no está confirmado. Revisa tu bandeja de entrada o pide al administrador que lo active.' })
      } else if (msg.includes('user not found')) {
        setErrors({ general: 'Este usuario no existe en el sistema.' })
      } else {
        // Mostrar el error exacto de Supabase para facilitar el diagnóstico
        setErrors({ general: `Error: ${err.message || 'Intenta de nuevo'}` })
      }
    } finally {
      setLoading(false)
    }
  }

  const inp = (f) =>
    `w-full bg-slate-900 border rounded-xl pl-11 pr-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none focus:ring-2 transition-all ${
      errors[f] ? 'border-red-500 focus:ring-red-500' : 'border-slate-700 focus:ring-indigo-500'
    }`

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-indigo-600 via-purple-500 to-indigo-600" />
          <div className="px-8 py-10">

            {/* Logo */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center font-bold text-white text-2xl shadow-lg shadow-indigo-500/30 mb-4">S</div>
              <h1 className="text-2xl font-bold text-white">SysPOS</h1>
              <p className="text-slate-500 text-sm mt-1">Sistema de Punto de Venta</p>
            </div>

            <h2 className="text-lg font-semibold text-white mb-1">Iniciar sesión</h2>
            <p className="text-slate-500 text-sm mb-6">Ingresa tus credenciales para continuar</p>

            {/* Error general */}
            {errors.general && (
              <div className="flex items-center gap-3 bg-red-900/40 border border-red-700/50 rounded-xl px-4 py-3 mb-5 text-sm text-red-400">
                <IconAlert /> {errors.general}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Correo electrónico</label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"><IconMail /></div>
                  <input type="email" value={email}
                    onChange={e => { setEmail(e.target.value); clear('email') }}
                    placeholder="tu@correo.com" className={inp('email')} />
                </div>
                {errors.email && <p className="text-red-400 text-xs mt-1.5">{errors.email}</p>}
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Contraseña</label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"><IconLock /></div>
                  <input type={showPass ? 'text' : 'password'} value={password}
                    onChange={e => { setPassword(e.target.value); clear('password') }}
                    placeholder="••••••••" className={`${inp('password')} pr-11`} />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                    {showPass ? <IconEyeOff /> : <IconEye />}
                  </button>
                </div>
                {errors.password && <p className="text-red-400 text-xs mt-1.5">{errors.password}</p>}
              </div>

              {/* Forgot */}
              <div className="flex justify-end">
                <button type="button" onClick={onForgot}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              {/* Submit */}
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2">
                {loading
                  ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity=".25"/><path fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" opacity=".75"/></svg>Verificando...</>
                  : 'Iniciar sesión'}
              </button>
            </form>

            {/* Nota Supabase */}
            <div className="mt-6 bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-3">
              <p className="text-xs text-slate-500 text-center">
                Usa las credenciales creadas en <span className="text-indigo-400">Supabase Authentication</span>
              </p>
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-slate-600 mt-5">© 2026 SysPOS · Sistema de Punto de Venta</p>
      </div>
    </div>
  )
}

// ── Vista Forgot Password ─────────────────────────────────────────────
function ForgotView({ onBack }) {
  const { recuperarPassword } = useAuth()
  const [email, setEmail]     = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) { setError('Ingresa un correo válido'); return }
    setLoading(true)
    try {
      await recuperarPassword(email)
      setSent(true)
    } catch {
      setError('No se pudo enviar el correo. Verifica que el correo esté registrado.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500" />
          <div className="px-8 py-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5">
              <IconCheck size={24} />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">¡Correo enviado!</h2>
            <p className="text-slate-400 text-sm mb-1">Revisa tu bandeja de entrada en</p>
            <p className="text-indigo-400 font-medium text-sm mb-5">{email}</p>
            <p className="text-slate-500 text-xs mb-8 leading-relaxed">
              Recibirás un enlace de Supabase para restablecer tu contraseña. El enlace expira en 1 hora.
            </p>
            <button onClick={onBack}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all">
              Volver al inicio de sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-indigo-600 via-purple-500 to-indigo-600" />
          <div className="px-8 py-10">
            <button onClick={onBack}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors text-sm mb-8">
              <IconArrowL /> Volver al login
            </button>
            <div className="flex flex-col items-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center font-bold text-white text-2xl shadow-lg shadow-indigo-500/30 mb-4">S</div>
              <h1 className="text-xl font-bold text-white">Recuperar contraseña</h1>
              <p className="text-slate-500 text-sm mt-2 text-center leading-relaxed">
                Supabase enviará un enlace de recuperación a tu correo
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Correo electrónico</label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"><IconMail /></div>
                  <input type="email" value={email}
                    onChange={e => { setEmail(e.target.value); setError('') }}
                    placeholder="tu@correo.com"
                    className={`w-full bg-slate-900 border rounded-xl pl-11 pr-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none focus:ring-2 transition-all ${error ? 'border-red-500 focus:ring-red-500' : 'border-slate-700 focus:ring-indigo-500'}`} />
                </div>
                {error && <p className="text-red-400 text-xs mt-1.5">{error}</p>}
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2">
                {loading
                  ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity=".25"/><path fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" opacity=".75"/></svg>Enviando...</>
                  : 'Enviar enlace de recuperación'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Export principal ──────────────────────────────────────────────────
export default function LoginPage() {
  const [view, setView] = useState('login')
  if (view === 'forgot') return <ForgotView onBack={() => setView('login')} />
  return <LoginView onForgot={() => setView('forgot')} />
}
