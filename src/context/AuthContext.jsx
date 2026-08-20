import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,          setUser]         = useState(null)
  const [sessionLista,  setSessionLista] = useState(false)
  const [cargando,      setCargando]     = useState(true)
  const ignorarCambioSesion             = useRef(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        // Verificar si el token está expirado y renovarlo antes de usarlo
        const ahora = Math.floor(Date.now() / 1000)
        const expirado = session.expires_at && session.expires_at < ahora

        if (expirado) {
          // Token expirado — intentar renovar con refresh_token
          const { data: refreshed, error } = await supabase.auth.refreshSession()
          if (error || !refreshed?.session) {
            // No se pudo renovar — limpiar y pedir login de nuevo
            await _limpiarSesion()
            setSessionLista(true)
            setCargando(false)
            return
          }
          await cargarPerfil(refreshed.session.user.email)
        } else {
          await cargarPerfil(session.user.email)
        }
      }
      setSessionLista(true)
      setCargando(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (ignorarCambioSesion.current) return

        if (event === 'TOKEN_REFRESHED' && session) {
          // Token renovado automáticamente por Supabase — actualizar perfil
          await cargarPerfil(session.user.email)
        } else if (session) {
          await cargarPerfil(session.user.email)
        } else {
          setUser(null)
        }
        setCargando(false)
        setSessionLista(true)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const cargarPerfil = async (email) => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', email)
        .single()
      if (error || !data) {
        setUser({ email, nombre: email, rol: 'Vendedor' })
      } else {
        setUser({
          id:     data.id,
          email:  data.email,
          nombre: data.nombre,
          rol:    data.rol,
          estado: data.estado,
        })
      }
    } catch {
      setUser({ email, nombre: email, rol: 'Vendedor' })
    }
  }

  // Limpia la sesión del localStorage sin depender de una petición a Supabase
  const _limpiarSesion = async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' })
    } catch {
      // Si falla, limpiar manualmente el localStorage
      Object.keys(localStorage)
        .filter(k => k.startsWith('sb-'))
        .forEach(k => localStorage.removeItem(k))
    }
    setUser(null)
  }

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  // Logout robusto: usa scope:'local' para no depender del servidor
  // Si el token está roto/expirado, igual limpia la sesión localmente
  const logout = async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' })
    } catch {
      Object.keys(localStorage)
        .filter(k => k.startsWith('sb-'))
        .forEach(k => localStorage.removeItem(k))
    } finally {
      setUser(null)
    }
  }

  const recuperarPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{
      user, cargando, sessionLista,
      isAdmin: user?.rol === 'Administrador',
      ignorarCambioSesion,
      login, logout, recuperarPassword,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth    = () => useContext(AuthContext)
export const useIsAdmin = () => useContext(AuthContext).isAdmin
