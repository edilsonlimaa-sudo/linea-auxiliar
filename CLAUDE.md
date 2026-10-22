@AGENTS.md

# Línea Auxiliar Valle Grande

PWA de transporte comunitario entre Valle Grande y el Centro de Maturín (Venezuela). Pasajeros apartan
puesto en el carro que escogen, con una lista justa por orden de llegada; choferes publican y encadenan
viajes, comparten su ubicación y se ayudan con alertas de auxilio vial.

- **Especificación (fuente de verdad): [docs/especificacion.md](docs/especificacion.md).** Las reglas tienen
  número (R1…R51). Cambia la especificación antes que el código.
- **Prototipo validado de referencia:** la carpeta padre (`../app.js`, `../README.md`). Se puede abrir con
  `node ../serve.js` para ver cómo se comportaba cada flujo. No se publica ni se modifica.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui (Base UI) · Supabase
(Postgres + RLS, Auth, Realtime, Storage) · Leaflet + OpenStreetMap.

## Convenciones

- **Idioma:** la interfaz en español de Venezuela (`es-VE`), tuteo, frases cortas. Zona horaria America/Caracas.
- **Nombres:** los conceptos del dominio en español, igual que en la especificación (`viaje`, `reserva`,
  `chofer`, `lugar`, `espera`). La infraestructura sigue las convenciones de React/Next (`Button`,
  `useAlgo`, `page.tsx`).
- **Reglas en el servidor:** toda regla marcada [servidor] en la especificación se impone con RLS y funciones
  de Postgres (`supabase/migrations/`). El cliente solo oculta botones; nunca es la única barrera.
  - El orden de las reservas lo define `creado_en = now()` del servidor. El puesto se calcula, no se guarda.
  - Las acciones que tocan varias filas (salir, cancelar, recoger, aceptar pedido…) son funciones RPC atómicas.
- **Privacidad:** respetar la tabla "Quién ve qué" de la especificación (teléfonos y cédulas restringidos).

## Diseño y accesibilidad (personas mayores)

- Fuente **Atkinson Hyperlegible Next** (`--font-sans`); Mono para placas (`--font-mono`).
- Texto base 17 px (en `body`), nada menor a 14 px (`text-sm`).
- Contraste WCAG AA. **Nunca texto blanco sobre amarillo.** Foco siempre visible (anillo amarillo `ring`).
- Claro por defecto; modo oscuro solo a mano (`next-themes`, clase `.dark`).
- Estilo shadcn **base-maia** (el más espacioso). Al agregar componentes nuevos, revisar que cumplan las
  medidas de arriba; si no, ajustarlos como se hizo con `components/ui/button.tsx`.

### Colores (tokens en `app/globals.css`, nunca colores sueltos en los componentes)

| Token (clase Tailwind) | Uso |
|---|---|
| `primary` | Azul marino `#0b3b66`: botones normales, enlaces, títulos de marca |
| `signal` / `signal-foreground` | Amarillo `#f5b400` con texto oscuro: **la** acción principal de la pantalla |
| `secondary`, `accent`, `muted` | Fondos suaves (chips, hover de menús, tarjetas secundarias) |
| `success`, `success-muted` | Confirmado / verificado |
| `warning`, `warning-muted` | Pendiente / sin verificar / avisos |
| `destructive` | Cancelar, "No vino", auxilio |
| `whatsapp` | Acciones que abren WhatsApp (verde oscurecido para pasar AA) |
| `header` / `header-foreground` | Barra superior azul marino con franja `border-signal` |

### Botón (`components/ui/button.tsx`)

| Variante / tamaño | Cuándo |
|---|---|
| `variant="signal" size="lg"` (60 px) | Acción principal de la pantalla (una sola) |
| `default` / `outline` / `secondary` (52 px) | Acciones normales |
| `whatsapp` | Abrir WhatsApp |
| `size="sm"` (44 px) | Solo dentro de filas de listas ("No vino", "Llamar") |

### Diseño nuevo del pasajero (v2, en construcción)

