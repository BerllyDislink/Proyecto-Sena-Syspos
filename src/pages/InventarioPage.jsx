import { useState } from 'react'
import { AppLayout, Toast, ConfirmModal, useToast } from '../components/UI'
import { useData } from '../context/DataContext'
import { IconPlus, IconSearch, IconEdit, IconTrash, IconX, IconEye, IconEyeOff } from '../components/Icons'

const CAT_COLOR = {
  'Electrónica':    'text-primary-300 bg-primary-900/60',
  'Accesorios':     'text-emerald-300 bg-emerald-900/60',
  'Periféricos':    'text-sky-300 bg-sky-900/60',
  'Audio':          'text-purple-300 bg-purple-900/60',
  'Almacenamiento': 'text-amber-300 bg-amber-900/60',
  'Otro':           'text-slate-300 bg-primary-700',
}
const stockBadge = (n) => n === 0 ? 'text-red-400 bg-red-900/60' : n <= 10 ? 'text-amber-400 bg-amber-900/60' : 'text-emerald-400 bg-emerald-900/60'

const CATEGORIAS = ['Electrónica', 'Accesorios', 'Periféricos', 'Audio', 'Almacenamiento', 'Otro']

function ProductModal({ mode, product, onSave, onClose }) {
  const [form, setForm] = useState(
    product ? { ...product } : { nombre: '', categoria: '', precio: '', stock: '', descripcion: '' }
  )
  const [errors, setErrors] = useState({})

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: null })) }

  const validate = () => {
    const e = {}
    if (!form.nombre.trim())                            e.nombre    = 'El nombre es requerido'
    if (!form.categoria)                                e.categoria = 'Selecciona una categoría'
    if (!form.precio || isNaN(form.precio) || +form.precio <= 0) e.precio = 'Precio inválido'
    if (!form.stock  || isNaN(form.stock)  || +form.stock  < 0)  e.stock  = 'Stock inválido'
    return e
  }

  const handleSave = () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    onSave({ ...form, precio: Number(form.precio), stock: Number(form.stock) })
  }

  const inp = (k) => `w-full bg-primary-900 border rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:ring-2 focus:ring-primary-500 transition ${errors[k] ? 'border-red-500' : 'border-primary-700'}`

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-primary-800 border border-primary-700 rounded-2xl shadow-2xl w-full max-w-md mx-4 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-primary-700 flex-shrink-0">
          <h2 className="font-semibold text-white text-base">{mode === 'add' ? 'Añadir nuevo producto' : 'Editar producto'}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors"><IconX /></button>
        </div>
        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Nombre del producto</label>
            <input value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ej: Laptop HP 14" className={inp('nombre')} />
            {errors.nombre && <p className="text-red-400 text-xs mt-1">{errors.nombre}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Categoría</label>
            <select value={form.categoria} onChange={e => set('categoria', e.target.value)} className={inp('categoria')}>
              <option value="">Seleccionar categoría</option>
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {errors.categoria && <p className="text-red-400 text-xs mt-1">{errors.categoria}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Precio ($)</label>
              <input type="number" value={form.precio} onChange={e => set('precio', e.target.value)} placeholder="0.00" className={inp('precio')} />
              {errors.precio && <p className="text-red-400 text-xs mt-1">{errors.precio}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Stock (unidades)</label>
              <input type="number" value={form.stock} onChange={e => set('stock', e.target.value)} placeholder="0" className={inp('stock')} />
              {errors.stock && <p className="text-red-400 text-xs mt-1">{errors.stock}</p>}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Descripción</label>
            <textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)} rows={3}
              placeholder="Descripción del producto (opcional)"
              className="w-full bg-primary-900 border border-primary-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:ring-2 focus:ring-primary-500 transition resize-none" />
          </div>
        </div>
        <div className="px-6 pb-5 pt-2 flex gap-3 flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-primary-600 text-slate-300 text-sm font-medium hover:bg-primary-700 transition-colors">Cancelar</button>
          <button onClick={handleSave} className="flex-1 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium transition-colors">
            {mode === 'add' ? 'Guardar producto' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function InventarioPage() {
  const { productos, agregarProducto, editarProducto, eliminarProducto, eliminarProductos } = useData()
  const [search, setSearch]       = useState('')
  const [selected, setSelected]   = useState([])
  const [modal, setModal]         = useState(null)
  const [prodModal, setProdModal] = useState(null)
  const { toast, showToast }      = useToast()

  const filtered = productos.filter(p =>
    p.nombre.toLowerCase().includes(search.toLowerCase()) ||
    p.categoria.toLowerCase().includes(search.toLowerCase())
  )

  const toggleSel = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  const toggleAll = () => setSelected(selected.length === filtered.length ? [] : filtered.map(p => p.id))

  const askDeleteOne = (p) => setModal({
    title: 'Eliminar producto', variant: 'danger',
    message: `¿Deseas eliminar "${p.nombre}"? Esta acción no se puede deshacer.`,
    confirmLabel: 'Eliminar',
    onConfirm: () => { eliminarProducto(p.id); setSelected(s => s.filter(x => x !== p.id)); setModal(null); showToast(`"${p.nombre}" eliminado con éxito`) },
  })

  const askDeleteSelected = () => {
    const n = selected.length
    setModal({
      title: `Eliminar ${n} producto${n > 1 ? 's' : ''}`, variant: 'danger', confirmLabel: 'Eliminar',
      message: `¿Eliminar ${n} producto${n > 1 ? 's seleccionados' : ' seleccionado'}? Esta acción no se puede deshacer.`,
      onConfirm: () => { eliminarProductos(selected); setSelected([]); setModal(null); showToast(`${n} producto${n > 1 ? 's eliminados' : ' eliminado'} con éxito`) },
    })
  }

  const handleSave = (data) => {
    if (prodModal.mode === 'add') {
      agregarProducto({ ...data, precio: Number(data.precio), stock: Number(data.stock) })
      showToast(`"${data.nombre}" agregado con éxito`)
    } else {
      editarProducto(prodModal.product.id, { ...data, precio: Number(data.precio), stock: Number(data.stock) })
      showToast(`"${data.nombre}" actualizado con éxito`)
    }
    setProdModal(null)
  }

  return (
    <AppLayout>
      <header className="border-b border-primary-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-white">Inventario</h1>
          <p className="text-xs text-slate-500 mt-0.5">{productos.length} productos registrados</p>
        </div>
        <button onClick={() => setProdModal({ mode: 'add', product: null })}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors shadow-lg shadow-primary-500/20">
          <IconPlus /> Añadir producto
        </button>
      </header>

      <div className="px-6 py-3 flex items-center gap-3 border-b border-primary-800 flex-shrink-0">
        <div className="relative flex-1 max-w-sm">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"><IconSearch /></div>
          <input value={search} onChange={e => { setSearch(e.target.value); setSelected([]) }} placeholder="Buscar producto o categoría..."
            className="w-full bg-primary-900 border border-primary-700 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-100 placeholder-slate-600 outline-none focus:ring-2 focus:ring-primary-500 transition" />
        </div>
        {selected.length > 0 && (
          <button onClick={askDeleteSelected}
            className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/30 border border-red-600/50 text-red-400 text-sm font-medium px-3 py-2 rounded-lg transition-colors">
            <IconTrash /> Eliminar ({selected.length})
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        <div className="rounded-2xl border border-primary-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-primary-900 border-b border-primary-800">
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={filtered.length > 0 && selected.length === filtered.length} onChange={toggleAll} className="accent-primary-500 w-4 h-4 cursor-pointer" />
                </th>
                {['Producto','Categoría','Precio','Stock','Descripción','Acciones'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.length === 0
                ? <tr><td colSpan={7} className="text-center py-16 text-slate-600 text-sm">No se encontraron productos</td></tr>
                : filtered.map(p => (
                  <tr key={p.id} className={`transition-colors ${selected.includes(p.id) ? 'bg-primary-950/30' : 'hover:bg-primary-900/60'}`}>
                    <td className="px-4 py-3"><input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggleSel(p.id)} className="accent-primary-500 w-4 h-4 cursor-pointer" /></td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-100">{p.nombre}</td>
                    <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${CAT_COLOR[p.categoria] || CAT_COLOR['Otro']}`}>{p.categoria}</span></td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-100">${p.precio.toFixed(2)}</td>
                    <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${stockBadge(p.stock)}`}>{p.stock} uds</span></td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate">{p.descripcion || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setProdModal({ mode: 'edit', product: p })} className="p-1.5 rounded-lg text-slate-500 hover:text-primary-400 hover:bg-primary-400/10 transition-colors"><IconEdit /></button>
                        <button onClick={() => askDeleteOne(p)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"><IconTrash /></button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {prodModal && <ProductModal mode={prodModal.mode} product={prodModal.product} onSave={handleSave} onClose={() => setProdModal(null)} />}
      {modal && <ConfirmModal data={modal} onConfirm={modal.onConfirm} onCancel={() => setModal(null)} />}
      <Toast toast={toast} />
    </AppLayout>
  )
}
