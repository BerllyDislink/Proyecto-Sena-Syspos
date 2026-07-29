import { useState } from 'react'
import { AppLayout, Toast, ConfirmModal, useToast } from '../components/UI'
import { useData } from '../context/DataContext'
import { useIsAdmin } from '../context/AuthContext'
import { IconPlus, IconSearch, IconEdit, IconTrash, IconX, IconEye, IconEyeOff } from '../components/Icons'

// ── Constantes ────────────────────────────────────────────────────────
const ROLES = ['Administrador', 'Vendedor', 'Cajero', 'Supervisor']
const ROL_STYLE = {
  Administrador: 'text-primary-300 bg-primary-900/70',
  Vendedor:      'text-emerald-300 bg-emerald-900/60',
  Cajero:        'text-sky-300 bg-sky-900/60',
  Supervisor:    'text-amber-300 bg-amber-900/60',
}
const ESTADO_STYLE = {
  Activo:   'text-emerald-400 bg-emerald-400/10',
  Inactivo: 'text-slate-400 bg-primary-700/60',
}
const AVATAR_COLORS = ['#4f46e5','#7c3aed','#059669','#0284c7','#db2777','#d97706','#0d9488']
const avatarColor = (n) => AVATAR_COLORS[n.charCodeAt(0) % AVATAR_COLORS.length]
const initials    = (n) => n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

// ── Modal: acción bloqueada (no admin) ───────────────────────────────
function AccesoRestringidoModal({ accion = 'realizar esta acción', onClose }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-primary-800 border border-primary-700 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 mx-auto mb-4">
          <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <h3 className="font-bold text-white text-base mb-2">Acceso restringido</h3>
        <p className="text-slate-400 text-sm leading-relaxed mb-6">
          Solo los <span className="text-primary-400 font-semibold">Administradores</span> pueden {accion}. Contacta a tu administrador.
        </p>
        <button onClick={onClose}
          className="w-full py-2.5 rounded-lg bg-primary-700 hover:bg-primary-600 text-slate-200 text-sm font-medium transition-colors">
          Entendido
        </button>
      </div>
    </div>
  )
}