- **Aislado del todo:** solo la presentación. Reglas, base, `lib/acciones`, `lib/datos` y `lib/viajes` son los mismos.
  Todo lo de la v2 vive en `components/v2`: su casca (`casca.tsx`: barra arriba y navegación abajo), su **kit shadcn
  propio** (`components/v2/ui`, preset por defecto: estilo base-nova, color neutral, Inter, radio por defecto) y su tema
  (`tema.css`, tokens solo dentro de `.v2`). Las reglas de diseño de arriba (Atkinson, 17 px, botones de 60/52/44 px,
  tokens de Línea Auxiliar) **no** valen en la v2: ahí manda el preset de shadcn, accesibilidad incluida.
- **Nunca importar `components/v2/ui` fuera de la v2 ni `components/ui` en lo nuevo de la v2.** Motorista, admin y el
  pasajero de siempre no se tocan.
- **Quién la ve:** solo las cuentas con `perfiles.diseno_v2` (se marca a mano en la base; nadie se marca solo).
  `app/(app)/layout.tsx` les da `CascaV2`, que **no muestra nada del diseño de siempre**: una pantalla sin versión v2
  muestra "En construcción" (`EnConstruccion`) y la vieja ni se arma.
  Nunca meter una pantalla vieja en la casca v2: el tema (`.v2`) cubre toda la casca y la dejaría mitad vieja, mitad nueva.
  Para agregar el kit: el CLI de shadcn instala donde dice `components.json`; se cambia por un momento `style` a
  `base-nova` y `aliases.ui` a `@/components/v2/ui`, y se deja como estaba (revisar que `cn` venga de `@/lib/utils`).

## Estructura

