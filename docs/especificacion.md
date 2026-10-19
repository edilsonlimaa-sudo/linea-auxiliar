# Línea Auxiliar Valle Grande — Especificación

> Fuente de verdad del producto. Las reglas salen del prototipo validado con choferes y pasajeros reales
> (carpeta `../` de este repositorio: `index.html`, `app.js`, `README.md`). Si una regla cambia, se cambia
> **aquí primero** y después en el código.

## 1. Contexto

La Línea Auxiliar Valle Grande es un transporte comunitario entre los urbanismos de **Valle Grande** (ej.
Valle Grande Country) y el **Centro de Maturín**, Venezuela. Hoy se coordina por un grupo de WhatsApp: el
chofer escribe "voy con 4 puestos" y los primeros que responden se van con él.

Problemas observados que la app resuelve:

1. **Conflictos en la parada.** Llegan personas que no escribieron y se molestan si no se las llevan. Hace
   falta un orden **transparente y justo** que todos vean igual.
2. **"¿Por dónde vienen?"** Los pasajeros no saben qué unidades trabajan, cuándo llegan ni cuántos puestos
   quedan.
3. **Desconfianza y desorden.** Rumores de que "la ruta no funciona". Hace falta información oficial y
   reputación visible.
4. **Seguridad.** Saber quién es cada chofer y cada pasajero (verificados, con foto y placa).
5. **Auxilio vial** entre choferes cuando se accidentan o se quedan accidentados.

## 2. Roles

| Rol | Qué hace |
|---|---|
| **Pasajero** | Ve las unidades, escoge un carro y aparta puesto; indica dónde lo recogen; avisa que espera; califica |
| **Chofer** | Se conecta, publica y encadena viajes, lleva la lista de su carro, avisa llegada, pide auxilio |
| **Admin** | Aprueba o rechaza cuentas, publica el aviso del día, genera la ficha del chofer, restablece PIN |

Una persona tiene un solo rol. El admin se asigna a mano en la base de datos.

## 3. Glosario

| Término | Significado |
|---|---|
| **Sentido** | Dirección del viaje. Solo hay dos: **Valle Grande → Centro** y **Centro → Valle Grande** |
| **Zona** | Área de salida de un sentido: "Valle Grande" o "Centro" |
| **Lugar** | Dónde recoger al pasajero: **texto libre** que él escribe (ej. "Entrada de Las Cayenas") y/o su **GPS**. No hay paradas registradas (ver §4) |
| **Viaje** | Una salida publicada por un chofer en un sentido, con N puestos |
| **Recogida actual** | El viaje del chofer que todavía no salió y está en curso (en camino / llegando / recogiendo) |
| **Próximo viaje** | Viaje encadenado (`programado`): arranca solo cuando el chofer sale del anterior |
| **Reserva** | El lugar de un pasajero en un viaje |
| **Puesto** | Lugar confirmado dentro de la capacidad del carro (puesto 1..N) |
| **Turno / lista de espera** | Reservas que quedaron después del puesto N |
| **Espera** | Aviso de demanda: "estoy esperando para ir al Centro, en tal lugar" cuando no ve un carro que le sirva |
| **Pedido en el camino** | Reserva hecha sobre un carro que **ya salió**; el chofer decide si pasa ("Voy") o no ("Sigo") |
| **Conectado** | El chofer está trabajando y los pasajeros lo ven entre las "unidades en servicio" |

## 4. Decisiones

