-- R88: una novedad puede ser "de bienvenida": cada pasajero que el admin pasa a la interfaz nueva la recibe en ese
-- momento (antes, quien entraba después no recibía las anteriores y había que mandársela a mano). Solo una a la vez.
-- Sin aviso al celular: quien recién pasa todavía no lo activó (se activa en la pestaña Notificaciones de la nueva).

alter table public.notificaciones add column de_bienvenida boolean not null default false;
create unique index notificaciones_una_de_bienvenida on public.notificaciones (de_bienvenida) where de_bienvenida;

-- La que el admin mandó el 29/10 a los primeros de la nueva ("¡Eres de los primeros en probar la nueva interfaz!").
-- Solo existe en la nube; en la base local no hace nada
update public.notificaciones set de_bienvenida = true where id = 'ce181606-d7e2-4e2c-90f1-26f005340392';

-- R83 + R88: al pasar pasajeros aprobados a la nueva, reciben la de bienvenida (si hay una sin retirar)
create or replace function public.admin_cambiar_interfaz(p_ids uuid[], p_interfaz text)
returns int language plpgsql security definer set search_path = '' as $$
declare v_n int;
begin
  if not public.es_admin() then raise exception 'Solo el administrador cambia la interfaz'; end if;
  if p_interfaz is null or p_interfaz not in ('clasica', 'nueva') then raise exception 'Interfaz desconocida'; end if;
  update public.perfiles set interfaz = p_interfaz
   where id = any (coalesce(p_ids, '{}')) and rol in ('pasajero', 'chofer') and interfaz <> p_interfaz;
  get diagnostics v_n = row_count;
  if p_interfaz = 'nueva' then
    insert into public.notificacion_destinos (notificacion_id, persona_id)
    select n.id, p.id
      from public.notificaciones n, public.perfiles p
     where n.de_bienvenida and n.retirada_en is null
       and p.id = any (coalesce(p_ids, '{}')) and p.rol = 'pasajero' and p.estado = 'aprobado' and p.interfaz = 'nueva'
    on conflict do nothing;
  end if;
  return v_n;
end;
$$;