| Archivo | Para qué |
|---|---|
| `proxy.ts` | Renueva la sesión en cada petición y protege rutas. Públicas: `/`, `/entrar`, `/registro/*` (con sesión redirigen a `/inicio`) y `/admin/entrar`. Sin sesión, `/admin/*` va a `/admin/entrar` |
| `lib/supabase/cliente-servidor.ts` · `cliente-navegador.ts` | Clientes tipados con `lib/database.types.ts` |
| `lib/sesion.ts` | `obtenerPerfil()`, `exigirCuentaAprobada()` y `exigirAdmin()`. **Toda página de pasajero/chofer empieza con `exigirCuentaAprobada()`** (pendiente → `/en-revision`, admin → `/admin`); **toda página del panel, con `exigirAdmin()`** (no admin → `/inicio`; contraseña inicial → `/admin/clave`) |
| `lib/acciones/*.ts` | Server Actions (`"use server"`: solo se exportan funciones async; las constantes van en otro archivo de `lib/`) |
| `lib/telefono.ts` | Normalizar/validar teléfonos y el correo interno (igual que las funciones SQL) |
| `components/formulario/campos.tsx` | `CampoTexto`, `CampoPin`, `CampoSeleccion` y `useEnfocarError`: usarlos en todo formulario |
| `app/(publico)/` · `app/(app)/` · `app/admin/` | Grupos de rutas: portada y acceso (cabecera simple) · app de pasajero/chofer (menú lateral `components/app/menu-lateral.tsx` con shadcn Sidebar; en el celular es un drawer que abre el botón "Menú") · panel |
| `lib/viajes.ts` | Reglas de presentación puras: cuándo llega (`llegada`), puestos libres, orden para el pasajero |
| `lib/datos/*.ts` | Cargas de datos de cada pantalla (server-only), p. ej. `cargarInicioPasajero` |
| `components/chofer/` | Inicio del chofer (§8; lo normal discreto, lo que pide acción claro, el resto a un toque): sin viajes, bloque azul con `EstadoEnCabecera` y "Publicar un viaje" (`AgregarViaje` modo primero) + la franja `Companeros` (`enCabecera`; abre la lista y luego el detalle: qué hace, cuántos lleva, próximos viajes, mapa, WhatsApp/Llamar); con viajes, `EstadoServicio` (conexión + ubicación en una línea, aviso solo si falla el GPS), `ViajeChofer` (barra de pasos + lista de `FilaPasajero`: solo la acción del momento, contacto en una hoja; `plegado` para próximos viajes), `BarraAccion` (la acción principal pegada abajo), `OcuparPuesto` y `MasOpciones` chicos lado a lado, `PublicarViaje` (modos primero / cadena / desde_ruta, R10–R11) vía `AgregarViaje`. Datos: `lib/datos/inicio-chofer.ts`; acciones: `lib/acciones/chofer.ts` |
| `components/en-vivo.tsx` | **Tiempo real** (§4): el navegador se suscribe directo a Supabase Realtime con su sesión (RLS) y hace `router.refresh()` al haber cambios. Toda página que muestra viajes lo incluye. El navegador usa `cliente-navegador.ts` solo para Realtime (esto y el mapa) y para subir fotos; datos y acciones van siempre por el servidor |
| `components/chofer/compartir-ubicacion.tsx` · `components/pasajero/ver-en-mapa.tsx` | Posición del chofer (R40: hook `useCompartirUbicacion`, watchPosition, cada 15 s o 30 m, Wake Lock) y mapa del pasajero (R41: Leaflet + OSM; con la hoja abierta recibe la posición por Realtime). Cálculos en `lib/mapa.ts` |
| `lib/datos/historial.ts` · `components/historial/` · `components/carnet.tsx` | Mis viajes (pasajero R51 con "Calificar" después; chofer R50), Mis calificaciones del chofer (R52, sin nombres) y Mi carnet (R53, ambos) |
| `lib/fotos.ts` · `components/foto/` | Fotos (R54): `firmarFotos(rutas)` da enlaces firmados de 1 h (bucket privado); `<SubirFoto>` achica en el teléfono (1080 px, JPEG), sube **directo a Storage** a la carpeta propia y la acción `guardarFoto` la registra; `<Avatar>` cae a iniciales; `<InterruptorAire>` (R55) |
| `components/ui/badge.tsx` · `avatar.tsx` | shadcn, ajustados a las medidas del proyecto (Badge: 14 px en negrita, alto 28 px). `AvatarGroup` para iniciales una junto a otra |
| `components/confirmar.tsx` | Confirmación propia (hoja inferior en el celular). **Nunca `window.confirm`**. Botones que dicen qué pasa ("Sí, ya no voy" / "No, sigo en el viaje"); el foco empieza en la opción segura |
| `components/pasajero/` | Inicio del pasajero: `CabeceraInicio` ("¿Hacia dónde vas?" + quiénes trabajan, `cabecera-inicio.tsx`; la franja abre `LineaAhora`: qué hace cada chofer y qué viene después), `MapaLinea` (página La línea), `TarjetaUnidad` con `BotonApartar`, `HojaLugar` (sobre `ElegirLugar` + `CasillaGps`), `MiReservaTarjeta` con `CambiarLugar` |

Formularios: Server Action + `useActionState`, validación con zod y mensajes en español; el estado devuelve
`errores` por campo, `valores` para volver a llenar (nunca el PIN) e `intento` (se usa como `key` del form y para
llevar el foco al primer error).

Pasajero (especificación §8 "Inicio del pasajero"): **mirar primero, comprometerse después**. Inicio: saludo →
una línea "N choferes trabajando · Ver la línea" (lleva a **`/linea`**: mapa con todos los choferes y quién trabaja, `MapaLinea`) → **¿Hacia dónde vas?**
(`CabeceraInicio`, el sentido va en `?hacia=centro|valle`) → las unidades de ese sentido (`TarjetaUnidad`, corta: el chofer aparece una vez y al tocarlo `PerfilChofer` abre su perfil y el carro en una hoja).
El lugar se pregunta **recién al apartar**: `BotonApartar` abre `HojaLugar` ("¿Dónde te recogemos?", solo texto +
GPS; sin lugares recientes) y llama `apartarPuesto(viajeId, datos)`; al cambiarse de unidad (R22) no pregunta y usa el lugar de la reserva.
Sin unidad con puesto, la pantalla lo dice. **"Avísame" y la página Esperando están suspendidos** (R31): el pasajero solo ve unidades y pide puesto; las funciones de la base (`marcar_espera`, `esperan_conmigo`) siguen ahí para volver a activarlos. En Mi viaje,
`CambiarLugar` usa la misma hoja. Al apartar, la acción redirige a **`/mi-viaje`** (puesto o
turno → cuándo llega → dónde → avance → chofer → acciones). Con reserva activa, `/inicio` redirige a `/mi-viaje`
(salvo `/inicio?cambiar=1`: otras unidades con puesto, R22) y el menú muestra "Mi viaje" de primero; "Ya no voy"
vuelve a Inicio. "En curso" = reserva activa **o a bordo** (`subio` en viaje en ruta); al terminar el viaje o cuando el chofer
marca "Se bajó" (R38), Mi viaje muestra la calificación pendiente (12 h, `CalificarViaje`). Si otro cierra la reserva, Inicio explica por qué (`AvisoCierre`, 30 min). Las acciones que cambian la reserva revalidan todo el layout (el menú depende de ella). Se refresca
en vivo (`EnVivo`, respaldo cada 60 s).