| Tema | Decisión |
|---|---|
| Plataforma | **Web app (PWA)** con Next.js, instalable desde el navegador. Sin tienda de apps |
| Backend | **Supabase**: Postgres con RLS, Auth, Realtime y Storage |
| Acceso | **Teléfono + PIN de 6 dígitos**; la cuenta queda **pendiente** hasta que el admin la aprueba (ver R1) |
| Idioma | Español de Venezuela (`es-VE`). Zona horaria **America/Caracas** |
| Diseño | shadcn/ui; letra **Atkinson Hyperlegible**; claro por defecto con botón para modo oscuro; pensado para personas mayores |
| Mapas | Leaflet + OpenStreetMap (gratis, sin clave) |
| Tiempo real | El navegador se suscribe **directo a Supabase Realtime** con la sesión de la persona (RLS decide qué le llega) y, al haber un cambio, vuelve a pedir la pantalla al servidor. Los **datos y las acciones siguen pasando por el servidor** de Next. Respaldo: cada 60 s y al volver a la app. (No por el servidor: en hosting serverless una conexión abierta por teléfono no escala) |
| Hosting | Por decidir (Vercel Pro o Cloudflare). Nada debe atarnos a uno |
| WhatsApp | Sigue siendo el puente con quien no tiene la app: mensajes listos para el grupo y para el chofer |
| Dónde recoger | **Texto libre + GPS opcional, sin paradas registradas.** Así se coordina hoy en el grupo ("estoy en la entrada de Las Cayenas"); una lista fija obliga a escoger la parada "más cercana" y el chofer va al sitio equivocado, y además habría que mantenerla. Para no hacer escribir siempre, la app ofrece los lugares recientes de la persona (R25) |

## 5. Reglas de negocio

Las reglas marcadas **[servidor]** se deben hacer cumplir en la base de datos (funciones + RLS). El cliente
puede ocultar botones, pero nunca es la única barrera.

### 5.1 Cuentas y acceso

- **R1. Registro.** Nombre, teléfono (WhatsApp), PIN de 6 dígitos y rol. Pasajero: urbanismo. Chofer: placa
  (obligatoria), unidad, modelo, color y si tiene **aire acondicionado** (R55). Foto de perfil y foto del carro
  **opcionales** (R54; el admin ve "Falta foto"). Cédula **opcional**.
- **R2. Aprobación [servidor].** Toda cuenta nueva queda `pendiente`. Puede iniciar sesión y ver la app, pero
  **no puede apartar, publicar ni agregar a nadie** hasta que el admin la apruebe. Ve el aviso "Tu cuenta
  está en revisión". El admin puede `aprobar` o `rechazar`; rechazado no puede operar.
- **R3. Teléfono único [servidor].** Un teléfono = una cuenta. Se normaliza a formato internacional
  (`0414-1234567` → `+584141234567`).
- **R4. PIN olvidado.** No hay recuperación automática: el admin genera un PIN temporal y se lo pasa por
  WhatsApp.
- **R5. Verificado.** Los demás ven "✓ Verificado" solo en cuentas aprobadas.

### 5.2 Conexión del chofer

- **R6.** Botón **Conectarme / Desconectarme**. Publicar un viaje conecta automáticamente.
- **R7.** Los pasajeros ven arriba "N unidades en servicio ahora" con nombre, unidad y qué hace cada una
  ("disponible", "recogiendo en Centro", "en ruta a Valle Grande").
- **R8 [servidor].** Al desconectarse se **cancelan** sus viajes publicados (los anotados reciben aviso). Con
  un viaje **en ruta** no puede desconectarse: primero lo termina.
- **R9 [servidor].** A medianoche (America/Caracas) todos los choferes quedan desconectados.

### 5.3 Publicar viajes y cadena

- **R10.** Al publicar, el chofer elige solo el **sentido** (se muestra cuánta gente espera en cada sentido),
  **puestos** (1–8) y **cuándo llega a la zona de recogida**: "Ya estoy aquí", botones rápidos (5/10/15/20 min),
  cualquier número de minutos (1–240) o **una hora fija** (ej. 14:00; si esa hora ya pasó hoy, es la de
  mañana).
- **R11. Cadena.** Mientras va en ruta (o con una recogida en curso), puede **agregar todos los viajes que
  necesite** ("➕ Agregar otro viaje"). El formulario sugiere el sentido contrario al último viaje. Los
  encadenados quedan `programado` y **aceptan reservas desde que se publican**.
- **R12 [servidor].** Cuando el chofer **sale** de la recogida actual, el siguiente `programado` pasa solo a
  `en_camino`. Si tenía hora fija posterior, se respeta como mínimo.
- **R13 [servidor].** Cuando el chofer toca **Llegué** en la recogida actual, el viaje anterior
  que iba en ruta se **finaliza solo**.

### 5.4 Estados del viaje

