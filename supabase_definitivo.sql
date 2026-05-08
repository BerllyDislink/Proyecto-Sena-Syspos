-- ================================================================
-- SCRIPT DEFINITIVO — Ejecutar completo en SQL Editor de Supabase
-- Soluciona la vinculación entre auth.users y tabla usuarios
-- ================================================================

-- 1. Habilitar extensiones necesarias
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ── PASO CRÍTICO: Vincular el usuario admin de Auth con la tabla ──────
-- Busca el UUID real del usuario admin@syspos.com en auth.users
-- y actualiza (o inserta) el registro en la tabla usuarios con ese UUID.

do $$
declare
  v_auth_id uuid;
begin
  -- Obtener el UUID real del usuario en auth.users
  select id into v_auth_id
  from auth.users
  where email = 'admin@syspos.com'
  limit 1;

  if v_auth_id is null then
    raise notice 'Usuario admin@syspos.com NO encontrado en auth.users. Créalo primero en Authentication.';
  else
    -- Eliminar cualquier registro duplicado con otro UUID
    delete from public.usuarios where email = 'admin@syspos.com' and id <> v_auth_id;

    -- Insertar o actualizar con el UUID correcto de Auth
    insert into public.usuarios (id, nombre, email, rol, estado)
    values (v_auth_id, 'Carlos Administrador', 'admin@syspos.com', 'Administrador', 'Activo')
    on conflict (id)    do update set rol = 'Administrador', estado = 'Activo'
    ;

    -- También manejar el caso donde el conflicto es por email con diferente id
    insert into public.usuarios (id, nombre, email, rol, estado)
    values (v_auth_id, 'Carlos Administrador', 'admin@syspos.com', 'Administrador', 'Activo')
    on conflict (email) do update set id = v_auth_id, rol = 'Administrador', estado = 'Activo';

    raise notice 'Admin vinculado correctamente con UUID: %', v_auth_id;
  end if;
end;
$$;

-- ── Verificación: muestra el resultado ───────────────────────────────
select
  u.id,
  u.nombre,
  u.email,
  u.rol,
  u.estado,
  a.id as auth_id,
  case when u.id = a.id then '✓ Vinculado' else '✗ UUID diferente' end as estado_vinculo
from public.usuarios u
left join auth.users a on a.email = u.email
where u.email = 'admin@syspos.com';

-- ================================================================
-- FUNCIONES RPC PARA GESTIÓN DE USUARIOS (sin service_role en frontend)
-- ================================================================

-- ── Función: registrar_usuario ────────────────────────────────────────
create or replace function public.registrar_usuario(
  p_email    text,
  p_password text,
  p_nombre   text,
  p_rol      text,
  p_estado   text default 'Activo'
)
returns json
language plpgsql
security definer
set search_path = extensions, public, auth
as $$
declare
  v_new_id     uuid;
  v_caller_id  uuid := auth.uid();
  v_caller_rol text;
begin
  -- Verificar que quien llama es Administrador
  select rol into v_caller_rol
  from public.usuarios
  where id = v_caller_id;

  if v_caller_rol is distinct from 'Administrador' then
    raise exception 'Solo los administradores pueden crear usuarios'
      using errcode = 'insufficient_privilege';
  end if;

  -- Verificar que el email no exista
  if exists (select 1 from auth.users where email = p_email) then
    raise exception 'El correo % ya está registrado en el sistema', p_email
      using errcode = 'unique_violation';
  end if;

  -- Crear en auth.users
  v_new_id := extensions.uuid_generate_v4();

  insert into auth.users (
    id, instance_id, email, encrypted_password,
    email_confirmed_at, raw_user_meta_data, role, aud, created_at, updated_at
  ) values (
    v_new_id,
    '00000000-0000-0000-0000-000000000000',
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    jsonb_build_object('nombre', p_nombre, 'rol', p_rol),
    'authenticated',
    'authenticated',
    now(),
    now()
  );

  -- Insertar en tabla pública
  insert into public.usuarios (id, nombre, email, rol, estado)
  values (v_new_id, p_nombre, p_email, p_rol, p_estado);

  return jsonb_build_object(
    'id', v_new_id, 'email', p_email,
    'nombre', p_nombre, 'rol', p_rol, 'success', true
  );

exception
  when insufficient_privilege then raise;
  when unique_violation        then raise;
  when others then
    raise exception 'Error al crear usuario: %', sqlerrm;
end;
$$;

grant execute on function public.registrar_usuario to authenticated;

-- ── Función: eliminar_usuario ─────────────────────────────────────────
create or replace function public.eliminar_usuario(p_user_id uuid)
returns json
language plpgsql
security definer
set search_path = extensions, public, auth
as $$
declare
  v_caller_rol text;
begin
  select rol into v_caller_rol
  from public.usuarios
  where id = auth.uid();

  if v_caller_rol is distinct from 'Administrador' then
    raise exception 'Solo los administradores pueden eliminar usuarios'
      using errcode = 'insufficient_privilege';
  end if;

  delete from auth.users    where id = p_user_id;
  delete from public.usuarios where id = p_user_id;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.eliminar_usuario to authenticated;

-- ── Función: actualizar_password_usuario ──────────────────────────────
create or replace function public.actualizar_password_usuario(
  p_user_id  uuid,
  p_password text
)
returns json
language plpgsql
security definer
set search_path = extensions, public, auth
as $$
declare
  v_caller_rol text;
begin
  select rol into v_caller_rol
  from public.usuarios
  where id = auth.uid();

  if v_caller_rol is distinct from 'Administrador' then
    raise exception 'Solo los administradores pueden cambiar contraseñas'
      using errcode = 'insufficient_privilege';
  end if;

  update auth.users
  set encrypted_password = crypt(p_password, gen_salt('bf')),
      updated_at = now()
  where id = p_user_id;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.actualizar_password_usuario to authenticated;

-- ── Verificación final ────────────────────────────────────────────────
select 'Funciones creadas:' as info,
  count(*) as total
from pg_proc
where proname in ('registrar_usuario','eliminar_usuario','actualizar_password_usuario');
