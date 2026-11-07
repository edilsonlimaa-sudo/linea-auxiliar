-- R83 (nov. 2026): toda cuenta que se registra empieza en la interfaz nueva. Las que ya existen no cambian.
-- Nace en la nueva sin pasar por admin_cambiar_interfaz, así que no recibe la novedad "La app se renovó" (R88).

alter table public.perfiles alter column interfaz set default 'nueva';
comment on column public.perfiles.interfaz is 'R83: la interfaz que ve la cuenta (clasica o nueva; las cuentas nuevas, nueva). Solo la cambia el admin.';