Rutas actuales: `/` portada = **entrar** (teléfono + PIN) · `/registro` (¿pasajero o chofer?) → `/registro/[pasajero|chofer]` ·
`/entrar` (redirige a `/`) · `/en-revision` · `/inicio` (pasajero: escoger unidad; chofer: Mi viaje) · `/mi-viaje` · `/linea` (La línea) · `/mis-viajes` y `/carnet` (ambos roles) · `/calificaciones` (chofer) · `/choferes` (pasajero, R46) · `/admin/entrar` · `/admin/clave` · panel: `/admin` (Resumen), `/admin/viajes`, `/admin/viajes/terminados`, `/admin/demanda`, `/admin/choferes`, `/admin/pasajeros`, `/admin/uso`, `/admin/calificaciones` (todas, con quién calificó; filtros de período, chofer y nota; datos en `lib/datos/calificaciones-admin.ts`).

### Administración

- Rutas: `app/admin/(acceso)/` (entrar y clave: angostas, sin menú) y `app/admin/(panel)/` (menú lateral `components/admin/menu-admin.tsx`, fijo en la computadora y cajón con "Menú" en el celular; contadores cargados en su layout). Datos: `lib/datos/admin.ts`.
- Cuenta separada: entra en `/admin/entrar` con **usuario + contraseña** (correo interno
  `usuario@admin.lineaauxiliar.app`, `lib/admin.ts`). Pasajeros y choferes no pueden entrar ahí, y el admin no
  tiene teléfono, así que no entra por `/entrar`.
- Nadie se vuelve admin desde el registro: solo con la función `crear_admin(usuario, clave)`, que únicamente
  ejecuta la clave secreta del servidor (`npm run admin:crear`, o el seed en local).
- Toda cuenta de admin nueva queda con `debe_cambiar_clave`: el panel exige cambiar la contraseña antes de abrirse.
- Pendiente: restablecer el PIN de un pasajero/chofer desde el panel (R4) y reforzar el límite de intentos de login.

## Base de datos (Supabase)

- `supabase/migrations/`: `esquema` (tipos, tablas, triggers) · `seguridad` (RLS y permisos por columna) ·
  `reglas` (funciones RPC con las reglas R-número) · `storage_y_tareas` (bucket `fotos`, pg_cron).
- **Escrituras:** viajes, reservas, esperas y alertas solo se cambian con las funciones RPC
  (`supabase.rpc('reservar', …)`). Directo a tablas solo: perfil propio (nombre, urbanismo, foto), vehículo
  propio, cédula propia, posición del chofer, calificaciones y avisos (admin). Los errores de las funciones
  ya vienen en español para mostrarlos tal cual.
- **Dónde recoger:** no hay paradas registradas. Reservas y esperas guardan `lugar` (texto libre, máx. 60) y/o
  `lat`/`lng`; la base exige al menos uno (`_validar_lugar`). Las esperas llevan `sentido` y solo las ven su dueño y el admin: los choferes leen
  cuántos esperan por sentido con `rpc('demanda_por_sentido')` y, **conectados**, quién espera con `rpc('esperando_para_choferes')` (nombre corto, lugar y teléfono para WhatsApp, R31; `QuienEspera`). (`mis_lugares_recientes` sigue en la base,
  pero la app ya no lo usa: la hoja de lugar es solo texto + GPS, R25).
