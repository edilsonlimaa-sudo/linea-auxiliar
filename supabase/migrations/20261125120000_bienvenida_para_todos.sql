-- R88: para pasar a todos los pasajeros a la nueva (nov. 2026), una novedad de bienvenida nueva. La de los primeros
-- ("¡Eres de los primeros…", acceso anticipado) ya no sirve para todos; quien ya la tiene la conserva.
-- Se crea sin destinatarios: le llega a cada uno al pasarlo (admin_cambiar_interfaz).

update public.notificaciones set de_bienvenida = false where de_bienvenida;

insert into public.notificaciones (tipo, titulo, texto, autor_id, de_bienvenida)
select 'novedad',
       '✨ La app se renovó',
       E'Ahora es más fácil apartar tu puesto, anotarte en la lista hacia Valle Grande y ver por dónde vienen los carros. Tu cuenta, tus viajes y tus calificaciones siguen igual.\nActiva los avisos aquí arriba y te avisamos cuando salga un carro al Centro.',
       a.id,
       true
  from (select id from public.perfiles where rol = 'admin' order by id limit 1) a;
