-- ================================================================
-- Ejecuta este script en SQL Editor de Supabase
-- Reemplaza el script supabase_crear_usuario.sql anterior
-- ================================================================

-- Función que crea un usuario en auth.users usando privilegios elevados
-- Solo puede ser llamada por usuarios autenticados con rol Administrador
create or replace function public.registrar_usuario(
  p_email    text,
  p_password text,
  p_nombre   text,
  p_rol      text,
  p_estado   text default 'Activo'
)
returns json
language plpgsql
security definer                    -- corre con privilegios del owner (postgres)
set search_path = extensions, public, auth
as $$
declare
  v_user_id   uuid;
  v_caller_id uuid := auth.uid();
  v_caller_rol text;
begin
  -- 1. Verificar que el que llama es Administrador
  select rol into v_caller_rol
  from public.usuarios
  where id = v_caller_id;

  if v_caller_rol is distinct from 'Administrador' then
    raise exception 'Solo los administradores pueden crear usuarios'
      using errcode = 'insufficient_privilege';
  end if;

  -- 2. Verificar que el email no exista ya
  if exists (select 1 from auth.users where email = p_email) then
    raise exception 'El correo % ya está registrado', p_email
      using errcode = 'unique_violation';
  end if;

  -- 3. Crear el usuario en auth.users con email ya confirmado
  v_user_id := extensions.uuid_generate_v4();

  insert into auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    role,
    aud,
    created_at,
    updated_at
  ) values (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    p_email,
    crypt(p_password, gen_salt('bf')),   -- bcrypt hash de la contraseña
    now(),                                -- confirmar email automáticamente
    jsonb_build_object('nombre', p_nombre, 'rol', p_rol),
    'authenticated',
    'authenticated',
    now(),
    now()
  );

  -- 4. Insertar en la tabla pública usuarios
  insert into public.usuarios (id, nombre, email, rol, estado)
  values (v_user_id, p_nombre, p_email, p_rol, p_estado);

  return jsonb_build_object(
    'id',      v_user_id,
    'email',   p_email,
    'nombre',  p_nombre,
    'rol',     p_rol,
    'success', true
  );

exception
  when insufficient_privilege then
    raise;
  when unique_violation then
    raise;
  when others then
    raise exception 'Error al crear usuario: %', sqlerrm;
end;
$$;

-- Permitir que usuarios autenticados ejecuten esta función
grant execute on function public.registrar_usuario to authenticated;

-- ── Función para eliminar usuario ──────────────────────────────────────
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

  -- Eliminar de auth.users (cascade elimina identities y sessions)
  delete from auth.users where id = p_user_id;

  -- Eliminar de tabla pública (aunque el trigger lo haría)
  delete from public.usuarios where id = p_user_id;

  return jsonb_build_object('success', true, 'id', p_user_id);
end;
$$;

grant execute on function public.eliminar_usuario to authenticated;

-- ── Función para actualizar contraseña ─────────────────────────────────
create or replace function public.actualizar_password_usuario(
  p_user_id uuid,
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
