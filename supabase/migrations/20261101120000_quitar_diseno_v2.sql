-- Se deshizo el diseño nuevo del pasajero (v2): la marca que lo abría ya no se usa
alter table public.perfiles drop column if exists diseno_v2;
