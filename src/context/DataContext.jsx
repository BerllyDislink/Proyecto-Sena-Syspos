import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const DataContext = createContext(null)

function fechasUltimos7Dias() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d.toISOString().slice(0, 10)
  })
}
function labelDia(f) {
  return ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][new Date(f + 'T12:00:00').getDay()]
}

function formatearVenta(v) {
  const f = new Date(v.created_at)
  return {
    id: v.numero, _uuid: v.id, cliente: v.cliente, tel: v.tel || '', email: v.email || '',
    fecha: f.toISOString().slice(0, 10),
    hora:  f.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
    estado: v.estado, total: Number(v.total),
    // Relación con usuarios (vendedor)
    vendedor_id:     v.vendedor_id     || null,
    vendedor_nombre: v.usuarios?.nombre || null,
    vendedor_rol:    v.usuarios?.rol    || null,
    // Ítems con relación a productos
    items: (v.venta_items || []).map(it => ({
      producto:    it.producto,
      producto_id: it.producto_id || null,
      qty:         it.qty,
      precio:      Number(it.precio),
    })),
  }
}
function formatearProducto(p) {
  return { id: p.id, nombre: p.nombre, categoria: p.categoria, precio: Number(p.precio), stock: p.stock, descripcion: p.descripcion || '', creado: new Date(p.created_at).toLocaleDateString('es-CO') }
}
function formatearUsuario(u) {
  return { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol, estado: u.estado, creado: new Date(u.created_at).toLocaleDateString('es-CO') }
}

async function generarNumeroVenta() {
  const { data } = await supabase.from('ventas').select('numero').order('created_at', { ascending: false }).limit(1)
  if (!data || data.length === 0) return '00001'
  return String(parseInt(data[0].numero, 10) + 1).padStart(5, '0')
}