```
programado ──(sale del anterior)──► en_camino ──► llegando ──► en_parada ──► en_ruta ──► finalizado
     │                                  │             │             │
     └──────────────── cancelado ◄──────┴─────────────┴─────────────┘
```

| Estado | Significado | Acción principal del chofer |
|---|---|---|
| `programado` | Próximo viaje en la cadena | — (se activa solo) |
| `en_camino` | Va hacia la zona de recogida | **Avisar llegada (a 3 min)** |
| `llegando` | A 2–3 min | **Llegué** |
| `en_parada` | Llegó y está **recogiendo** ("Suben los puestos 1 al N"). En pantalla: "Recogiendo" | **Salir con N pasajeros** |
| `en_ruta` | Va hacia el destino | **Terminar viaje** |
| `finalizado` / `cancelado` | Cerrado | — |

- **R14 [servidor]. Al salir** (`en_ruta`): los confirmados pasan a `subio`; los de lista de espera pasan a
  `sin_puesto` y reciben "salió llena, escoge otra unidad". **Nadie es asignado automáticamente a otro
  carro.**
- **R15.** "Avisar llegada" también abre WhatsApp con el mensaje para el grupo: "Llego en 3 minutos a …
  Suben los puestos 1 al N: 1. Carmen R. (Entrada de Las Cayenas) …".

### 5.5 Reservas y lista justa (el corazón de la app)

- **R16. El pasajero escoge el carro.** No hay turno entre choferes ni asignación por orden de salida. Los
  viajes se muestran agrupados por **sentido**, primero los que tienen puestos y llegan antes.
- **R17. Orden por hora de reserva [servidor].** El puesto **no se guarda**: se calcula ordenando las
  reservas `activa`/`subio` del viaje por `creado_en`, que pone **el servidor** (`now()`), nunca el
  celular. Los primeros N tienen puesto; el resto, turno en lista de espera. Así, liberar un puesto, marcar
  "No vino" o cambiar la cantidad de puestos reordena todo solo.
- **R18. Una reserva activa por pasajero [servidor].** Si aparta en otro carro, se le pregunta y la anterior
  se cancela.
- **R19. Lista pública.** Todos ven la misma lista con nombre corto ("Carmen R."). Nunca el teléfono.
- **R20.** "Ya no voy" libera el lugar y el siguiente sube solo.
- **R21.** El chofer marca **No vino** (solo confirmados, solo antes de salir) y el siguiente sube.
- **R22.** Si el carro escogido está lleno, la app ofrece **Cambiarme** a otro carro del mismo sentido con
  puestos libres.
- **R23.** El pasajero puede tocar **✋ Ya estoy en el sitio** y el chofer lo ve en su lista.
- **R24.** Si el chofer cancela el viaje, todos los anotados pasan a `sin_puesto` con aviso.

### 5.6 Dónde recoger al pasajero

- **R25.** Al **avisar que espera** (R31), el pasajero **escribe dónde está** (texto libre, máx. 60 caracteres,
  ej. "Entrada de Las Cayenas"). Eso es lo principal y lo que el chofer ve en grande. Para no escribir cada vez, la app
  ofrece sus **3 lugares más recientes** (de sus reservas y esperas anteriores) como opciones de un toque, con
  el último ya escogido.
- **R26 [servidor].** El **GPS es opcional**: casilla "📍 Agregar también mi GPS" (se recuerda la elección). Si
  lo agrega, el chofer tiene **Cómo llegar** (Google Maps) y **Waze**. Quien no sabe explicar dónde está
  puede mandar **solo su GPS**. Hace falta al menos uno: lugar escrito o GPS.
- **R27.** **Apartar es un toque:** se usa el lugar de la espera, sin volver a preguntar. Se puede cambiar
  ("Cambiar" en la espera, o después en Mi viaje). Al cambiarse de unidad (R22) se usa el lugar de la reserva.

### 5.7 Pedidos en el camino

- **R28.** Un carro `en_ruta` con puestos libres muestra **🙋 Pedir que me recoja en el camino**, con el lugar
  de la espera (R27). La app no valida si el lugar queda por delante: lo decide el chofer (R29).
