-- ================================================================
-- SCRIPT CORRECCIÓN FINAL — Ejecutar en SQL Editor de Supabase
-- ================================================================
-- El problema: insertar directo en auth.users NO crea auth.identities
-- → el usuario existe en la BD pero Supabase no puede autenticarlo.
--
-- La solución: el frontend usa signUp() que crea todo correctamente,
-- y solo necesitamos una RPC para actualizar contraseñas.
-- ================================================================

-- ── 1. Función para actualizar contraseña (sigue siendo necesaria) ────
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

-- ── 2. Función para eliminar usuario ─────────────────────────────────
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

  delete from auth.users     where id = p_user_id;
  delete from public.usuarios where id = p_user_id;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.eliminar_usuario to authenticated;

-- ── 3. IMPORTANTE: limpiar usuarios creados con el método incorrecto ─
-- Los usuarios que creaste desde el frontend con el código anterior
-- están en auth.users pero SIN auth.identities → no pueden entrar.
-- Este bloque los elimina para que los puedas recrear correctamente.

do $$
declare
  v_usuario record;
begin
  -- Busca usuarios en public.usuarios que NO tienen identities en Auth
  for v_usuario in
    select u.id, u.email, u.nombre
    from public.usuarios u
    where u.email <> 'admin@syspos.com'  -- no tocar el admin principal
    and not exists (
      select 1 from auth.identities i where i.user_id = u.id
    )
  loop
    raise notice 'Limpiando usuario sin identities: % (%)', v_usuario.nombre, v_usuario.email;
    delete from auth.users      where id = v_usuario.id;
    delete from public.usuarios where id = v_usuario.id;
  end loop;
end;
$$;

-- ── 4. Verificar estado final ─────────────────────────────────────────
select
  u.nombre,
  u.email,
  u.rol,
  case
    when i.user_id is not null then '✓ Puede iniciar sesión'
    else '✗ Sin identities — no puede iniciar sesión'
  end as estado_auth
from public.usuarios u
left join auth.identities i on i.user_id = u.id
order by u.rol, u.nombre;