- **Reservas en grupo:** cada reserva/espera tiene `personas` (1–4, R57); los puestos se cuentan por personas (`sum(personas)` en orden, `desde`/`hasta` en `lista_viaje` y `puestosEnOrden`). Al apartar, el puesto queda garantizado (R58 eliminada): solo el pedido en el camino (R29) queda `pendiente` hasta que el chofer responde (`responder_pedido`). **Sin lista de espera** (R59): un carro lleno no acepta reservas ni anotados a mano, y no se bajan los puestos por debajo de los reservados.
- **Pausas (R60):** `desconectar(p_vuelve_en)` pide si vuelve hoy (sin hora = terminó por hoy) y guarda una fila en `pausas`; conectarse o publicar la cierra (trigger en `perfiles`). Los pasajeros leen lo vigente con `rpc('choferes_en_pausa')` (la vuelta vence 30 min después de la hora; "terminó", a medianoche). UI: `HojaDesconectar` (chofer) y `QuienVuelve` (pasajero: Inicio sin unidad con puesto y "La línea ahora"); texto con `textoVuelta` (`lib/fechas.ts`).
- **Ida y vuelta (R61):** sin cambios en la base: la vuelta es otro `publicar_viaje` (sentido contrario con `contrario()`, mismos puestos). Al publicar, `publicarViaje` con `vuelta` (minutos después de salir) la encadena; al salir, `BarraAccion` va a `/inicio?vuelta=1` y `PreguntarVuelta` la ofrece si no hay otro viaje abierto.
- **Lista hacia Valle Grande (el tramo Centro → Valle Grande, §5.17, R62–R68; en el código y la base se llama `lista_gina`):** en ese sentido `reservar` rechaza; el pasajero se anota en la lista del tramo con `estoy_en_lista` diciendo dónde está (En Gina, la opción principal, o el lugar que escribe; GPS y distancia en `lista_gina_privado`, solo choferes/admin), `sigo_en_lista`, `me_fui(motivo)` (cómo se va: en la van, otro carro…; `lib/motivos-salida.ts`, guardado en `lista_gina_privado`); `me_monte()` sigue en la base pero la app ya no lo ofrece (R62: la hoja de Me fui solo dice cómo se va); quien quedó con `dice_que_subio` lo ve el chofer destacado con Subió; Salir de Gina avisa si nadie está marcado; todos leen `lista_de_gina()`. El chofer ve `plan_de_gina(viaje)` (stable: sin bloquear filas, la API la corre en solo lectura; rol llamar / guardar / despues y `cabe`; dos carros en Gina: `_ocupado_por_otros`), marca `subio_de_lista` (crea una reserva `subio`) y `no_estaba_en_lista`; al salir, `avanzar_viaje` llama `_vincular_camino` (los del camino quedan como reservas activas del carro); en ruta, `voy_por_el` liga a su carro a quien se anotó en el camino después (R67: el primero se la lleva; el aviso amarillo "Espera en el camino" de `ViajeChofer` usa `FilaLista` de la hoja, y el pasajero ve los carros en ruta con puesto). Todos los choferes leen la lista con `lista_para_choferes()` (teléfono solo si están conectados). UI: `ListaGina` (pasajero no anotado, en Inicio con sentido Centro → Valle) y `MiLista` (anotado: Inicio lo lleva a **Mi viaje**, como con reserva; su lugar → carros que vienen → tiempo del lugar → lista → Me fui; los carros salen de `carrosHaciaValle`), `ListaTramo` (chofer: franja en su Inicio, **fuera de los viajes**, que abre la lista completa en una hoja, y se abre sola al tocar "Ya llegué" en Gina, R64; en Gina o en ruta hacia Valle Grande la hoja deja marcar Subió / No estaba), `/admin/lista-gina`. Prueba: `lista_gina.test.sql`.
- **El admin cierra viajes y desconecta choferes (R69):** `admin_cerrar_viaje` (sin salir se cancela; en ruta se termina) y `admin_desconectar` (cierra todos sus viajes, también el que va en ruta, y deja una pausa "terminó por hoy"), desde Viajes en curso (cada viaje, y "Conectados sin viaje"), "En la ruta ahora" del Resumen y la tarjeta de Choferes (`components/admin/acciones-viaje.tsx`). Todo cierre pasa por `_cerrar_viaje` (también `cancelar_viaje` y `desconectar` del chofer): quien estaba en la lista hacia Valle Grande vuelve a su lugar (`_devolver_a_lista`). Prueba: `admin_viajes.test.sql`.
- **"Me atraso" (R70):** en camino, `me_atraso(viaje, minutos)` corre `eta_min` para que llegue en esos minutos desde ahora y marca `viajes.atraso_en` (el pasajero ve "avisó que se atrasa" en `llegada()`); deja un `viaje_eventos` con `atraso` (la puntualidad sigue contra lo primero que prometió). UI: `MeAtraso` en `ViajeChofer` (amarillo si ya pasó su hora). Prueba: `me_atraso.test.sql`.
- **Lectura de la lista de un viaje:** `rpc('lista_viaje', { p_viaje })` (pública, sin teléfono ni ubicación).
  El chofer lee `reservas` de sus viajes directo (con ubicación). El puesto es la posición por `creado_en`.
