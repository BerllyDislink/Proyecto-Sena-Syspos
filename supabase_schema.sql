-- ================================================================
-- SysPOS — Schema de base de datos para Supabase (PostgreSQL)
-- Ejecutar completo en SQL Editor de Supabase
-- ================================================================

-- ── Extensiones ────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";   -- necesario para crypt() y gen_salt()

-- ── Tabla: usuarios ────────────────────────────────────────────────
create table if not exists public.usuarios (
  id          uuid primary key default uuid_generate_v4(),
  nombre      text not null,
  email       text not null unique,
  rol         text not null check (rol in ('Administrador', 'Vendedor', 'Cajero', 'Supervisor')),
  estado      text not null default 'Activo' check (estado in ('Activo', 'Inactivo')),
  created_at  timestamptz not null default now()
);

-- ── Tabla: productos ───────────────────────────────────────────────
create table if not exists public.productos (
  id          uuid primary key default uuid_generate_v4(),
  nombre      text not null,
  categoria   text not null,
  precio      numeric(12, 2) not null check (precio >= 0),
  stock       integer not null default 0 check (stock >= 0),
  descripcion text,
  created_at  timestamptz not null default now()
);

-- ── Tabla: ventas ──────────────────────────────────────────────────
create table if not exists public.ventas (
  id          uuid primary key default uuid_generate_v4(),
  numero      text not null unique,           -- '#00128'
  cliente     text not null,
  tel         text,
  email       text,
  estado      text not null default 'Completada'
              check (estado in ('Completada', 'Anulada', 'Reembolso')),
  total       numeric(12, 2) not null check (total >= 0),
  created_at  timestamptz not null default now()
);

-- ── Tabla: venta_items ─────────────────────────────────────────────
create table if not exists public.venta_items (
  id          uuid primary key default uuid_generate_v4(),
  venta_id    uuid not null references public.ventas(id) on delete cascade,
  producto    text not null,
  qty         integer not null check (qty > 0),
  precio      numeric(12, 2) not null check (precio >= 0),
  subtotal    numeric(12, 2) generated always as (qty * precio) stored
);

-- ── Índices para búsquedas rápidas ────────────────────────────────
create index if not exists idx_ventas_created_at on public.ventas(created_at desc);
create index if not exists idx_ventas_estado on public.ventas(estado);
create index if not exists idx_ventas_numero on public.ventas(numero);
create index if not exists idx_venta_items_venta_id on public.venta_items(venta_id);

-- ── Row Level Security (RLS) ───────────────────────────────────────
-- Habilitar RLS en todas las tablas
alter table public.usuarios     enable row level security;
alter table public.productos    enable row level security;
alter table public.ventas       enable row level security;
alter table public.venta_items  enable row level security;

-- Por ahora: acceso completo para usuarios autenticados
-- (puedes afinar permisos por rol más adelante)
create policy "Acceso total para autenticados" on public.usuarios
  for all using (auth.role() = 'authenticated');

create policy "Acceso total para autenticados" on public.productos
  for all using (auth.role() = 'authenticated');

create policy "Acceso total para autenticados" on public.ventas
  for all using (auth.role() = 'authenticated');

create policy "Acceso total para autenticados" on public.venta_items
  for all using (auth.role() = 'authenticated');

-- ── Datos iniciales ────────────────────────────────────────────────
insert into public.usuarios (nombre, email, rol, estado) values
  ('Carlos Administrador', 'admin@syspos.com',  'Administrador', 'Activo'),
  ('María García',         'maria@syspos.com',  'Vendedor',      'Activo'),
  ('Luis Martínez',        'luis@syspos.com',   'Cajero',        'Activo'),
  ('Ana Torres',           'ana@syspos.com',    'Supervisor',    'Activo'),
  ('Pedro Gómez',          'pedro@syspos.com',  'Vendedor',      'Inactivo'),
  ('Laura Sánchez',        'laura@syspos.com',  'Cajero',        'Activo')
on conflict (email) do nothing;

insert into public.productos (nombre, categoria, precio, stock, descripcion) values
  ('Laptop HP 14',     'Electrónica',    850.00, 12, 'Laptop Intel Core i5, 8GB RAM, 256GB SSD'),
  ('Mouse Logitech',   'Accesorios',      25.00, 45, 'Mouse inalámbrico ergonómico'),
  ('Teclado Mecánico', 'Periféricos',     70.00, 18, 'Teclado mecánico retroiluminado'),
  ('Monitor 24"',      'Electrónica',    320.00,  8, 'Monitor Full HD IPS 75Hz'),
  ('Audífonos Sony',   'Audio',           45.00, 30, 'Audífonos over-ear con cancelación de ruido'),
  ('USB-C Hub 7en1',   'Accesorios',      35.00, 22, 'Hub con HDMI, USB 3.0, SD card reader'),
  ('SSD 1TB',          'Almacenamiento',  90.00, 15, 'SSD externo USB 3.2 Gen2')
on conflict do nothing;
