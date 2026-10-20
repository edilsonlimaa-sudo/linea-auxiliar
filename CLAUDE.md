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
| `components/chofer/` | Inicio del chofer (§8): sin viajes, `Demanda` ("¿hay gente esperando?" con la oferta de los demás) + "Publicar un viaje" (`AgregarViaje` modo primero) + compañeros en la ruta; con viajes, su gestión: `PublicarViaje` (modos primero / cadena / desde_ruta, R10–R11) y `AgregarViaje`, `ViajeChofer` (lista + `FilaPasajero`; `plegado` para próximos viajes), `BarraAccion` (la acción principal pegada abajo), `OcuparPuesto`, `MasOpciones`, `Conexion`. Datos: `lib/datos/inicio-chofer.ts`; acciones: `lib/acciones/chofer.ts` |
| `components/en-vivo.tsx` | **Tiempo real** (§4): el navegador se suscribe directo a Supabase Realtime con su sesión (RLS) y hace `router.refresh()` al haber cambios. Toda página que muestra viajes lo incluye. El navegador usa `cliente-navegador.ts` solo para Realtime (esto y el mapa) y para subir fotos; datos y acciones van siempre por el servidor |
| `components/chofer/compartir-ubicacion.tsx` · `components/pasajero/ver-en-mapa.tsx` | Posición del chofer (R40: watchPosition, cada 15 s o 30 m, Wake Lock) y mapa del pasajero (R41: Leaflet + OSM; con la hoja abierta recibe la posición por Realtime). Cálculos en `lib/mapa.ts` |
| `lib/datos/historial.ts` · `components/historial/` · `components/carnet.tsx` | Mis viajes (pasajero R51 con "Calificar" después; chofer R50), Mis calificaciones del chofer (R52, sin nombres) y Mi carnet (R53, ambos) |
| `lib/fotos.ts` · `components/foto/` | Fotos (R54): `firmarFotos(rutas)` da enlaces firmados de 1 h (bucket privado); `<SubirFoto>` achica en el teléfono (1080 px, JPEG), sube **directo a Storage** a la carpeta propia y la acción `guardarFoto` la registra; `<Avatar>` cae a iniciales; `<InterruptorAire>` (R55) |
| `components/ui/badge.tsx` · `avatar.tsx` | shadcn, ajustados a las medidas del proyecto (Badge: 14 px en negrita, alto 28 px). `AvatarGroup` para iniciales una junto a otra |
| `components/confirmar.tsx` | Confirmación propia (hoja inferior en el celular). **Nunca `window.confirm`**. Botones que dicen qué pasa ("Sí, ya no voy" / "No, sigo en el viaje"); el foco empieza en la opción segura |
| `components/pasajero/` | Inicio del pasajero: `SelectorSentido` (`selector-sentido.tsx`), `MapaLinea` (página La línea), `TarjetaUnidad` con `BotonApartar`, `HojaLugar` (sobre `ElegirLugar` + `CasillaGps`), `AvisameCuandoHaya` y la página Esperando (`EstadoEspera`, `PasosEspera`, `EsperanContigo`), `MiReservaTarjeta` con `CambiarLugar` |

Formularios: Server Action + `useActionState`, validación con zod y mensajes en español; el estado devuelve
`errores` por campo, `valores` para volver a llenar (nunca el PIN) e `intento` (se usa como `key` del form y para
llevar el foco al primer error).

Pasajero (especificación §8 "Inicio del pasajero"): **mirar primero, comprometerse después**. Inicio: saludo →
una línea "N choferes trabajando · Ver la línea" (lleva a **`/linea`**: mapa con todos los choferes y quién trabaja, `MapaLinea`) → **¿Hacia dónde vas?**
(`SelectorSentido`, el sentido va en `?hacia=centro|valle`) → las unidades de ese sentido (`TarjetaUnidad`, corta: el detalle del chofer se abre a pedido).
El lugar se pregunta **recién al apartar**: `BotonApartar` abre `HojaLugar` ("¿Dónde te recogemos?", recientes + texto +
GPS) y llama `apartarPuesto(viajeId, datos)`; al cambiarse de unidad (R22) no pregunta y usa el lugar de la reserva.
Sin unidad con puesto: **Avísame cuando haya una** (`AvisameCuandoHaya`, registra la espera, R31) → **`/esperando`**: página aparte con el sentido fijo (`EstadoEspera` con "Cambiar dónde estoy", las unidades que van apareciendo y quién más espera en ese sentido con `rpc('esperan_conmigo')`, nombre corto). Con espera activa, `/inicio` redirige a `/esperando` y el menú muestra "Esperando" de primero. En Mi viaje,
`CambiarLugar` usa la misma hoja. Al apartar, la acción redirige a **`/mi-viaje`** (puesto o
turno → cuándo llega → dónde → avance → chofer → acciones). Con reserva activa, `/inicio` redirige a `/mi-viaje`
(salvo `/inicio?cambiar=1`: otras unidades con puesto, R22) y el menú muestra "Mi viaje" de primero; "Ya no voy"
vuelve a Inicio. "En curso" = reserva activa **o a bordo** (`subio` en viaje en ruta); al terminar el viaje o cuando el chofer
marca "Se bajó" (R38), Mi viaje muestra la calificación pendiente (12 h, `CalificarViaje`). Si otro cierra la reserva, Inicio explica por qué (`AvisoCierre`, 30 min). Las acciones que cambian la reserva revalidan todo el layout (el menú depende de ella). Se refresca
en vivo (`EnVivo`, respaldo cada 60 s).

Rutas actuales: `/` portada = **entrar** (teléfono + PIN) · `/registro` (¿pasajero o chofer?) → `/registro/[pasajero|chofer]` ·
`/entrar` (redirige a `/`) · `/en-revision` · `/inicio` (pasajero: escoger unidad; chofer: Mi viaje) · `/mi-viaje` · `/esperando` · `/linea` (La línea) · `/mis-viajes` y `/carnet` (ambos roles) · `/calificaciones` (chofer) · `/choferes` (pasajero, R46) · `/admin/entrar` · `/admin/clave` · panel: `/admin` (Resumen), `/admin/viajes`, `/admin/viajes/terminados`, `/admin/demanda`, `/admin/choferes`, `/admin/pasajeros`, `/admin/uso`.

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
  cuántos esperan por sentido con `rpc('demanda_por_sentido')` y, **conectados**, quién espera con `rpc('esperando_para_choferes')` (nombre corto, lugar y teléfono para WhatsApp, R31; `QuienEspera`). Lugares recientes del
  pasajero: `rpc('mis_lugares_recientes')`.
- **Reservas en grupo y confirmación:** cada reserva/espera tiene `personas` (1–4, R57); los puestos se cuentan por personas (`sum(personas)` en orden, `desde`/`hasta` en `lista_viaje` y `puestosEnOrden`). Toda reserva del pasajero nace `pendiente` hasta que el chofer la acepta (`responder_pedido`, R58); `vencer_pedidos()` (pg_cron, cada minuto) rechaza las que llevan 5 min sin respuesta.
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
- Después de cambiar el esquema: `npm run db:reset`, `npm run db:test` y `npm run db:types`.

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