- **Tabla nueva:** siempre `enable row level security`, políticas explícitas y `grant` por columna;
  nada para `anon`. **Función nueva:** `security definer set search_path = ''`, validar `auth.uid()` y
  revocar `execute` a `anon`; las internas llevan prefijo `_` y se revocan también a `authenticated`.
- **Login:** teléfono + PIN de 6 dígitos. Internamente es email/contraseña con el correo
  `correo_de_telefono(telefono)` (ej. `584140000021@tel.lineaauxiliar.app`), que nunca se muestra. Al
  registrarse, el trigger `crear_perfil_nuevo` crea perfil, datos privados y vehículo desde los metadatos.
- **Seed local (`supabase/seed.sql`):** solo la cuenta `admin` / `admin123` (pide cambiarla al entrar). Las cuentas
  reales se registran desde la app y el admin las aprueba. **Datos de ejemplo** (choferes, pasajeros, viajes;
  PIN `123456`): `npm run db:demo` después de `db:reset` (`supabase/demo.sql`).
- **La base local puede tener datos reales de prueba**: **no correr `db:reset` ni `db:demo` sin preguntar**. Las
  pruebas pgTAP sí se pueden correr: todo se deshace al final.
- **Pruebas:** `supabase/tests/database/*.test.sql` (pgTAP). Cada archivo crea sus propias cuentas dentro de su
  transacción (no dependen del seed ni de la demo). Toda regla [servidor] nueva lleva su prueba.
- **Dos bases, dos caminos.** El app local (`npm run dev`) usa **solo el Supabase del Docker** (`.env.local` apunta a
  `127.0.0.1:54321`); producción (Vercel) usa Supabase Cloud. Migraciones: **local con la CLI**
  (`npx supabase migration up --local`, luego `npm run db:test` y `npm run db:types`); **nube con `npm run db:nube`**
  (Management API; con VPN la CLI no llega). El `SUPABASE_ACCESS_TOKEN` del `.env.local` es de la nube y solo sirve para
  eso; el proyecto sale de `SUPABASE_PROJECT_REF` o del vínculo de la CLI (`supabase/.temp/project-ref`). Las migraciones ya aplicadas en la nube no se editan: los cambios van en una migración nueva.

## Comandos

```bash
npm run dev        # http://localhost:3000
npm run lint
npm run typecheck
npm run build
npm run db:start   # Supabase local (Docker). Studio: http://127.0.0.1:54323
npm run db:reset   # recrea la base con migraciones + seed (solo el admin)
npm run db:demo    # carga datos de ejemplo (después de db:reset)
npm run db:test    # pruebas de las reglas (pgTAP)
npm run db:types   # regenera lib/database.types.ts
npm run db:nube    # aplica las migraciones pendientes en Supabase de la nube por la API (HTTPS; con VPN la CLI no llega). Necesita SUPABASE_ACCESS_TOKEN
npm run db:stop
npm run admin:crear # crea un admin (en producción exige ADMIN_CLAVE; ver .env.example)
```
