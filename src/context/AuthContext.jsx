import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,         setUser]         = useState(null)
  const [sessionLista, setSessionLista] = useState(false)
  const [cargando,     setCargando]     = useState(true)
  const ignorarCambioSesion             = useRef(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        cargarPerfil(session.user.email).finally(() => {
          setSessionLista(true)
          setCargando(false)
        })
      } else {
        setSessionLista(true)
        setCargando(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (ignorarCambioSesion.current) return
        if (session) {
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
        setUser({ id: data.id, email: data.email, nombre: data.nombre, rol: data.rol, estado: data.estado })
      }
    } catch {
      setUser({ email, nombre: email, rol: 'Vendedor' })
    }
  }

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
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
