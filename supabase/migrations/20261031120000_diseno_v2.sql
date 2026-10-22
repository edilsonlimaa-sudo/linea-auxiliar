-- Diseño nuevo del pasajero (v2, en construcción): solo lo ven las cuentas marcadas. Nadie se marca solo: la columna
-- no está en los grant de update de perfiles (solo nombre, urbanismo y foto_path); se marca a mano en la base.

alter table public.perfiles add column diseno_v2 boolean not null default false;
comment on column public.perfiles.diseno_v2 is 'Ve el diseño nuevo del pasajero (v2). Se marca a mano en la base.';
