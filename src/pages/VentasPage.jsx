import { useState } from 'react'
import { AppLayout, Toast, ConfirmModal, useToast } from '../components/UI'
import { useData } from '../context/DataContext'
import { IconPlus, IconSearch, IconPrint, IconBan, IconRefund, IconX, IconTrash, IconCart } from '../components/Icons'

const STATUS_PILL = {
  Completada: 'text-emerald-400 bg-emerald-400/10',
  Anulada:    'text-red-400 bg-red-400/10',
  Reembolso:  'text-amber-400 bg-amber-400/10',
}
const STATUS_BORDER = {
  Completada: 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/30',
  Anulada:    'text-red-400 bg-red-400/10 border border-red-400/30',
  Reembolso:  'text-amber-400 bg-amber-400/10 border border-amber-400/30',
}

function clientInitials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

// ── Modal Factura ─────────────────────────────────────────────────────
function FacturaModal({ venta, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs mx-4 text-slate-800">
        <div className="px-6 pt-5 pb-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-bold text-slate-800 text-sm">Factura #{venta.id}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><IconX /></button>
        </div>
        <div className="px-6 py-4 space-y-2">
          <div className="text-center mb-4">
            <p className="font-bold text-lg text-indigo-700">SysPOS</p>
            <p className="text-xs text-slate-400">Sistema de Punto de Venta</p>
            <p className="text-xs text-slate-400 mt-0.5">{venta.fecha} {venta.hora}</p>
          </div>
          <div className="flex justify-between text-xs"><span className="text-slate-500">Cliente:</span><span className="font-medium">{venta.cliente}</span></div>
          {venta.tel   && <div className="flex justify-between text-xs"><span className="text-slate-500">Teléfono:</span><span>{venta.tel}</span></div>}
          {venta.email && <div className="flex justify-between text-xs"><span className="text-slate-500">Correo:</span><span>{venta.email}</span></div>}
          {venta.vendedor_nombre && <div className="flex justify-between text-xs"><span className="text-slate-500">Atendido por:</span><span>{venta.vendedor_nombre}</span></div>}
          <div className="border-t border-dashed border-slate-300 my-2" />
          {venta.items.map((it, i) => (
            <div key={i} className="flex justify-between text-xs">
              <span className="text-slate-600">{it.producto} x{it.qty}</span>
              <span className="font-medium">${(it.precio * it.qty).toFixed(2)}</span>
            </div>
          ))}
          <div className="border-t border-dashed border-slate-300 my-2" />
          <div className="flex justify-between font-bold text-sm">
            <span>Total</span><span className="text-indigo-700">${venta.total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>Estado:</span><span>{venta.estado}</span>
          </div>
        </div>
        <div className="px-6 pb-5 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm hover:bg-slate-50">Cerrar</button>
          <button onClick={() => window.print()} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-500">
            <IconPrint /> Imprimir
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal Nueva Venta ─────────────────────────────────────────────────
// FIX: comparar IDs como strings (UUID), no como Number
function NuevaVentaModal({ productos, onSave, onClose }) {
  const [items, setItems]   = useState([{ prodId: '', qty: 1 }])
  const [cliente, setCliente] = useState('')
  const [tel, setTel]       = useState('')
  const [email, setEmail]   = useState('')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  // FIX: comparar prodId como string directamente (UUID)
  const findProducto = (prodId) => productos.find(x => x.id === prodId)

  const updateItem = (i, field, val) => {
    const copy = [...items]
    copy[i] = { ...copy[i], [field]: val }
    setItems(copy)
    setErrors(e => ({ ...e, [`item_${i}`]: null }))
  }

  // FIX: subtotal usa findProducto con string
  const subtotal = items.reduce((acc, it) => {
    const p = findProducto(it.prodId)
    return acc + (p ? p.precio * Math.max(1, Number(it.qty) || 0) : 0)
  }, 0)

  const handleSave = async () => {
    const e = {}
    if (!cliente.trim()) e.cliente = 'El nombre del cliente es requerido'
    items.forEach((it, i) => {
      if (!it.prodId)          e[`item_${i}`] = 'Selecciona un producto'
      else if (Number(it.qty) < 1) e[`item_${i}`] = 'Cantidad mínima: 1'
    })
    if (Object.keys(e).length) { setErrors(e); return }

    const lineas = items.map(it => {
      const p = findProducto(it.prodId)
      return {
        producto_id: p.id,       // ← FK a productos
        producto:    p.nombre,
        qty:         Number(it.qty),
        precio:      p.precio,
      }
    })

    setSaving(true)
    try {
      await onSave({ cliente, tel, email, items: lineas, total: subtotal })
    } catch (err) {
      setErrors({ general: 'Error al guardar la venta: ' + (err.message || 'Intenta de nuevo') })
    } finally {
      setSaving(false)
    }
  }

  const inp = (k) =>
    `w-full bg-slate-900 border rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:ring-2 focus:ring-indigo-500 transition ${errors[k] ? 'border-red-500' : 'border-slate-700'}`

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-700 flex-shrink-0">
          <h2 className="font-semibold text-white text-base">Registrar nueva venta</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><IconX /></button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {/* Error general */}
          {errors.general && (
            <div className="bg-red-900/40 border border-red-700/50 rounded-xl px-4 py-3 text-sm text-red-400">
              {errors.general}
            </div>
          )}

          {/* Cliente */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Nombre del cliente *</label>
            <input value={cliente} onChange={e => { setCliente(e.target.value); setErrors(er => ({ ...er, cliente: null })) }}
              placeholder="Ej: Juan Pérez" className={inp('cliente')} />
            {errors.cliente && <p className="text-red-400 text-xs mt-1">{errors.cliente}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Teléfono</label>
              <input value={tel} onChange={e => setTel(e.target.value)} placeholder="300 123 4567" className={inp(null)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Correo</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="cliente@email.com" className={inp(null)} />
            </div>
          </div>

          {/* Productos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-400">Productos</label>
              <button onClick={() => setItems([...items, { prodId: '', qty: 1 }])}
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                <IconPlus /> Agregar línea
              </button>
            </div>

            {productos.length === 0 && (
              <p className="text-xs text-amber-400 bg-amber-900/30 px-3 py-2 rounded-lg mb-2">
                No hay productos en el inventario. Agrega productos primero.
              </p>
            )}

            {items.map((it, i) => (
              <div key={i} className="mb-3">
                <div className="flex gap-2 items-center">
                  {/* FIX: value y comparación como string UUID */}
                  <select
                    value={it.prodId}
                    onChange={e => updateItem(i, 'prodId', e.target.value)}
                    className={`flex-1 bg-slate-900 border rounded-xl px-3 py-2.5 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 transition ${errors[`item_${i}`] ? 'border-red-500' : 'border-slate-700'}`}
                  >
                    <option value="">Seleccionar producto</option>
                    {productos.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} — ${p.precio.toFixed(2)}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number" min={1} value={it.qty}
                    onChange={e => updateItem(i, 'qty', e.target.value)}
                    className="w-20 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 transition text-center"
                  />

                  {/* Subtotal de esta línea */}
                  <span className="text-xs text-slate-400 w-20 text-right flex-shrink-0">
                    {findProducto(it.prodId)
                      ? `$${(findProducto(it.prodId).precio * Math.max(1, Number(it.qty) || 0)).toFixed(2)}`
                      : '—'}
                  </span>

                  {items.length > 1 && (
                    <button onClick={() => setItems(items.filter((_, idx) => idx !== i))}
                      className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0">
                      <IconTrash />
                    </button>
                  )}
                </div>
                {errors[`item_${i}`] && <p className="text-red-400 text-xs mt-1">{errors[`item_${i}`]}</p>}
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="flex items-center justify-between bg-slate-900 rounded-xl px-4 py-3 border border-slate-700">
            <span className="text-sm text-slate-400 font-medium">Total a cobrar</span>
            <span className="text-xl font-bold text-white">${subtotal.toFixed(2)}</span>
          </div>
        </div>

        <div className="px-6 pb-5 pt-2 flex gap-3 flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-slate-600 text-slate-300 text-sm font-medium hover:bg-slate-700 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || productos.length === 0}
            className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {saving
              ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity=".25"/><path fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" opacity=".75"/></svg>Guardando...</>
              : 'Guardar venta'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Panel detalle lateral ─────────────────────────────────────────────
function DetailPanel({ venta, onClose, onAnular, onReembolso, onFactura }) {
  if (!venta) return null
  return (
    <div className="w-80 flex-shrink-0 bg-slate-900 border-l border-slate-800 flex flex-col overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="font-semibold text-white text-sm">Venta #{venta.id}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{venta.fecha} {venta.hora}</p>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300 p-1"><IconX /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Vendedor */}
        <div>
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Atendido por</p>
          <div className="bg-slate-800 rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
              {venta.vendedor_nombre
                ? venta.vendedor_nombre.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                : '?'}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                {venta.vendedor_nombre || 'Usuario eliminado'}
              </p>
              <p className="text-[10px] text-slate-500">{venta.vendedor_rol || '—'}</p>
            </div>
          </div>
        </div>

        {/* Cliente */}
        <div>
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Datos del cliente</p>
          <div className="bg-slate-800 rounded-xl p-3.5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {clientInitials(venta.cliente)}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{venta.cliente}</p>
                <p className="text-[10px] text-slate-500">Cliente</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-900 rounded-lg p-2.5">
                <p className="text-[9px] text-slate-500 mb-0.5">Teléfono</p>
                <p className="text-xs text-slate-300 font-medium">{venta.tel || '—'}</p>
              </div>
              <div className="bg-slate-900 rounded-lg p-2.5">
                <p className="text-[9px] text-slate-500 mb-0.5">Correo</p>
                <p className="text-[10px] text-slate-300 font-medium break-all">{venta.email || '—'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Estado */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">Estado</span>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BORDER[venta.estado]}`}>
            {venta.estado}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-800 rounded-xl p-3">
            <p className="text-[9px] text-slate-500 mb-0.5">Fecha</p>
            <p className="text-xs text-slate-200 font-medium">{venta.fecha}</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-3">
            <p className="text-[9px] text-slate-500 mb-0.5">Hora</p>
            <p className="text-xs text-slate-200 font-medium">{venta.hora}</p>
          </div>
        </div>

        {/* Productos */}
        <div>
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Productos</p>
          <div className="bg-slate-800 rounded-xl overflow-hidden">
            {venta.items.map((it, i) => (
              <div key={i} className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-700 last:border-0">
                <div>
                  <p className="text-xs text-slate-200 font-medium">{it.producto}</p>
                  <p className="text-[10px] text-slate-500">x{it.qty} uds · ${it.precio.toFixed(2)} c/u</p>
                </div>
                <span className="text-xs font-bold text-white">${(it.precio * it.qty).toFixed(2)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between px-3.5 py-3 bg-slate-700/40">
              <span className="text-xs font-semibold text-slate-400">Total</span>
              <span className="text-base font-bold text-white">${venta.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div className="px-5 py-4 border-t border-slate-800 space-y-2 flex-shrink-0">
        <button onClick={onFactura}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium transition-colors">
          <IconPrint /> Ver factura / Imprimir
        </button>
        {venta.estado === 'Completada' && (
          <>
            <button onClick={onAnular}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 border border-red-600/40 text-red-400 text-xs font-medium transition-colors">
              <IconBan /> Anular venta
            </button>
            <button onClick={onReembolso}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 border border-amber-600/40 text-amber-400 text-xs font-medium transition-colors">
              <IconRefund /> Procesar reembolso
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────
export default function VentasPage() {
  const { ventas, productos, agregarVenta, actualizarEstadoVenta, metricas, cargando } = useData()
  const [search, setSearch]           = useState('')
  const [filtro, setFiltro]           = useState('Todos')
  const [showNueva, setShowNueva]     = useState(false)
  const [selectedId, setSelectedId]   = useState(null)
  const [confirm, setConfirm]         = useState(null)
  const [showFactura, setShowFactura] = useState(false)
  const { toast, showToast }          = useToast()

  const filtered = ventas.filter(v =>
    (v.cliente.toLowerCase().includes(search.toLowerCase()) || v.id.includes(search)) &&
    (filtro === 'Todos' || v.estado === filtro)
  )

  const ventaSeleccionada = ventas.find(v => v.id === selectedId) || null

  const handleNueva = async (data) => {
    const newId = await agregarVenta(data)
    setShowNueva(false)
    setSelectedId(newId)
    showToast(`Venta #${newId} registrada con éxito`)
  }

  const handleAnular = () => setConfirm({
    title: 'Anular venta', variant: 'danger', confirmLabel: 'Anular venta',
    message: `¿Anular la venta #${selectedId} de ${ventaSeleccionada?.cliente}? Esta acción no se puede deshacer.`,
    onConfirm: async () => {
      await actualizarEstadoVenta(selectedId, 'Anulada')
      setConfirm(null)
      showToast(`Venta #${selectedId} anulada correctamente`)
    },
  })

  const handleReembolso = () => setConfirm({
    title: 'Procesar reembolso', variant: 'warning', confirmLabel: 'Confirmar reembolso',
    message: `¿Confirmas el reembolso de $${ventaSeleccionada?.total.toFixed(2)} a ${ventaSeleccionada?.cliente}?`,
    onConfirm: async () => {
      await actualizarEstadoVenta(selectedId, 'Reembolso')
      setConfirm(null)
      showToast(`Reembolso de $${ventaSeleccionada?.total.toFixed(2)} procesado con éxito`)
    },
  })

  const { totalIngresos, totalAnuladas, totalReembolsos } = metricas

  if (cargando) return (
    <AppLayout>
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin w-8 h-8 text-indigo-400" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity=".25"/>
            <path fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" opacity=".75"/>
          </svg>
          <p className="text-slate-500 text-sm">Cargando ventas...</p>
        </div>
      </div>
    </AppLayout>
  )

  return (
    <AppLayout>
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-white">Ventas</h1>
          <p className="text-xs text-slate-500 mt-0.5">{ventas.length} transacciones registradas</p>
        </div>
        <button onClick={() => setShowNueva(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors shadow-lg shadow-indigo-500/20">
          <IconPlus /> Nueva venta
        </button>
      </header>

      {/* Stats */}
      <div className="px-6 pt-4 pb-2 grid grid-cols-3 gap-4 flex-shrink-0">
        {[
          { val: `$${totalIngresos.toLocaleString('es-CO')}`, label: 'Ingresos totales',  color: 'text-indigo-400' },
          { val: totalAnuladas,                               label: 'Ventas anuladas',    color: 'text-red-400'   },
          { val: `$${totalReembolsos.toFixed(2)}`,           label: 'Total reembolsado',  color: 'text-amber-400' },
        ].map((s, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
            <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="px-6 py-3 flex items-center gap-3 border-b border-slate-800 flex-shrink-0">
        <div className="relative flex-1 max-w-xs">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"><IconSearch /></div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente o # venta..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-100 placeholder-slate-600 outline-none focus:ring-2 focus:ring-indigo-500 transition" />
        </div>
        <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
          {['Todos', 'Completada', 'Anulada', 'Reembolso'].map(s => (
            <button key={s} onClick={() => setFiltro(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filtro === s ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla + Panel lateral */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-auto px-6 py-4 min-w-0">
          {filtered.length === 0
            ? <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4 text-slate-600"><IconCart /></div>
                <p className="text-slate-500 font-medium">No se encontraron ventas</p>
                <p className="text-slate-600 text-sm mt-1">Registra tu primera venta con el botón "Nueva venta"</p>
              </div>
            : <div className="rounded-2xl border border-slate-800 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-800">
                      {['# Venta', 'Cliente', 'Vendedor', 'Fecha', 'Total', 'Estado', 'Detalle'].map(h => (
                        <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filtered.map(v => (
                      <tr key={v.id}
                        onClick={() => setSelectedId(v.id === selectedId ? null : v.id)}
                        className={`transition-colors cursor-pointer ${v.id === selectedId ? 'bg-indigo-950/40 border-l-2 border-indigo-500' : 'hover:bg-slate-900/60'}`}>
                        <td className="px-5 py-3.5 text-sm font-mono text-indigo-400">#{v.id}</td>
                        <td className="px-5 py-3.5 text-sm text-slate-200 font-medium">{v.cliente}</td>
                        {/* Columna vendedor */}
                        <td className="px-5 py-3.5">
                          {v.vendedor_nombre
                            ? <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-purple-700 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                                  {v.vendedor_nombre.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                                </div>
                                <span className="text-xs text-slate-300 truncate max-w-[90px]">{v.vendedor_nombre}</span>
                              </div>
                            : <span className="text-xs text-slate-600">—</span>
                          }
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-500">{v.fecha} {v.hora}</td>
                        <td className="px-5 py-3.5 text-sm font-bold text-white">${v.total.toFixed(2)}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_PILL[v.estado]}`}>{v.estado}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            onClick={e => { e.stopPropagation(); setSelectedId(v.id === selectedId ? null : v.id) }}
                            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${v.id === selectedId ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-indigo-400 hover:bg-indigo-400/10'}`}>
                            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
                            </svg>
                            {v.id === selectedId ? 'Abierto' : 'Ver detalle'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>}
        </div>

        {ventaSeleccionada && (
          <DetailPanel
            venta={ventaSeleccionada}
            onClose={() => setSelectedId(null)}
            onAnular={handleAnular}
            onReembolso={handleReembolso}
            onFactura={() => setShowFactura(true)}
          />
        )}
      </div>

      {/* Modals */}
      {showNueva   && <NuevaVentaModal productos={productos} onSave={handleNueva} onClose={() => setShowNueva(false)} />}
      {showFactura && ventaSeleccionada && <FacturaModal venta={ventaSeleccionada} onClose={() => setShowFactura(false)} />}
      {confirm     && <ConfirmModal data={confirm} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}
      <Toast toast={toast} />
    </AppLayout>
  )
}
