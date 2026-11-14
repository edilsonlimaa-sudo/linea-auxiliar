-- R106: la app nativa del chofer anota sus errores con interfaz 'app'; una interfaz desconocida se ignora
begin;
create extension if not exists pgtap with schema extensions;
select plan(2);

set local role anon;
select public.registrar_error('app', 'otro', '/viajes', 'Error: prueba de la app nativa');
select public.registrar_error('otra', 'otro', '/viajes', 'Error: interfaz desconocida');
reset role;

select is((select count(*)::int from public.errores_app where mensaje = 'Error: prueba de la app nativa' and interfaz = 'app'), 1, 'La app nativa anota con interfaz app');
select is((select count(*)::int from public.errores_app where mensaje = 'Error: interfaz desconocida'), 0, 'Una interfaz desconocida no se anota');

select * from finish();
rollback;
