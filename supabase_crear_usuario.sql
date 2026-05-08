-- ================================================================
-- Ejecuta este script en SQL Editor de Supabase
-- DESPUÉS del script supabase_schema.sql
-- ================================================================

-- Función segura para crear usuarios desde el frontend
-- (evita exponer la service_role key en el cliente)
create or replace function public.crear_usuario(
  p_email    text,
  p_password text,
  p_nombre   text,
  p_rol      text,
  p_estado   text default 'Activo'
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  -- Solo administradores pueden crear usuarios
  if not exists (
    select 1 from public.usuarios
    where email = (select email from auth.users where id = auth.uid())
    and rol = 'Administrador'
  ) then
    raise exception 'Solo los administradores pueden crear usuarios';
  end if;

  -- Crear en auth.users
  v_user_id := (
    select id from auth.users
    where email = p_email
    limit 1
  );

  if v_user_id is not null then
    raise exception 'El correo ya está registrado en el sistema';
  end if;

  -- Insertar en la tabla usuarios
  -- (Supabase Auth se maneja vía invite o Admin API)
  insert into public.usuarios (nombre, email, rol, estado)
  values (p_nombre, p_email, p_rol, p_estado);

  return json_build_object('success', true, 'email', p_email);
end;
$$;

-- Permitir que usuarios autenticados llamen esta función
grant execute on function public.crear_usuario to authenticated;