- **R29 [servidor].** El pedido **ocupa el puesto al instante** y queda `pendiente`. Al chofer le aparece con
  aviso en rojo: **✓ Voy** (al pasajero: "va por ti") o **✕ Sigo** (se libera el puesto; al pasajero: "no
  puede pasar esta vez, escoge otra unidad"). Después marca **Subió** o **No vino**.
- **R30 [servidor].** Al terminar el viaje: pedidos aceptados → `subio`; sin responder → `rechazada`.

### 5.8 Esperando (demanda)

La espera es solo una **señal de demanda** y un **aviso al pasajero**. No hay pantalla "Esperando" para el
chofer: la reserva la hace siempre el pasajero, así la lista justa (R17) es la única forma de entrar a un carro.

- **R31.** **Avisar que espera es el primer paso de todo pasajero** (§8): el **sentido** al que va y su
  **lugar** (escrito y/o GPS, R25–R26). Recién entonces ve las unidades y aparta. Así todo pasajero cuenta como
  demanda y el lugar se escribe una sola vez. Los choferes ven **solo cuántos esperan por sentido**: al
  publicar (R10) y en su Inicio cuando no tienen viaje ("3 personas esperan para ir al Centro").
- **R32.** Al aparecer un viaje de ese sentido que acepta reservas, el pasajero recibe **"🚐 ¡Ya hay una
  unidad para ti!"** y botón **Apartar** (usa el lugar de la espera, R27).
- **R33.** *(Eliminada.)* El chofer ya no agrega a su viaje a quien espera: duplicaba la reserva y saltaba el
  orden justo. Si encuentra a alguien en la calle, usa **Ocupar puesto** (R36).
- **R34.** *(Eliminada.)* "Recogido" desde la espera; lo cubre Ocupar puesto (R36).
- **R35 [servidor].** Una espera vence sola a las 2 h. También se cierra cuando la persona aparta (R18).

### 5.9 Puestos manuales (quien no usa la app)

- **R36.** **➕ Ocupar puesto** en cualquier viaje del chofer (recogida actual, en ruta o próximo). Nombre
  opcional ("Pasajero sin app").
- **R37 [servidor].** Antes de salir, el anotado a mano entra en el **siguiente puesto libre**; si está lleno,
  queda **al final** de la lista de espera (no le quita el puesto a quien apartó antes). En ruta, solo si hay
  puesto libre ("Subió en el camino").
- **R38.** **Se bajó** libera un puesto en ruta y **termina el viaje de esa persona**: para ella cuenta como
  llegada (puede calificar, R45), aunque el carro siga. Mucha gente se baja antes del final de la ruta y no lo
  marca en su teléfono; lo marca el chofer. **Quitar** elimina un anotado a mano.

### 5.10 Tiempo estimado

- **R39.** Se dice desde el pasajero y **dónde recoge** el carro, nunca "llega a X" (se leía como "el viaje
  termina en X"). Cada tarjeta muestra además la ruta ("Valle Grande → Centro"). Recogida actual: "Recoge en Valle
  Grande en ~X min (hora)" · "Recogiendo ahora en Valle Grande" · si pasó el tiempo anunciado, "Recoge en Valle
  Grande en cualquier momento". Encadenado: "Próximo viaje · Recoge en Valle Grande a las HH:MM (en ~1 h 10 min, al
  terminar su viaje actual)" = minutos hasta que el viaje anterior recoge + trayecto de vuelta, o la hora fija si es
  mayor. Duraciones ≥ 60 min se muestran en horas.

### 5.11 Ubicación del chofer (mapa en vivo)

- **R40.** Con el chofer conectado y con viajes, su teléfono envía la posición como mucho cada **15 s** (o al
  moverse más de 30 m). El chofer ve "📡 Tus pasajeros ven por dónde vas" o un aviso si falta permiso. Solo
  funciona **con la app abierta y la pantalla encendida** (límite de una web app, §11); el chofer lo ve dicho.
- **R41.** **Ver en el mapa** en cada unidad (Inicio, esperando) y en Mi viaje abre un mapa con 🚐 el carro,
  📍 el pasajero (si compartió GPS) y "está a 744 m de ti". Mientras está abierto, la posición llega por
  Realtime cada vez que el chofer la envía. Sin posición reciente: "Este chofer no está compartiendo su ubicación ahora".
- **R42.** Una posición con más de 10 min se considera vieja y no se muestra.

### 5.12 Auxilio vial (solo choferes)

- **R43.** Botón **PEDIR AUXILIO** → tipo (caucho, gasolina, accidente, falla mecánica) → se toma el GPS y se
  crea la alerta. Los demás choferes ven la alerta con foto del carro, placa, mapa y **Voy** (se suma a
  "N compañeros van en camino"). Botón para enviarla también al grupo de WhatsApp. **Ya estoy bien** la
  cierra.

### 5.13 Calificaciones

- **R44 [servidor].** Solo puede calificar quien **realmente viajó** (reserva `subio` o `bajo`). Una
  calificación por pasajero y viaje.
- **R45.** Al terminar su viaje (el chofer terminó el viaje **o marcó que se bajó**, R38) aparece "¿Cómo te fue con…?" (1 toque en las estrellas; etiquetas y comentario
  opcionales: Puntual, Seguro, Amable, Respetó el orden, Carro limpio). "Ahora no" la pospone: se puede
  calificar después desde **Choferes** o **Mis viajes**.
- **R46. Choferes** (pasajero): todos los choferes verificados de la línea, para conocerlos y escoger con
  confianza. Primero los que **trabajan ahora**; después, por ★. Cada tarjeta: foto (R54), nombre, ✓ Verificado,
  el carro (placa, modelo, color, unidad, ❄️ con aire, R55), ★ promedio y cantidad, y **los dos comentarios más
  recientes** (sin el nombre de quien opinó, R52). Si el pasajero tiene un viaje sin calificar con ese chofer,
  la tarjeta ofrece **Calificar** (R45). Sin teléfono: solo lo ve quien tiene reserva con él (§6).

### 5.14 Transparencia y avisos

- **R47.** El admin publica el **aviso del día** (máx. 240 caracteres), visible solo para pasajeros y que
  vence al terminar el día.
- **R48.** Contador público: unidades en servicio ahora y viajes de hoy.
- **R49.** Al aprobar un chofer se genera la **ficha** (imagen 1080×1080 con foto, carro, placa, unidad) lista
  para compartir en el grupo.

### 5.15 Historial

- **R50.** Chofer: **Mis viajes** (los últimos 20 terminados). Cada uno, plegado: sentido, fecha, salida →
  llegada, duración, cuántos llevó y ★ del viaje. Al abrirlo: a quién llevó y **cómo entró** cada uno (con la app,
  anotado a mano, recogido en el camino), quién se bajó antes, quién **no vino** y las calificaciones de ese viaje.
- **R51.** Pasajero: **Mis viajes** (los últimos 30 que viajó de verdad: subió o se bajó). Cada uno: sentido,
  fecha, chofer, unidad, **placa** y su calificación. Si no lo calificó ("Ahora no", R45), botón **Calificar**
  ahí mismo.
- **R52.** Chofer: **Mis calificaciones**, su propio espacio (no va en el carnet): ★ promedio y cantidad,
  cuántas de cada estrella, las etiquetas que más le dan y los comentarios recientes. **Sin el nombre** de quien
  calificó (solo fecha y sentido), para que el pasajero califique con libertad.
- **R53.** **Mi carnet** (pasajero y chofer): la credencial de la línea para mostrar si se la piden. Nombre,
  rol, **✓ Verificado** con la fecha de aprobación, teléfono y cédula (si la dio). Pasajero: urbanismo. Chofer:
  unidad, **placa** en grande, modelo y color, y su ★ (enlace a Mis calificaciones). Por ahora solo lectura: para
  corregir un dato se le pide al administrador, salvo las fotos (R54) y el aire acondicionado (R55), que se
  cambian ahí mismo.

### 5.16 Fotos y comodidades

- **R54. Fotos.** Foto de perfil (pasajero y chofer) y foto del carro (chofer). Opcionales, pero ayudan a
  reconocerse en la calle y a que el admin verifique (R1, "Falta foto").
  - **Dónde se ponen:** mientras la cuenta está en revisión (la pantalla lo pide: ayuda a que la aprueben) y
    siempre en **Mi carnet** ("Cambiar foto"). Con la cámara o de la galería.
  - **Livianas:** la app la achica en el teléfono antes de subirla (máx. 1080 px, JPEG): datos móviles caros (§10).
  - **Dónde se ven:** la del chofer en las unidades y en Mi viaje; **la del carro en Mi viaje**, para reconocerlo
    al llegar; la de cada pasajero en la lista del chofer; ambas en el panel del admin y en el carnet. Sin foto,
    las iniciales.
  - **[servidor]** Bucket privado: cada uno sube solo a su carpeta; las ven solo usuarios con sesión, con
    enlaces firmados que vencen en 1 h.
- **R55. Aire acondicionado.** El chofer indica si su carro tiene aire (al registrarse y en Mi carnet). Los
  pasajeros lo ven en cada unidad y en Mi viaje ("❄️ Con aire").

## 6. Privacidad: quién ve qué [servidor]

| Dato | Lo ve |
|---|---|
| Nombre corto, foto, ★, "verificado" | Cualquier usuario con sesión |
| Datos del carro (unidad, placa, modelo, color, foto) | Cualquier usuario con sesión |
| **Teléfono** de un pasajero | Su chofer mientras tiene reserva en uno de sus viajes (y 7 días después), y el admin |
| **Teléfono** de un chofer | Pasajeros con reserva en sus viajes, otros choferes y el admin |
| **Cédula** | Solo la propia persona y el admin |
| Lugar escrito y GPS de un pasajero (reserva) | Solo el chofer del viaje. La lista pública no lo muestra |
| Espera de un pasajero | Solo él y el admin. Los choferes ven únicamente cuántos esperan por sentido (R31) |
| Posición del chofer | Cualquier usuario con sesión (solo mientras está conectado) |
| Alertas de auxilio | Solo choferes |

## 7. Avisos al usuario

| Evento | A quién | Mensaje |
|---|---|---|
| Chofer toca "Avisar llegada" | Confirmados del viaje | 🔔 ¡Tu unidad llega en 2–3 minutos! |
| Chofer llegó (recogiendo) | Confirmados | Suben los puestos 1 al N. Busca la placa … |
| Pedido en el camino | Chofer | 🙋 X pide que pases por … |
| Chofer acepta el pedido | Pasajero | ✅ ¡El chofer va por ti! |
| Chofer rechaza / sale lleno / cancela | Afectados | Escoge otra unidad |
| Aparece unidad para quien espera | Pasajero | 🚐 ¡Ya hay una unidad para ti! |
| Alerta de auxilio | Choferes conectados | 🆘 … |

Primera versión: avisos en la app (tiempo real) + vibración. Después: **Web Push** para recibirlos con la
app cerrada (en iPhone solo con la app instalada en la pantalla de inicio).

## 8. Pantallas

Navegación con **menú lateral** (drawer en el celular, botón "Menú" con texto).

| Rol | Secciones |
|---|---|
| Sin sesión | Portada (¿Cómo vas a usar la app? → Soy pasajero / Soy chofer) · Registro · Entrar |
| Pasajero | **Inicio** (¿hay choferes? → "¿Hacia dónde vas?" + "¿Dónde estás?" → esperando: unidades de ese sentido) · **Mi viaje** (solo con reserva activa) · **Choferes** (★, comentarios, calificar) · **Mis viajes** (R51) · **Mi carnet** (R53) |
| Chofer | **Mi viaje** (conexión, GPS, recogida actual, próximos viajes, agregar viaje) · **Mis viajes** (R50) · **Mis calificaciones** (R52) · **Mi carnet** (R53) · **Auxilio** |
| Admin | Aviso del día · Pendientes · Choferes · Pasajeros (+ ficha, restablecer PIN) |

**Mi viaje del pasajero (página aparte).** Apartar puesto es pasar de *escoger* a *acompañar* el viaje, así
que tiene su propia página (también es adonde llevan los avisos de §7):

- Al confirmar el puesto, la app abre **Mi viaje**. Mientras haya una reserva activa, **Inicio lleva a Mi viaje**
  (evita apartar otro carro por error) y el menú muestra "Mi viaje" de primero.
- Contenido, en orden: ¿tengo puesto? (puesto N de M, turno en lista de espera o pedido pendiente) → cuándo
  llega → dónde me recoge → avance del viaje → **✋ Ya estoy en el sitio** → chofer y carro → Llamar / WhatsApp
  → lista del carro → **Ya no voy**. Después: mapa en vivo (R41).
- En lista de espera: **Cambiarme a otra unidad** (R22) abre las unidades del mismo sentido con puestos libres.
- **Mi viaje dura todo el viaje, no solo la espera.** El viaje está *en curso* para el pasajero mientras su
  reserva está activa **o** va a bordo de un carro en ruta. A bordo: "Vas a bordo · En ruta hacia el Centro",
  sin "Ya no voy" ni "Ya estoy en el sitio".
- **Al terminar el viaje** (o en cuanto el chofer marca que **se bajó**, R38), Mi viaje muestra **"¿Cómo te fue
  con Pedro?"** (R45): estrellas de un toque, etiquetas y comentario opcionales, **Enviar** o **Ahora no**.
  Mientras esté pendiente (hasta 12 h después de llegar o bajarse), Inicio sigue llevando a Mi viaje. Después se puede calificar desde Choferes o Mis viajes.
- **Si otro cierra la reserva**, el pasajero vuelve a Inicio con un **aviso que explica qué pasó** (visible 30
  min, se puede cerrar): salió lleno (R14), el chofer canceló (R24), no puede pasar por ti (R29) o marcó que no
  llegaste (R21). Siempre con "Escoge otra unidad". Si lo cerró él mismo ("Ya no voy"), no hace falta aviso.

**Inicio del pasajero: preguntas en orden.** Al entrar, el pasajero quiere saber cosas en un orden; la pantalla
responde una por vez en lugar de mostrar todo junto:

1. **¿Hay choferes trabajando?** Arriba y en grande: "3 choferes trabajando ahora" o "Ningún chofer trabajando
   ahora". Sin choferes igual puede avisar que espera: es la señal que hace salir a alguien (R31).
2. **¿Hacia dónde vas? y ¿Dónde estás?** En la misma pantalla, sin hojas: los dos sentidos, sus lugares
   recientes o escribir otro, GPS opcional, y el botón **Avisar que estoy esperando**. Encima del botón, un
   resumen del sentido escogido ("2 unidades van al Centro · la próxima recoge en ~5 min") para quien solo quiere
   saber si vale la pena salir.
3. **Esperando.** "Estás esperando para ir al Centro · en Calle 3…", con **Cambiar** (sentido o lugar) y **Ya no
   estoy esperando**. Debajo, **las unidades de ese sentido**; cada una con **Apartar puesto** de un toque
   (R27). Sin unidades: "Todavía no hay unidades hacia el Centro. Te avisamos cuando venga una" (R32).
   Después: **Ver en el mapa** en cada unidad, por dónde viene el carro (R41).
4. **Apartó** → Mi viaje.

**Mi viaje del chofer (su Inicio).** El chofer usa la app **parado en la recogida o en un semáforo, con prisa y
a veces con una mano**. Por eso:

- **Una sola acción principal a la vez**, grande y fija abajo (zona del pulgar), que cambia con el estado:
  sin viaje → **Publicar viaje** · en camino → **Avisar que llego** (y "Ya llegué" directo) · llegando →
  **Ya llegué** · recogiendo → **Salir con N pasajeros** · en ruta → **Terminar viaje**.
- **Casi nada que escribir.** Publicar es tocar: sentido (dos botones; se sugiere el contrario al último viaje),
  puestos (− / +, empieza con los del último viaje) y cuándo llega ("Ya estoy aquí", 5, 10, 15, 20 min u
  "Otro"). Encima de cada sentido se ve cuánta gente espera (R10).
- **La lista es el centro de la pantalla**, en el orden justo (R17). Cada fila: número de puesto en grande,
  nombre corto, **el lugar en grande** (R25), "✋ Ya está en el sitio" (R23) y acciones de una mano: Llamar,
  WhatsApp, **Cómo llegar** si compartió GPS (R26), **No vino** (R21). La lista de espera va aparte, debajo.
- **➕ Ocupar puesto** para quien sube sin app: un toque; el nombre es opcional (R36).
- **Salir pide confirmación** y avisa quién todavía no está en el sitio ("Rosa M. no ha avisado que llegó"),
  porque al salir la lista se cierra (R14).
- **Avisar que llego** ofrece también el mensaje listo para el grupo de WhatsApp (R15).
- **En ruta:** "A bordo (N)" con **Se bajó** (R38), "Subió en el camino" (ocupar puesto) y los **pedidos en el
  camino** arriba, en rojo, con **✓ Voy / ✕ Sigo** y luego **Subió** / **No vino** (R29).
- **➕ Agregar otro viaje** (R11), debajo del viaje actual, siempre que tenga un viaje abierto. Abre el mismo
  formulario en una hoja inferior, con el sentido contrario al último viaje ya escogido. Lo que pregunta el
  tiempo depende de la situación:
  - **Con una recogida en curso** (en camino, llegando, recogiendo), el viaje nuevo queda como *próximo*
    (`programado`): "**¿Cuánto tardas en llegar a recoger después de salir?**" (15, 20, 30, 45 min, otro o a
    una hora). Arranca solo cuando sale con el actual (R12).
  - **Solo con un viaje en ruta**, el nuevo empieza ya *en camino*: "¿Cuándo llegas a recoger?" como al
    publicar el primero. Al tocar **Ya llegué** en esa recogida, el viaje en ruta se termina solo (R13).
- **Próximos viajes** debajo, uno por tarjeta plegada con su resumen ("Próximo: recoges en el Centro a las
  4:13 · 2 anotados de 4"). Al abrirla: su lista, **➕ Ocupar puesto** (R36) y **Más opciones** (puestos,
  cancelar). No tienen acción principal: empiezan solos.
- En todos los formularios de tiempo hay **"A una hora"** (R10) para quien prefiere decir "llego a las 2".
- Lo que se usa poco va en **"Más opciones"**: cambiar puestos, cancelar el viaje (con confirmación, R24).
- **Conexión** arriba: "Conectado / Desconectado" con su botón. Desconectarse con viajes publicados pide
  confirmación porque los cancela (R8).

## 9. Modelo de datos (conceptual)

`perfiles` (1:1 con `auth.users`) · `vehiculos` · `viajes` · `reservas` · `esperas` ·
`posiciones` · `alertas` + `alerta_apoyos` · `calificaciones` · `avisos`.

Punto de partida: el SQL de referencia del prototipo (`../README.md`, sección "Modelo de datos"). El esquema
definitivo, con RLS y funciones, vive en `supabase/migrations/`.

## 10. Requisitos no funcionales

- **Accesibilidad:** texto base ≥ 17 px; nada menor a 14 px; botones ≥ 52 px de alto (acción principal 60 px);
  contraste WCAG AA; **nunca texto blanco sobre amarillo**; foco visible.
- **Móvil primero:** pensado para Android de gama baja y datos móviles caros: pantallas livianas, posición del
  chofer como mucho cada 15 s.
- **Tiempo real:** lo que hace un teléfono aparece en los demás en ~1 s.
- **Sin señal:** la app abre (PWA) y muestra el último estado conocido.
- **Hora:** todas las horas en America/Caracas; el orden de las reservas lo define el reloj del servidor.

## 11. Fuera de alcance (por ahora)

- Cobro o pagos dentro de la app.
- Varias líneas o rutas distintas.
- GPS del chofer con la pantalla apagada (requeriría app nativa).
- Asignación automática de pasajeros a carros.

## 12. Preguntas abiertas

1. ¿La aprobación del admin debe **bloquear** el uso (R2) o, como en el prototipo, dejar usar con la marca
   "Sin verificar"? Se eligió bloquear; conviene confirmarlo con la línea.
2. ¿La reserva debe **vencer** si el pasajero no toca "Ya llegué" a tiempo? (El prototipo sugería medir
   cuántos "No vino" hay por viaje.)
3. ¿Conviene sugerir también los lugares más usados por **toda** la comunidad (no solo los propios, R25)?
   Decidir con el uso real.
4. ¿Hay tarifa fija que convenga mostrar?
5. ¿Quién o quiénes serán admin?
