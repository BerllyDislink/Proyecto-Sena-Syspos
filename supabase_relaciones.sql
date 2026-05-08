-- ================================================================
-- SysPOS — Agregar relaciones entre tablas
-- Ejecutar en SQL Editor de Supabase
-- ================================================================

-- ── 1. Agregar vendedor_id a la tabla ventas ──────────────────────
alter table public.ventas
  add column if not exists vendedor_id uuid references public.usuarios(id) on delete set null;

-- Índice para búsquedas por vendedor
create index if not exists idx_ventas_vendedor on public.ventas(vendedor_id);

-- ── 2. Agregar producto_id a venta_items ──────────────────────────
alter table public.venta_items
  add column if not exists producto_id uuid references public.productos(id) on delete set null;

-- Índice para búsquedas por producto
create index if not exists idx_venta_items_producto on public.venta_items(producto_id);

-- ── 3. Verificar resultado ────────────────────────────────────────
select
  'ventas'      as tabla,
  column_name,
  data_type
from information_schema.columns
where table_schema = 'public'
  and table_name   = 'ventas'
  and column_name  = 'vendedor_id'

union all

select
  'venta_items' as tabla,
  column_name,
  data_type
from information_schema.columns
where table_schema = 'public'
  and table_name   = 'venta_items'
  and column_name  = 'producto_id';