export function DataProvider({ children }) {
  const { sessionLista, ignorarCambioSesion, user } = useAuth()

  const [ventas,    setVentas]    = useState([])
  const [productos, setProductos] = useState([])
  const [usuarios,  setUsuarios]  = useState([])
  const [cargando,  setCargando]  = useState(true)
  const [error,     setError]     = useState(null)
  const busy = useRef(false)

  const recargarDatos = useCallback(async () => {
    if (busy.current) return
    busy.current = true
    try {
      const [rV, rP, rU] = await Promise.all([
        // Join con usuarios para obtener nombre del vendedor
        supabase.from('ventas').select('*, venta_items(*), usuarios(nombre, rol)').order('created_at', { ascending: false }),
        supabase.from('productos').select('*').order('nombre'),
        supabase.from('usuarios').select('*').order('nombre'),
      ])
      if (rV.error || rP.error || rU.error) return
      setVentas(rV.data.map(formatearVenta))
      setProductos(rP.data.map(formatearProducto))
      setUsuarios(rU.data.map(formatearUsuario))
      setError(null)
    } catch (e) {
      console.warn('recargar:', e.message)
    } finally {
      busy.current = false
    }
  }, [])

  // ── Carga inicial: espera a que Auth confirme la sesión ───────────────
  // ESTE ES EL FIX PRINCIPAL.
  // Si la app carga antes de que Auth restaure la sesión del localStorage,
  // Supabase rechaza las consultas por RLS y los datos quedan vacíos.
  // Ahora esperamos a que sessionLista=true antes de hacer cualquier fetch.
  useEffect(() => {
    if (!sessionLista) return  // esperar a Auth

    const cargar = async () => {
      setCargando(true)
      setError(null)
      try {
        const [rV, rP, rU] = await Promise.all([
          supabase.from('ventas').select('*, venta_items(*), usuarios(nombre, rol)').order('created_at', { ascending: false }),
          supabase.from('productos').select('*').order('nombre'),
          supabase.from('usuarios').select('*').order('nombre'),
        ])
        if (rV.error) throw rV.error
        if (rP.error) throw rP.error
        if (rU.error) throw rU.error
        setVentas(rV.data.map(formatearVenta))
        setProductos(rP.data.map(formatearProducto))
        setUsuarios(rU.data.map(formatearUsuario))
        setError(null)
      } catch (e) {
        console.error('carga inicial:', e.message)
        setError('No se pudieron cargar los datos. Verifica tu conexión.')
      } finally {
        setCargando(false)
      }
    }

    cargar()
  }, [sessionLista])

  // Recargar cuando el usuario cambia (login/logout)
  useEffect(() => {
    if (!sessionLista) return
    if (user) {
      recargarDatos()
    } else {
      setVentas([]); setProductos([]); setUsuarios([])
    }
  }, [user?.id]) // eslint-disable-line

  // Suscripciones tiempo real (solo con sesión activa)
  useEffect(() => {
    if (!sessionLista || !user) return

    const cV = supabase.channel('v-rt').on('postgres_changes', { event: '*', schema: 'public', table: 'ventas' },    recargarDatos).subscribe()
    const cP = supabase.channel('p-rt').on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, recargarDatos).subscribe()
    const cU = supabase.channel('u-rt').on('postgres_changes', { event: '*', schema: 'public', table: 'usuarios' },  recargarDatos).subscribe()

    return () => { supabase.removeChannel(cV); supabase.removeChannel(cP); supabase.removeChannel(cU) }
  }, [sessionLista, user?.id, recargarDatos]) // eslint-disable-line

  // ── CRUD Ventas ───────────────────────────────────────────────────────
  const agregarVenta = async (data) => {
    const numero = await generarNumeroVenta()

    // Obtener el UUID del usuario autenticado
    const { data: { session } } = await supabase.auth.getSession()
    const authUserId = session?.user?.id || null

    // Verificar que ese UUID existe en la tabla usuarios (FK válida)
    // Si no existe, enviar null para no violar la FK constraint
    let vendedor_id = null
    if (authUserId) {
      const { data: perfilExiste } = await supabase
        .from('usuarios')
        .select('id')
        .eq('id', authUserId)
        .maybeSingle()
      vendedor_id = perfilExiste?.id || null
    }

    const { data: v, error: e1 } = await supabase.from('ventas')
      .insert({
        numero,
        cliente:     data.cliente,
        tel:         data.tel   || null,
        email:       data.email || null,
        estado:      'Completada',
        total:       data.total,
        vendedor_id,  // null si el usuario no está en la tabla usuarios
      })
      .select().single()
    if (e1) throw e1

    // Incluir producto_id en cada ítem para la relación con productos
    const { error: e2 } = await supabase.from('venta_items').insert(
      data.items.map(it => ({
        venta_id:   v.id,
        producto_id: it.producto_id || null,  // ← relación con productos
        producto:   it.producto,
        qty:        it.qty,
        precio:     it.precio,
      }))
    )
    if (e2) throw e2

    // Descontar stock
    for (const item of data.items) {
      const prod = productos.find(p => p.nombre === item.producto)
      if (prod) await supabase.from('productos').update({ stock: Math.max(0, prod.stock - item.qty) }).eq('id', prod.id)
    }

    await recargarDatos()
    return numero
  }

  const actualizarEstadoVenta = async (numero, estado) => {
    const { error } = await supabase.from('ventas').update({ estado }).eq('numero', numero)
    if (error) throw error

    // Devolver stock cuando se anula o reembolsa
    if (estado === 'Anulada' || estado === 'Reembolso') {
      const venta = ventas.find(v => v.id === numero)

      if (venta?.items?.length) {
        for (const item of venta.items) {
          // Leer stock ACTUAL desde Supabase (no desde memoria, que puede estar desactualizada)
          const productoId = item.producto_id
            ? item.producto_id
            : productos.find(p => p.nombre === item.producto)?.id

          if (!productoId) continue

          const { data: prodActual } = await supabase
            .from('productos')
            .select('id, stock')
            .eq('id', productoId)
            .single()

          if (prodActual) {
            await supabase
              .from('productos')
              .update({ stock: prodActual.stock + item.qty })
              .eq('id', prodActual.id)
          }
        }
      }
    }

    await recargarDatos()
  }

  // ── CRUD Productos ────────────────────────────────────────────────────
  const agregarProducto = async (data) => {
    const { error } = await supabase.from('productos').insert({ nombre: data.nombre, categoria: data.categoria, precio: data.precio, stock: data.stock, descripcion: data.descripcion || null })
    if (error) throw error
    await recargarDatos()
  }

  const editarProducto = async (id, data) => {
    const { error } = await supabase.from('productos').update({ nombre: data.nombre, categoria: data.categoria, precio: data.precio, stock: data.stock, descripcion: data.descripcion || null }).eq('id', id)
    if (error) throw error
    setProductos(prev => prev.map(p => p.id === id ? { ...p, ...data } : p))
  }

  const eliminarProducto = async (id) => {
    const { error } = await supabase.from('productos').delete().eq('id', id)
    if (error) throw error
    setProductos(prev => prev.filter(p => p.id !== id))
  }

  const eliminarProductos = async (ids) => {
    const { error } = await supabase.from('productos').delete().in('id', ids)
    if (error) throw error
    setProductos(prev => prev.filter(p => !ids.includes(p.id)))
  }

  // ── CRUD Usuarios ─────────────────────────────────────────────────────
  const agregarUsuario = async (data) => {
    const { data: { session: s } } = await supabase.auth.getSession()
    if (!s) throw new Error('No hay sesión activa')
    const rt = s.refresh_token

    ignorarCambioSesion.current = true
    try {
      // 1. Crear cuenta del nuevo usuario en Auth
      const { data: authData, error: e1 } = await supabase.auth.signUp({
        email:    data.email,
        password: data.password,
        options:  { data: { nombre: data.nombre, rol: data.rol } },
      })
      if (e1) throw e1
      if (!authData?.user) throw new Error('No se pudo crear la cuenta')

      // 2. Insertar perfil en tabla usuarios
      const { error: e2 } = await supabase.from('usuarios').insert({
        id:     authData.user.id,
        nombre: data.nombre,
        email:  data.email,
        rol:    data.rol,
        estado: data.estado,
      })
      if (e2) throw e2

      // 3. Restaurar sesión del admin con el refresh_token guardado
      const { data: restored, error: e3 } = await supabase.auth.refreshSession({
        refresh_token: rt,
      })

      if (e3 || !restored?.session?.access_token) {
        // Si refreshSession falla, forzar logout para que el admin haga login de nuevo
        // Es mejor un login limpio que una sesión rota que congela la app
        Object.keys(localStorage)
          .filter(k => k.startsWith('sb-'))
          .forEach(k => localStorage.removeItem(k))
        throw new Error(
          'Usuario creado correctamente, pero la sesión del administrador expiró. ' +
          'Por favor inicia sesión de nuevo.'
        )
      }

      await recargarDatos()
      return authData.user.id
    } finally {
      // Siempre desactivar el flag, pase lo que pase
      ignorarCambioSesion.current = false
    }
  }

  const editarUsuario = async (id, data) => {
    const { error } = await supabase.from('usuarios').update({ nombre: data.nombre, rol: data.rol, estado: data.estado }).eq('id', id)
    if (error) throw error
    if (data.password && data.password.trim().length >= 6) {
      const { error: e2 } = await supabase.rpc('actualizar_password_usuario', { p_user_id: id, p_password: data.password })
      if (e2) throw e2
    }
    setUsuarios(prev => prev.map(u => u.id === id ? { ...u, ...data } : u))
  }

  const eliminarUsuario = async (id) => {
    const { error } = await supabase.rpc('eliminar_usuario', { p_user_id: id })
    if (error) throw error
    setUsuarios(prev => prev.filter(u => u.id !== id))
  }

  const eliminarUsuarios = async (ids) => {
    for (const id of ids) {
      const { error } = await supabase.rpc('eliminar_usuario', { p_user_id: id })
      if (error) throw error
    }
    setUsuarios(prev => prev.filter(u => !ids.includes(u.id)))
  }

  // ── Métricas ──────────────────────────────────────────────────────────
  const metricas = useMemo(() => {
    const comp = ventas.filter(v => v.estado === 'Completada')
    const anul = ventas.filter(v => v.estado === 'Anulada')
    const reem = ventas.filter(v => v.estado === 'Reembolso')
    const conteo = {}
    comp.forEach(v => v.items.forEach(it => { conteo[it.producto] = (conteo[it.producto] || 0) + it.qty }))
    const topProductos = Object.entries(conteo).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([nombre,vendidos])=>({nombre,vendidos}))
    const dias7 = fechasUltimos7Dias()
    const ventasPorDia = dias7.map(fecha => {
      const d = comp.filter(v => v.fecha === fecha)
      return { label: labelDia(fecha), fecha, value: d.reduce((s,v)=>s+v.total,0), cantidad: d.length }
    })
    return {
      totalIngresos:   comp.reduce((s,v)=>s+v.total,0),
      totalVentas:     comp.length,
      totalAnuladas:   anul.length,
      totalReembolsos: reem.reduce((s,v)=>s+v.total,0),
      stockTotal:      productos.reduce((s,p)=>s+p.stock,0),
      topProductos, ventasPorDia,
      ventasRecientes: ventas.slice(0,5),
    }
  }, [ventas, productos])

  return (
    <DataContext.Provider value={{
      ventas, productos, usuarios, metricas, cargando, error, recargarDatos,
      agregarVenta, actualizarEstadoVenta,
      agregarProducto, editarProducto, eliminarProducto, eliminarProductos,
      agregarUsuario, editarUsuario, eliminarUsuario, eliminarUsuarios,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export const useData = () => useContext(DataContext)
