import { AppLayout } from '../components/UI'
import { useData } from '../context/DataContext'
import { IconTrend } from '../components/Icons'

// ── Sparkline ─────────────────────────────────────────────────────────
function Sparkline({ color, data }) {
  if (!data || data.length < 2) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const w = 80, h = 32
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = max === min ? h / 2 : h - ((v - min) / (max - min)) * (h - 4) - 2
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Gráfico de barras (ventas por día) ────────────────────────────────
function BarChart({ data }) {
  if (!data || data.length === 0) return (
    <div className="flex items-center justify-center h-32 text-slate-600 text-sm">Sin datos esta semana</div>
  )
  const max = Math.max(...data.map(d => d.value), 1) // mínimo 1 para evitar NaN

  return (
    <div className="flex items-end gap-2 h-32 w-full">
      {data.map((d, i) => {
        const isToday = i === data.length - 1
        const pct = Math.round((d.value / max) * 100)
        return (
          <div key={i} className="flex flex-col items-center flex-1 gap-1 group relative">
            {/* Tooltip */}
            {d.value > 0 && (
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-primary-700 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                ${d.value.toLocaleString('es-CO')}
              </div>
            )}
            <div
              className="w-full rounded-t-md transition-all duration-700"
              style={{
                height: pct > 0 ? `${Math.max(pct, 4)}%` : '4%',
                background: isToday
                  ? 'linear-gradient(180deg,#16734D,#1e9a62)'
                  : d.value > 0 ? '#0d452f' : '#082e1f',
                opacity: d.value === 0 ? 0.3 : 1,
              }}
            />
            <span className={`text-xs ${isToday ? 'text-primary-400 font-semibold' : 'text-slate-500'}`}>
              {d.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── STATUS colors ─────────────────────────────────────────────────────
const STATUS_COLOR = {
  Completada: 'text-emerald-400 bg-emerald-400/10',
  Anulada:    'text-red-400 bg-red-400/10',
  Reembolso:  'text-amber-400 bg-amber-400/10',
}

// ── Página Dashboard ──────────────────────────────────────────────────
export default function DashboardPage() {
  const { metricas, ventas } = useData()
  const {
    totalIngresos, totalVentas, totalAnuladas, totalReembolsos,
    stockTotal, topProductos, ventasPorDia, ventasRecientes,
  } = metricas

  // Sparklines: los últimos 7 valores de ventas por día
  const sparkIngresos = ventasPorDia.map(d => d.value)
  const sparkVentas   = ventasPorDia.map(d => d.cantidad)

  // Máx. para las barras de top productos
  const maxTopVentas = Math.max(...topProductos.map(p => p.vendidos), 1)

  const statsCards = [
    {
      label:     'Ingresos totales',
      value:     `$${totalIngresos.toLocaleString('es-CO')}`,
      color:     '#16734D',
      bg:        '#082e1f',
      sparkData: sparkIngresos,
      icon: 'M1 4h22c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H1c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM1 10h22',
      change: totalVentas > 0 ? `${totalVentas} ventas` : 'Sin ventas aún',
      up: true,
    },
    {
      label:     'Ventas completadas',
      value:     totalVentas,
      color:     '#10b981',
      bg:        '#064e3b',
      sparkData: sparkVentas,
      icon: 'M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0',
      change: `${totalAnuladas} anuladas`,
      up: totalAnuladas === 0,
    },
    {
      label:     'Stock total',
      value:     stockTotal.toLocaleString('es-CO'),
      color:     '#f59e0b',
      bg:        '#451a03',
      sparkData: [stockTotal],
      icon: 'M21 16V8a2 2 0 0 0-1-1.73L13 2.27a2 2 0 0 0-2 0L4 6.27A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z',
      change: 'unidades en inventario',
      up: true,
    },
    {
      label:     'Total reembolsado',
      value:     `$${totalReembolsos.toFixed(2)}`,
      color:     '#ef4444',
      bg:        '#450a0a',
      sparkData: sparkIngresos.map(v => v * 0.1),
      icon: 'M1 4v6h6M3.51 15a9 9 0 1 0 .49-4',
      change: `${ventas.filter(v => v.estado === 'Reembolso').length} reembolsos`,
      up: false,
    },
  ]

  return (
    <AppLayout>
      {/* Header */}
      <header className="sticky top-0 z-10 bg-secondary-950/80 backdrop-blur border-b border-primary-800 px-8 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <p className="text-xs text-slate-500">Resumen en tiempo real del sistema</p>
        </div>
        <span className="text-xs text-slate-500 bg-primary-800 px-3 py-1.5 rounded-full">
          {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </span>
      </header>

      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-4 gap-4">
          {statsCards.map((s, i) => (
            <div key={i} className="rounded-2xl border border-primary-800 bg-primary-900 p-5 flex flex-col gap-3 hover:border-primary-700 transition-colors">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: s.bg, color: s.color }}>
                  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={s.icon} />
                  </svg>
                </div>
                {s.sparkData.length > 1
                  ? <Sparkline color={s.color} data={s.sparkData} />
                  : <div className="w-20" />}
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
              </div>
              <div className={`flex items-center gap-1 text-xs font-medium ${s.up ? 'text-emerald-400' : 'text-red-400'}`}>
                <IconTrend up={s.up} />
                {s.change}
              </div>
            </div>
          ))}
        </div>

        {/* ── Gráficas ── */}
        <div className="grid grid-cols-3 gap-4">

          {/* Barras: ventas últimos 7 días */}
          <div className="col-span-2 rounded-2xl border border-primary-800 bg-primary-900 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-semibold text-white">Ventas esta semana</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ingresos diarios de los últimos 7 días · hover para ver el total
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-primary-400 bg-primary-400/10 px-3 py-1 rounded-full font-medium">
                  Hoy: ${(ventasPorDia[ventasPorDia.length - 1]?.value || 0).toLocaleString('es-CO')}
                </span>
              </div>
            </div>
            <BarChart data={ventasPorDia} />
            {/* Leyenda */}
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ background: 'linear-gradient(180deg,#16734D,#1e9a62)' }} />
                <span className="text-[10px] text-slate-500">Hoy</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-primary-600" />
                <span className="text-[10px] text-slate-500">Días anteriores</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-primary-800 opacity-30" />
                <span className="text-[10px] text-slate-500">Sin ventas</span>
              </div>
            </div>
          </div>

          {/* Top productos */}
          <div className="rounded-2xl border border-primary-800 bg-primary-900 p-6">
            <h2 className="font-semibold text-white mb-1">Top productos</h2>
            <p className="text-xs text-slate-500 mb-5">Más vendidos (ventas completadas)</p>
            {topProductos.length === 0
              ? <p className="text-slate-600 text-sm text-center py-6">Sin datos aún</p>
              : <div className="space-y-4">
                  {topProductos.map((p, i) => {
                    const pct = Math.round((p.vendidos / maxTopVentas) * 100)
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-slate-300 truncate">{p.nombre}</span>
                          <span className="text-xs text-slate-500 ml-2 flex-shrink-0">{p.vendidos} uds</span>
                        </div>
                        <div className="h-1.5 bg-primary-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-primary-500 transition-all duration-700"
                            style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>}
          </div>
        </div>

        {/* ── Ventas recientes ── */}
        <div className="rounded-2xl border border-primary-800 bg-primary-900 overflow-hidden">
          <div className="px-6 py-4 border-b border-primary-800 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-white">Ventas recientes</h2>
              <p className="text-xs text-slate-500 mt-0.5">Últimas 5 transacciones del sistema</p>
            </div>
            <span className="text-xs text-slate-500">{ventas.length} total</span>
          </div>

          {ventasRecientes.length === 0
            ? <div className="text-center py-12 text-slate-600 text-sm">No hay ventas registradas aún</div>
            : <table className="w-full">
                <thead>
                  <tr className="border-b border-primary-800 bg-primary-800/50">
                    {['# Venta', 'Cliente', 'Fecha', 'Productos', 'Total', 'Estado'].map(h => (
                      <th key={h} className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {ventasRecientes.map((v, i) => (
                    <tr key={i} className="hover:bg-primary-800/40 transition-colors">
                      <td className="px-6 py-4 text-sm font-mono text-primary-400">#{v.id}</td>
                      <td className="px-6 py-4 text-sm text-slate-200 font-medium">{v.cliente}</td>
                      <td className="px-6 py-4 text-xs text-slate-500">{v.fecha} {v.hora}</td>
                      <td className="px-6 py-4 text-xs text-slate-400">{v.items.length} ítem{v.items.length > 1 ? 's' : ''}</td>
                      <td className="px-6 py-4 text-sm font-bold text-white">${v.total.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[v.estado]}`}>
                          {v.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>}
        </div>

      </div>
    </AppLayout>
  )
}