// ── Modal: crear / editar usuario ─────────────────────────────────────
function UserModal({ mode, user, onSave, onClose, existingEmails }) {
  const [form, setForm]     = useState(
    user
      ? { nombre: user.nombre, email: user.email, rol: user.rol, estado: user.estado, password: '' }
      : { nombre: '', email: '', rol: '', estado: 'Activo', password: '' }
  )
  const [showPass, setShowPass] = useState(false)
  const [errors, setErrors]     = useState({})
  const [saving, setSaving]     = useState(false)

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: null, general: null })) }

  const validate = () => {
    const e = {}
    if (!form.nombre.trim()) e.nombre = 'El nombre es requerido'
    if (!form.email.trim())  e.email  = 'El correo es requerido'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Correo inválido'
    else if (
      existingEmails.includes(form.email) &&
      (!user || user.email !== form.email)
    ) e.email = 'Este correo ya está registrado'
    if (!form.rol) e.rol = 'Selecciona un rol'
    if (mode === 'add') {
      if (!form.password)              e.password = 'La contraseña es requerida'
      else if (form.password.length < 6) e.password = 'Mínimo 6 caracteres'
    } else if (form.password && form.password.length < 6) {
      e.password = 'Mínimo 6 caracteres'
    }
    return e
  }

  const handleSave = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    try {
      await onSave(form)
    } catch (err) {
      const msg = (err.message || err.details || JSON.stringify(err)).toLowerCase()
      if (msg.includes('ya está registrado') || msg.includes('unique') || msg.includes('already')) {
        setErrors({ email: 'Este correo ya tiene una cuenta en el sistema' })
      } else if (msg.includes('administrador') || msg.includes('privilege')) {
        setErrors({ general: 'Tu sesión no tiene permisos de administrador. Cierra sesión, vuelve a entrar y reintenta.' })
      } else if (msg.includes('password') || msg.includes('contraseña')) {
        setErrors({ password: 'La contraseña no cumple los requisitos mínimos' })
      } else {
        setErrors({ general: 'Error al guardar: ' + (err.message || JSON.stringify(err)) })
      }
    } finally {
      setSaving(false)
    }
  }

  const inp = (k) =>
    `w-full bg-primary-900 border rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:ring-2 focus:ring-primary-500 transition ${errors[k] ? 'border-red-500 focus:ring-red-500' : 'border-primary-700'}`

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-primary-800 border border-primary-700 rounded-2xl shadow-2xl w-full max-w-md mx-4 flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-primary-700 flex-shrink-0">
          <div>
            <h2 className="font-semibold text-white text-base">
              {mode === 'add' ? 'Crear nuevo usuario' : 'Editar usuario'}
            </h2>
            <p className="text-xs text-primary-400 mt-0.5 flex items-center gap-1">
              <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              Solo administradores
            </p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors"><IconX /></button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {errors.general && (
            <div className="bg-red-900/40 border border-red-700/50 rounded-xl px-4 py-3 text-sm text-red-300 leading-relaxed">
              {errors.general}
            </div>
          )}

          {/* Nombre */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Nombre completo</label>
            <input value={form.nombre} onChange={e => set('nombre', e.target.value)}
              placeholder="Ej: Juan Pérez" className={inp('nombre')} />
            {errors.nombre && <p className="text-red-400 text-xs mt-1">{errors.nombre}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Correo electrónico</label>
            <input type="email" value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="usuario@syspos.com"
              readOnly={mode === 'edit'}
              className={`${inp('email')} ${mode === 'edit' ? 'opacity-60 cursor-not-allowed' : ''}`} />
            {mode === 'edit' && (
              <p className="text-slate-500 text-xs mt-1">El correo no puede modificarse</p>
            )}
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
          </div>

          {/* Rol + Estado */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Rol</label>
              <select value={form.rol} onChange={e => set('rol', e.target.value)} className={inp('rol')}>
                <option value="">Seleccionar rol</option>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              {errors.rol && <p className="text-red-400 text-xs mt-1">{errors.rol}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Estado</label>
              <select value={form.estado} onChange={e => set('estado', e.target.value)}
                className="w-full bg-primary-900 border border-primary-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-primary-500 transition">
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              {mode === 'add' ? 'Contraseña *' : 'Nueva contraseña (vacío = sin cambios)'}
            </label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} value={form.password}
                onChange={e => set('password', e.target.value)}
                placeholder={mode === 'add' ? 'Mínimo 6 caracteres' : '••••••••'}
                className={`${inp('password')} pr-10`} />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                {showPass ? <IconEyeOff /> : <IconEye />}
              </button>
            </div>
            {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
          </div>

          {/* Info para modo crear */}
          {mode === 'add' && (
            <div className="flex items-start gap-2.5 bg-emerald-950/40 border border-emerald-800/40 rounded-xl px-4 py-3">
              <svg width={14} height={14} className="text-emerald-400 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><polyline points="12 8 12 12 14 14"/>
              </svg>
              <p className="text-xs text-emerald-300 leading-relaxed">
                El usuario podrá iniciar sesión en SysPOS inmediatamente con estas credenciales.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 pt-2 flex gap-3 flex-shrink-0">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-primary-600 text-slate-300 text-sm font-medium hover:bg-primary-700 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
            {saving
              ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity=".25"/>
                  <path fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" opacity=".75"/>
                </svg>Guardando...</>
              : mode === 'add' ? 'Crear usuario' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────
export default function UsuariosPage() {
  const isAdmin = useIsAdmin()
  const { usuarios, agregarUsuario, editarUsuario, eliminarUsuario, eliminarUsuarios, cargando } = useData()

  const [search, setSearch]         = useState('')
  const [filtroRol, setFiltroRol]   = useState('Todos')
  const [selected, setSelected]     = useState([])
  const [userModal, setUserModal]   = useState(null)
  const [confirm, setConfirm]       = useState(null)
  const [bloqueado, setBloqueado]   = useState(null) // { accion }
  const { toast, showToast }        = useToast()

  const filtered = usuarios.filter(u => {
    const q = search.toLowerCase()
    return (
      (u.nombre.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) &&
      (filtroRol === 'Todos' || u.rol === filtroRol)
    )
  })

  const toggleSel = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  const toggleAll = () => setSelected(selected.length === filtered.length ? [] : filtered.map(u => u.id))

  // ── Guardar ─────────────────────────────────────────────────────────
  const handleSave = async (data) => {
    if (userModal.mode === 'add') {
      await agregarUsuario(data)
      showToast(`"${data.nombre}" creado — ya puede iniciar sesión`)
    } else {
      await editarUsuario(userModal.user.id, data)
      showToast(`"${data.nombre}" actualizado con éxito`)
    }
    setUserModal(null)
  }

  // ── Eliminar uno ────────────────────────────────────────────────────
  const askDeleteOne = (user) => {
    if (!isAdmin) { setBloqueado({ accion: 'eliminar usuarios' }); return }
    setConfirm({
      title: 'Eliminar usuario', variant: 'danger', confirmLabel: 'Eliminar',
      message: `¿Eliminar a "${user.nombre}"? También perderá acceso al sistema.`,
      onConfirm: async () => {
        await eliminarUsuario(user.id)
        setSelected(s => s.filter(x => x !== user.id))
        setConfirm(null)
        showToast(`"${user.nombre}" eliminado`)
      },
    })
  }

  // ── Eliminar seleccionados ──────────────────────────────────────────
  const askDeleteSelected = () => {
    if (!isAdmin) { setBloqueado({ accion: 'eliminar usuarios' }); return }
    const n = selected.length
    setConfirm({
      title: `Eliminar ${n} usuario${n > 1 ? 's' : ''}`,
      variant: 'danger', confirmLabel: 'Eliminar',
      message: `¿Eliminar ${n} usuario${n > 1 ? 's' : ''}? También perderán acceso al sistema.`,
      onConfirm: async () => {
        await eliminarUsuarios(selected)
        setSelected([])
        setConfirm(null)
        showToast(`${n} usuario${n > 1 ? 's eliminados' : ' eliminado'}`)
      },
    })
  }

  if (cargando) return (
    <AppLayout>
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin w-8 h-8 text-primary-400" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity=".25"/>
            <path fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" opacity=".75"/>
          </svg>
          <p className="text-slate-500 text-sm">Cargando usuarios...</p>
        </div>
      </div>
    </AppLayout>
  )

  return (
    <AppLayout>
      {/* Header */}
      <header className="border-b border-primary-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-white">Usuarios</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {usuarios.length} usuarios · {usuarios.filter(u => u.estado === 'Activo').length} activos
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Badge rol */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
            isAdmin
              ? 'text-primary-300 bg-primary-900/50 border-primary-700/50'
              : 'text-slate-400 bg-primary-800 border-primary-700'
          }`}>
            <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            {isAdmin ? 'Administrador — acceso total' : 'Solo lectura'}
          </div>

          {/* Botón nuevo usuario — solo visible para admins */}
          {isAdmin ? (
            <button onClick={() => setUserModal({ mode: 'add', user: null })}
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors shadow-lg shadow-primary-500/20">
              <IconPlus /> Nuevo usuario
            </button>
          ) : (
            <button onClick={() => setBloqueado({ accion: 'crear usuarios' })}
              className="flex items-center gap-2 bg-primary-700 text-slate-500 text-sm font-medium px-4 py-2.5 rounded-lg cursor-not-allowed">
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Nuevo usuario
            </button>
          )}
        </div>
      </header>

      {/* Aviso no admin */}
      {!isAdmin && (
        <div className="mx-6 mt-4 flex items-start gap-3 bg-amber-950/30 border border-amber-800/40 rounded-xl px-4 py-3">
          <svg width={16} height={16} className="text-amber-400 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <p className="text-xs text-amber-300 leading-relaxed">
            Estás en modo <strong>solo lectura</strong>. Crear, editar y eliminar usuarios requiere rol de <strong>Administrador</strong>.
          </p>
        </div>
      )}

      {/* Stats */}
      <div className={`px-6 grid grid-cols-4 gap-3 flex-shrink-0 ${isAdmin ? 'pt-4 pb-2' : 'pt-3 pb-2'}`}>
        {[
          { val: usuarios.length,                                       label: 'Total',     color: 'text-primary-400'  },
          { val: usuarios.filter(u => u.estado === 'Activo').length,   label: 'Activos',   color: 'text-emerald-400' },
          { val: usuarios.filter(u => u.estado === 'Inactivo').length, label: 'Inactivos', color: 'text-slate-400'   },
          { val: [...new Set(usuarios.map(u => u.rol))].length,        label: 'Roles',     color: 'text-purple-400'  },
        ].map((s, i) => (
          <div key={i} className="bg-primary-900 border border-primary-800 rounded-xl px-4 py-3">
            <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="px-6 py-3 flex items-center gap-3 border-b border-primary-800 flex-shrink-0 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"><IconSearch /></div>
          <input value={search} onChange={e => { setSearch(e.target.value); setSelected([]) }}
            placeholder="Buscar nombre o correo..."
            className="w-full bg-primary-900 border border-primary-700 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-100 placeholder-slate-600 outline-none focus:ring-2 focus:ring-primary-500 transition" />
        </div>

        <div className="flex gap-1 bg-primary-900 border border-primary-800 rounded-lg p-1">
          {['Todos', ...ROLES].map(r => (
            <button key={r} onClick={() => setFiltroRol(r)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${filtroRol === r ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
              {r}
            </button>
          ))}
        </div>

        {selected.length > 0 && isAdmin && (
          <button onClick={askDeleteSelected}
            className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/30 border border-red-600/50 text-red-400 text-sm font-medium px-3 py-2 rounded-lg transition-colors">
            <IconTrash /> Eliminar ({selected.length})
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <div className="rounded-2xl border border-primary-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-primary-900 border-b border-primary-800">
                {isAdmin && (
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox"
                      checked={filtered.length > 0 && selected.length === filtered.length}
                      onChange={toggleAll}
                      className="accent-primary-500 w-4 h-4 cursor-pointer" />
                  </th>
                )}
                {['Usuario', 'Correo', 'Rol', 'Estado', 'Creado', 'Acciones'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.length === 0
                ? <tr><td colSpan={isAdmin ? 7 : 6} className="text-center py-16 text-slate-600 text-sm">No se encontraron usuarios</td></tr>
                : filtered.map(u => (
                  <tr key={u.id} className={`transition-colors ${selected.includes(u.id) ? 'bg-primary-950/30' : 'hover:bg-primary-900/60'}`}>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggleSel(u.id)}
                          className="accent-primary-500 w-4 h-4 cursor-pointer" />
                      </td>
                    )}
                    {/* Avatar + nombre */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                          style={{ background: avatarColor(u.nombre) }}>
                          {initials(u.nombre)}
                        </div>
                        <span className="text-sm font-medium text-slate-100">{u.nombre}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${ROL_STYLE[u.rol] || ''}`}>{u.rol}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${ESTADO_STYLE[u.estado]}`}>{u.estado}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{u.creado}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {isAdmin ? (
                          <>
                            {/* Editar — solo admin */}
                            <button
                              onClick={() => setUserModal({ mode: 'edit', user: u })}
                              title="Editar usuario"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-primary-400 hover:bg-primary-400/10 transition-colors">
                              <IconEdit />
                            </button>
                            {/* Eliminar — solo admin */}
                            <button
                              onClick={() => askDeleteOne(u)}
                              title="Eliminar usuario"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors">
                              <IconTrash />
                            </button>
                          </>
                        ) : (
                          /* No admin — botones bloqueados visualmente */
                          <span className="flex items-center gap-1 text-xs text-slate-600 px-2 py-1">
                            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                            Sin acceso
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {userModal && (
        <UserModal
          mode={userModal.mode}
          user={userModal.user}
          onSave={handleSave}
          onClose={() => setUserModal(null)}
          existingEmails={usuarios.map(u => u.email)}
        />
      )}
      {confirm   && <ConfirmModal data={confirm} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}
      {bloqueado && <AccesoRestringidoModal accion={bloqueado.accion} onClose={() => setBloqueado(null)} />}
      <Toast toast={toast} />
    </AppLayout>
  )
}
