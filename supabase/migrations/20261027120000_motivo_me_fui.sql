-- R62: al tocar "Me fui", por qué se va (sobre todo: se fue en la van, el transporte autorizado que no usa el app).
-- Va en lista_gina_privado: lo ven el admin y los choferes, no los demás pasajeros.

alter table public.lista_gina_privado
  add column motivo_salida text check (motivo_salida in ('van', 'otro_carro', 'cansado', 'cambio_planes', 'otra'));

drop function public.me_fui();
create function public.me_fui(p_motivo text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if p_motivo is not null and p_motivo not in ('van', 'otro_carro', 'cansado', 'cambio_planes', 'otra') then
    raise exception 'Motivo no válido';
  end if;
  update public.lista_gina set estado = 'se_fue', cerrada_en = now()
   where pasajero_id = auth.uid() and estado = 'esperando'
  returning id into v_id;
  if v_id is null then raise exception 'Ya no estás en la lista'; end if;
  insert into public.lista_gina_privado (id, motivo_salida) values (v_id, p_motivo)
  on conflict (id) do update set motivo_salida = excluded.motivo_salida;
end;
$$;

revoke execute on function public.me_fui(text) from anon, public;
grant execute on function public.me_fui(text) to authenticated;
