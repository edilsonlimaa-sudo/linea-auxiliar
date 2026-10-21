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
| **Lista hacia Valle Grande** | En el tramo **Centro → Valle Grande**, la lista única de quienes esperan, por orden de llegada (R62). Cada uno dice dónde está (casi siempre Gina). Reemplaza a apartar puesto en ese sentido |
| **Aviso** | Anotarse en la Lista hacia Valle Grande diciendo dónde está ("En Gina" o el lugar que escribe): la entrada de una persona (o un grupo) |
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

- **R1. Registro.** Nombre, teléfono (WhatsApp), PIN de 6 dígitos y rol. Pasajero: dónde vive, **escrito a mano y opcional**
  (máx. 60 letras; no hay lista de urbanismos hasta tener los nombres reales, para no trabar el registro ni guardar
  datos falsos). Chofer: placa
  (obligatoria), unidad, modelo, color y si tiene **aire acondicionado** (R55). Foto de perfil y foto del carro
  **opcionales** (R54; el admin ve "Falta foto"). Cédula **opcional**.
- **R2. Aprobación [servidor].** Toda cuenta nueva queda `pendiente`. Puede iniciar sesión y ver la app, pero
  **no puede apartar, publicar ni agregar a nadie** hasta que el admin la apruebe. Ve el aviso "Tu cuenta
  está en revisión". El admin puede `aprobar` o `rechazar`; rechazado no puede operar.
  Como nadie vigila la lista de pendientes todo el día, la pantalla de revisión tiene un botón principal
  **"Avisar al administrador por WhatsApp"** que abre el chat del admin (0412-9801484) con un mensaje listo:
  nombre, rol y el pedido de aprobación. Si la cuenta fue rechazada, el mismo botón sirve para preguntar qué falta.
  **Eliminar [servidor]:** el admin puede borrar para siempre una cuenta **rechazada** (con confirmación): se van
  sus datos, sus fotos y su acceso, y el teléfono queda libre para registrarse de nuevo. Solo se puede si la cuenta
  no tiene viajes, reservas ni calificaciones en el historial (pasa si estuvo aprobada antes); en ese caso queda
  rechazada y el panel lo explica. Las cuentas pendientes o aprobadas no se borran: primero se rechazan.
  **Eliminar con historial:** si tiene historial, el panel muestra qué tiene (viajes, reservas, calificaciones) y
  ofrece un segundo paso, con su propia confirmación, para borrarlo también: se borran sus viajes como chofer (con
  sus reservas y calificaciones) y las calificaciones que dio o recibió. Sus reservas en viajes de otros choferes no
  se borran: quedan como "Cuenta eliminada", para que el historial de esos choferes siga contando bien.
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
- **R60. ¿Vuelves hoy? [servidor].** *(Oct. 2026: previsibilidad para el pasajero.)* Al tocar **Desconectarme**
  el chofer responde **"¿Vuelves a trabajar hoy?"**: **Sí, vuelvo** → "¿En cuánto?" (30 min, 1 hora, 2 horas o **a una
  hora**) · **No, terminé por hoy**. Se guarda como una **pausa** (desde, vuelve a las…, cerrada) y se responde con dos
  toques, sin escribir.
  - La hora de vuelta va de ahora a 12 h como máximo. Se muestra como **hora** ("vuelve como a las 5:30 p. m."; si cae
    al día siguiente, "mañana como a las 7:00 a. m."), nunca como "en 1 hora", que envejece en la pantalla.
  - Es una **estimación, no una promesa**: se deja de mostrar 30 min después de la hora dicha si no volvió.
    "Terminó por hoy" se muestra hasta la medianoche.
  - Al **conectarse o publicar** un viaje, la pausa se cierra sola. La desconexión automática (R9) no crea pausa:
    nadie respondió, no se muestra nada.
  - Los pasajeros lo ven donde más ayuda: en Inicio **cuando no hay unidad con puesto** ("José vuelve como a las
    5:30 p. m. · Luisa terminó por hoy") y en "La línea ahora", aparte de quienes trabajan.
  - Cada pausa queda guardada con la hora en que de verdad volvió: más adelante el panel podrá mostrar si cada chofer
    cumple lo que dice.

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
- **R61. Ida y vuelta.** *(Oct. 2026: que la vuelta se vea desde temprano sin publicarla a mano.)* La vuelta es
  siempre el **sentido contrario** con los **mismos puestos**; solo se pregunta cuándo llega a recoger. Dos momentos:
  - **Al publicar**: "¿Después recoges gente en … para volver?" → **Solo ida** (lo normal) · **Ida y vuelta** → "¿Cuánto tardas en
    llegar a recoger en … después de salir?" (15, 20, 30, 45 min). La vuelta queda encadenada como próximo viaje
    (`programado`, R11) y acepta reservas desde ya; empieza sola al salir (R12).
  - **Al salir** (`en_ruta`) **sin otro viaje publicado**: una hoja que **primero confirma la salida** ("✓ Saliste
    hacia el Centro con 3 pasajeros") y pregunta en palabras del chofer: "**¿Recoges gente en el Centro para volver a
    Valle Grande?**", con lo que gana ("Si publicas tu vuelta ahora, la gente que espera ahí ya la ve y aparta puesto
    mientras llegas"), "¿Cuándo llegas a recoger en …?" (20, 30, 45 min, 1 hora) y lo que se publicará ("Vuelta:
    Centro → Valle Grande · 4 puestos"). **Sí, publicar mi vuelta** la publica `en_camino` (como "Agregar otro viaje" en
    ruta, R11/R13); cerrar la hoja o **No, por ahora no** no hace nada y no se vuelve a preguntar. Se pregunta
    todavía parado, nunca con el carro andando. Si ya tenía la vuelta publicada, no aparece.

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
- **R56 [servidor]. Cronómetro del viaje.** Cada cambio de estado (también el estado con que se publica) queda
  guardado con su hora y lo que el chofer había prometido en ese momento (`eta_min`). Lo graba la base sola
  (trigger), sin pasos extra para el chofer. Solo el admin lo lee.
  - En el panel, cada viaje (en curso y terminado) muestra su **línea de tiempo**: hora de cada estado y cuánto
    duró cada etapa ("Recogiendo · 5 min", "En ruta · 22 min").
  - **Puntualidad:** cuando el chofer avisa que va (`en_camino`) promete llegar en `eta_min`; se compara con la
    hora en que llegó (primer `en_parada`, o `llegando` si no marcó parada): "A tiempo" (hasta 3 min tarde) o
    "N min tarde".
  - Si el chofer se saltó un estado, esa etapa no aparece; las duraciones se miden entre los estados que sí marcó.
  - Los viajes anteriores a esta regla solo tienen salida y llegada.

### 5.5 Reservas y lista justa (el corazón de la app)

> **Solo en Valle Grande → Centro.** Desde oct. 2026 (modelo híbrido), en **Centro → Valle Grande** no se aparta
> puesto: rige la **Lista hacia Valle Grande** (§5.17). Las reglas de reservas, pedidos en el camino (§5.7) y lugar (§5.6)
> aplican solo a Valle Grande → Centro.

- **R16. El pasajero escoge el carro.** No hay turno entre choferes ni asignación por orden de salida. Los
  viajes se muestran agrupados por **sentido**, primero los que tienen puestos y llegan antes.
- **R17. Orden por hora de reserva [servidor].** El puesto **no se guarda**: se calcula ordenando las
  reservas `activa`/`subio` del viaje por `creado_en`, que pone **el servidor** (`now()`), nunca el
  celular. Los primeros N tienen puesto. Así, liberar un puesto o marcar "No vino" reordena todo solo.
- **R59. Sin lista de espera [servidor].** *(Oct. 2026: la lista de espera por carro generaba ruido.)* Un carro
  lleno **no acepta más reservas**: la tarjeta dice "Lleno" y quien no consiguió puesto pide **Avísame cuando haya
  una** (R31) o escoge otra unidad. Tampoco se anota a mano a nadie con el carro lleno (R37), y el chofer no puede bajar
  los puestos por debajo de los que ya tienen reserva. Lo que en esta especificación habla de "lista de espera" o
  "turno" queda sin efecto; las reservas viejas en lista de espera, si quedara alguna, se cierran solas al salir (R14).
- **R57. Viajar acompañado [servidor].** Una reserva puede ser de **1 a 4 personas** (quien reserva y sus
  acompañantes: el esposo, un hijo, un amigo; los acompañantes no necesitan cuenta). Se pregunta **al apartar**, no
  antes: la hoja "¿Dónde te recogemos?" (R27) empieza con **¿Cuántos van?** (Solo yo · 2 · 3 · 4), con opciones solo
  hasta los puestos libres de ese carro. Lo mismo en "Avísame cuando haya una" (de 1 a 4).
  - **El grupo viaja junto:** ocupa puestos seguidos y solo se puede apartar si hay **puestos libres para todos**
    (nunca 2 de 3). Si no alcanzan: "Solo quedan 2 puestos para 3 personas".
  - **Puestos en orden (R17):** se cuentan personas, no reservas. Cada reserva ocupa del puesto *desde* al *hasta*
    según la suma de las anteriores; tiene puesto si su *hasta* ≤ puestos del carro.
  - Si no hay puestos para todos, busca otra unidad o pide "Avísame" (R59). Pedir en el camino (R28) también exige
    puestos para todos.
  - El chofer ve **"Carmen R. +2"** y sus puestos ("Puestos 2–4"); "No vino" y "Se bajó" valen para todo el grupo.
    Al anotar a mano (R36) sigue siendo de a uno.
  - La espera (R31) también dice cuántos van; la demanda que ven los choferes y el admin cuenta **personas**.
  - Al cambiarse de unidad (R22) se lleva el mismo número de personas.
- **R58.** *(Eliminada en oct. 2026.)* Apartar ya no es una solicitud que el chofer confirma: **al apartar, el
  puesto queda garantizado** (R17). Solo el pedido en el camino (R29, con el carro ya en ruta) espera la respuesta
  del chofer, sin vencimiento automático.
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

- **R25.** Al **apartar puesto** (o al pedir "Avísame cuando haya una", R31), el pasajero **escribe dónde está** (texto libre, máx. 60 caracteres,
  ej. "Entrada de Las Cayenas"). Eso es lo principal y lo que el chofer ve en grande. Para no escribir cada vez, la app
  ofrece sus **3 lugares más recientes** (de sus reservas y esperas anteriores) como opciones de un toque, con
  el último ya escogido.
- **R26 [servidor].** El **GPS es opcional**: casilla "📍 Agregar también mi GPS" (se recuerda la elección). Si
  lo agrega, el chofer tiene **Cómo llegar** (Google Maps) y **Waze**. Quien no sabe explicar dónde está
  puede mandar **solo su GPS**. Hace falta al menos uno: lugar escrito o GPS.
- **R27.** **Dónde estás se pregunta al apartar**, no antes: primero se miran las unidades sin compromiso. Al tocar
  **Apartar puesto** sube una hoja corta **"¿Dónde te recogemos?"** (lugares recientes, otro escrito, GPS) con el
  último lugar ya escogido, y **Apartar** confirma. Si estaba esperando (R31), empieza con el lugar de la espera. Se
  puede cambiar después en Mi viaje. Al cambiarse de unidad (R22) se usa el lugar de la reserva, sin preguntar.

### 5.7 Pedidos en el camino

- **R28.** Un carro `en_ruta` con puestos libres muestra **🙋 Pedir que me recoja en el camino**, con la misma hoja
  de lugar (R27). La app no valida si el lugar queda por delante: lo decide el chofer (R29).
- **R29 [servidor].** El pedido **ocupa el puesto al instante** y queda `pendiente`. Al chofer le aparece con
  aviso en rojo: **✓ Voy** (al pasajero: "va por ti") o **✕ Sigo** (se libera el puesto; al pasajero: "no
  puede pasar esta vez, escoge otra unidad"). Después marca **Subió** o **No vino**.
- **R30 [servidor].** Al terminar el viaje: pedidos aceptados → `subio`; sin responder → `rechazada`.

### 5.8 Esperando (demanda)

La espera es solo una **señal de demanda** y un **aviso al pasajero**. No hay pantalla "Esperando" para el
chofer: la reserva la hace siempre el pasajero, así la lista justa (R17) es la única forma de entrar a un carro.

- **R31.** *(Suspendida en oct. 2026: por ahora el pasajero solo ve las unidades y pide puesto; no hay "Avísame"
  ni página Esperando. La base sigue lista para volver a activarla.)* **Esperar es opcional:** el pasajero ve las unidades sin dar nada. Si no hay unidad de su sentido o
  todas van llenas, **Avísame cuando haya una** registra la espera: el **sentido** y su **lugar** (escrito y/o GPS,
  R25–R26). Los choferes ven cuántos esperan por sentido al publicar (R10) y en su Inicio ("3 personas esperan para
  ir al Centro"), y **los choferes conectados ven quién espera**: nombre corto, foto, sentido, cuántos van, el lugar,
  desde cuándo y **WhatsApp** para escribirle (*oct. 2026, pedido de los choferes: poder comunicarse con quien espera*). *Decisión (oct. 2026):* antes avisar era el primer paso de todos;
  se pierde la demanda de quien mira y se va sin avisar, a cambio de que nadie tenga que dar su lugar para mirar.
- **R32.** Al aparecer un viaje de ese sentido que acepta reservas, el pasajero que espera la ve aparecer en su página
  Esperando con **Apartar** (la hoja de lugar empieza con el de la espera, R27).
- **R33.** *(Eliminada.)* El chofer ya no agrega a su viaje a quien espera: duplicaba la reserva y saltaba el
  orden justo. Si encuentra a alguien en la calle, usa **Ocupar puesto** (R36).
- **R34.** *(Eliminada.)* "Recogido" desde la espera; lo cubre Ocupar puesto (R36).
- **R35 [servidor].** Una espera vence sola a las 2 h. También se cierra cuando la persona aparta (R18).

### 5.9 Puestos manuales (quien no usa la app)

- **R36.** **➕ Ocupar puesto** en cualquier viaje del chofer (recogida actual, en ruta o próximo). Nombre
  opcional ("Pasajero sin app").
- **R37 [servidor].** El anotado a mano entra en el **siguiente puesto libre**, y solo si hay uno (R59): antes de
  salir o en ruta ("Subió en el camino").
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
  - **Encuadre:** al abrir, nivel de calle (zoom 17; con 📍, los dos a la vista, hasta zoom 17). Después el mapa
    **sigue al carro** sin cambiar el zoom: solo se desliza cuando el carro se acerca al borde.
  - Si la persona mueve o acerca el mapa con el dedo, el mapa **deja de seguir** (respeta su zoom) y aparece
    **"Seguir al carro"** para volver a centrarlo.
  - El 🚐 se desliza a la posición nueva en vez de saltar.
  - **Hacia dónde va:** con dos posiciones a más de 15 m, el mapa calcula el rumbo. Una flecha alrededor del 🚐
    apunta en esa dirección y el 🚐 mira a la izquierda o a la derecha según el rumbo (nunca se gira de cabeza).
    Parado o con movimientos menores a 15 m, se queda el último rumbo; sin rumbo todavía, no hay flecha.
- **R42.** Una posición con más de 10 min se considera vieja y no se muestra.
  - **¿Está en vivo?** El chofer envía cada 15 s mientras tiene la app abierta. El mapa lo dice siempre, con la
    hora contando sola:
    - Última posición hace menos de 1 min: **"● En vivo"** (verde).
    - Entre 1 y 10 min: **"Sin señal · última hace N min"** (amarillo). El 🚐 se ve gris y semitransparente en la
      última posición conocida, con la explicación: "Puede que haya cerrado la app o perdido la señal".
    - Más de 10 min: desaparece (como antes): "no está compartiendo su ubicación ahora".

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

### 5.17 Lista hacia Valle Grande: el tramo Centro → Valle Grande (modelo híbrido)

*(Oct. 2026, hablado con choferes y pasajeros.)* La competencia por puesto está en la salida del Centro: ahí la
gente espera, casi siempre en la parada de **Gina**, y el que llega primero debe subir primero. En ese tramo la app deja
de apartar puestos y arma **una sola lista del tramo, por orden de llegada**: la lista no es de una parada; cada uno
dice **dónde está** y Gina es solo el lugar más común. Valle Grande → Centro sigue igual (apartar).

- **R62. Anotarse en la lista [servidor].** En Centro → Valle Grande el pasajero no escoge carro: **se anota en la
  lista del tramo** (**Anotarme en la lista**) y dice **dónde está**: **En Gina** es la opción principal, ya escogida
  (un toque); si espera en otro punto del camino, lo **escribe** ("Plaza del Indio", máx. 60) o usa su GPS. Pregunta
  **cuántos van** (1–4, R57): el grupo **sube junto o no sube**. Una sola entrada activa por persona.
  - Avisar es estar ahí: no hay "llego en 5 min". Si el GPS dice que está a más de 300 m de Gina, la app pregunta
    "¿Ya estás en Gina?" y deja seguir igual; se guarda la distancia para medir abusos.
  - El aviso **vence a los 45 min**; a los 35 pregunta **"¿Sigues ahí?"** (Sí, sigo aquí renueva sin perder el
    lugar). **Me fui** está siempre a un toque y saca a la persona de la lista al instante.
- **R63. Una sola lista, por orden de llegada [servidor].** El orden lo pone el reloj del servidor. Todos ven
  la misma lista: **nombre corto, cuántos van, dónde está** (Gina o el lugar escrito) y su posición ("Eres el 5").
  Los choferes y los pasajeros ven además **cuántos esperan en Gina** (la demanda).
  - **El pasajero la ve igual, en una franja** ("La lista · 21 personas · 15 en Gina · 6 en otro lugar") que abre la
    lista completa en una hoja, con la suya destacada; su lugar en grande va arriba ("Eres el 11").
  - **Los choferes la ven siempre, fuera de sus viajes**: es del tramo, no de un carro. En su Inicio, una franja
    "Lista hacia Valle Grande" (caras, cuántos y dónde: "En Gina: 4 · En otro lugar: 1") abre la **lista completa** en
    una hoja: posición, nombre, cuántos van, **dónde espera**, desde cuándo, teléfono (si está conectado) y "Cómo
    llegar" para los de otro lugar con GPS. Al estar en Gina (R64) o en ruta hacia Valle Grande (R67), la misma hoja
    deja subir a la gente.
- **R64. El carro en Gina: llama, guarda y sube [servidor].** El chofer sigue publicando su viaje Centro → Valle
  Grande (para que vean cuándo llega y con cuántos puestos, R10, R61); nadie aparta en él. Al tocar **Ya llegué**
  en Gina, la lista del tramo (R63) se destaca ("Estás en Gina: abre la lista") y la app arma **el plan del carro** recorriendo la lista en orden hasta
  llenar los puestos:
  - Quien está **en Gina** → "Llama a" (en orden). El chofer marca **Subió**.
  - Quien está **en el camino** y entra en el plan → **"Guarda N puestos para"** (con su lugar). Ese puesto no se
    ofrece en Gina.
  - Un grupo que no cabe en lo que queda no entra en el plan y **sigue en su lugar** para el siguiente carro.
  - **+ Subió alguien sin app** (R36) ocupa un puesto sin nombre.
  - **Dos carros en Gina a la vez:** arma su plan primero el que llegó primero; el otro arma el suyo con lo que
    sigue en la lista, sin repetir a quienes el primero ya llama o les guarda puesto.
- **R65. Quien no aparece sigue primero [servidor].** Si alguien de Gina no está al llamarlo ("viene en camino"),
  el chofer no lo marca: **conserva su lugar arriba** para el siguiente carro, y el plan ofrece ese puesto al que
  sigue en la lista. Si el chofer lo llamó y no apareció ni respondió, puede marcar **No estaba**: sale de la
  lista (cuenta para medir, como "No vino").
- **R66. Al salir, el carro se lleva a los del camino [servidor].** Al tocar **Salir**, quienes tenían puesto
  guardado en el camino quedan **vinculados a ese carro**: ven "José va por ti con tu puesto · ya salió de Gina",
  y el siguiente carro **no** les guarda puesto otra vez. Al pasar, el chofer marca **Subió** o **No estaba**.
  Los de Gina que no subieron vuelven a la lista en su lugar (R65).
  - **Que no se olvide a nadie del camino:** en Gina, el viaje muestra un aviso amarillo "Al salir, recoges en el
    camino: Carla P. · Plaza del Indio"; la confirmación de Salir lo repite ("En el camino recoges a …"); y en ruta
    **Recoge en el camino** va arriba, en amarillo, con Subió / No vino. Arriba se lee "3 pasajeros a bordo · 1 por
    recoger" (a bordo son solo los que subieron).
- **R67. Avisos del camino con el carro ya en ruta.** El chofer en ruta ve a quienes esperan **en el camino sin
  carro** (avisaron después de que salió de Gina) y, si para y tiene puesto, los marca **Subió**. Si no para,
  esperan al siguiente carro, que les guarda puesto como en R64.
- **Historial de la lista (panel).** El admin ve, además de la lista en vivo, **quién pasó por la lista y por qué
  salió**, por período (hoy, ayer, 7 días): subió en Gina o en el camino (y con qué chofer), se fue ("Me fui"), venció
  sin responder "¿Sigues ahí?", el chofer marcó "No estaba", no estaba cuando pasó el carro, canceló o se canceló el
  viaje. Con dónde esperaba, cuánto tiempo estuvo en la lista y a qué hora salió, y un resumen por motivo arriba.
- **R68. A bordo, igual que hoy.** Cada **Subió** crea un pasajero a bordo del viaje: **Se bajó** (R38),
  historial (R50–R51) y calificaciones (R44–R45) funcionan como en Valle Grande → Centro.

## 6. Privacidad: quién ve qué [servidor]

| Dato | Lo ve |
|---|---|
| Nombre corto, foto, ★, "verificado" | Cualquier usuario con sesión |
| Datos del carro (unidad, placa, modelo, color, foto) | Cualquier usuario con sesión |
| **Teléfono** de un pasajero | Su chofer mientras tiene reserva en uno de sus viajes (y 7 días después), los choferes conectados mientras espera (R31), y el admin |
| **Teléfono** de un chofer | Pasajeros con reserva en sus viajes, otros choferes y el admin |
| **Cédula** | Solo la propia persona y el admin |
| Lugar escrito y GPS de un pasajero (reserva) | Solo el chofer del viaje. La lista pública no lo muestra |
| Espera de un pasajero | Él, el admin y los **choferes conectados** (nombre corto, foto, sentido, cuántos van, lugar, desde cuándo y WhatsApp, R31). Quien también espera en el mismo sentido ve su **nombre corto y desde cuándo** (como la lista pública de un viaje), nunca el lugar |
| Lista hacia Valle Grande (R63): nombre corto, foto, cuántos van, dónde está y desde cuándo | Cualquier usuario con sesión. La **distancia** al avisar (R62), solo el admin |
| **Teléfono** de quien está en la Lista hacia Valle Grande | Los choferes conectados mientras espera (para llamarlo, R65) y el admin |
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
| Sin sesión | **Portada = Entrar** (teléfono + PIN; la mayoría ya tiene cuenta) · "¿Primera vez? Crear una cuenta" → **Registro**: recién ahí "¿Cómo vas a usar la app? Soy pasajero / Soy chofer" → formulario |
| Pasajero | **Inicio** ("¿Hacia dónde vas?" → unidades de ese sentido; "¿dónde te recogemos?" recién al apartar) · **La línea** (mapa con todos los choferes y quién trabaja) · **Mi viaje** (solo con reserva activa) · **Choferes** (★, comentarios, calificar) · **Mis viajes** (R51) · **Mi carnet** (R53) |
| Chofer | **Inicio** (demanda, publicar viaje, compañeros en la ruta; con viaje abierto: su gestión) · **Mis viajes** (R50) · **Mis calificaciones** (R52) · **Mi carnet** (R53) · **Auxilio** |
| Admin | Menú lateral: **Resumen** · Operación (**Viajes en curso** · **Demanda** · **Viajes terminados**) · Personas (**Choferes** · **Pasajeros**, cada uno con Pendientes / Aprobados / Rechazados) · Análisis (**Uso de la app**) · Aviso del día y restablecer PIN (más adelante) |

**Entrada del admin (escondida).** La portada no muestra nada del admin a pasajeros ni choferes; esconderlo es
solo para no confundir (la protección es la contraseña y el servidor). Dos caminos a `/admin/entrar`:

- **Aparato conocido:** al entrar al panel, el aparato queda marcado (cookie de 1 año). En ese aparato la portada
  muestra abajo un enlace discreto "Entrar como administrador".
- **Toque secreto:** en la portada, tocar **5 veces seguidas** (en menos de 3 s) el logo de la barra de arriba
  abre el login del admin. Sirve en un aparato nuevo o después de borrar los datos del navegador.

**Panel del admin.** El admin entra de vez en cuando (no vigila la pantalla: R2 le llega por WhatsApp), así que
lo primero es *qué necesita de mí*, después *qué pasa ahora* y al final *cómo vamos*.

**Menú lateral** (fijo en la computadora; en el celular, un cajón que abre el botón "Menú"), agrupado por tema:
- **Resumen** (el tablero).
- **Operación:** Viajes en curso · Demanda · Viajes terminados.
- **Personas:** Choferes · Pasajeros.
- **Análisis:** Uso de la app.
- Abajo: Cambiar contraseña · Modo oscuro/claro · Salir del panel.

Cada entrada muestra su contador: cuentas por aprobar en amarillo (piden acción); viajes en curso y personas esperando
en gris (informan). **Celular primero, también en la computadora:** en el celular una sola columna; desde tablet el
contenido usa el ancho de la pantalla (hasta ~1150 px) con grillas. Entrar y cambiar la contraseña siguen angostos y sin
menú (formularios).

- **Resumen** (se actualiza solo, §4), en orden:
  1. **Indicadores:** choferes conectados · viajes en curso · pasajeros esperando · viajes terminados hoy · pasajeros
     llevados hoy · ★ de los últimos 7 días. Cada uno lleva a su página.
  2. **Requiere atención** (solo si hay algo): cuentas por aprobar (choferes y pasajeros, cada una a su lista) y cada
     sentido donde **falta transporte** (esperan más que los puestos libres), con enlace a Demanda. Sin nada:
     "Todo en orden".
  3. **En la ruta ahora:** cada chofer conectado con qué está haciendo (estado y sentido de su viaje actual, puestos
     ocupados; "Conectado, sin viaje" si no tiene) y **Ver en el mapa** (R41, "Dónde está X"). Enlace a Viajes en curso.
     El mapa también está en su tarjeta de Choferes mientras está conectado.
  4. **Esperando ahora:** por sentido, cuántos esperan contra los puestos libres; las 3 personas que más llevan
     esperando; y la demanda de hoy (pedidos, consiguieron puesto, se fueron sin transporte). Enlace a Demanda.
  5. **Uso de la app (últimos 7 días)**, de los pasajeros llevados en viajes terminados (subió o se bajó antes):
     - **Cómo entraron al carro:** por la app (apartó puesto), por la app en el camino (R28) o **anotados a mano**
       por el chofer (R36), con el % que usó la app y una barra.
     - **Pasajeros identificados:** cuántas personas distintas viajaron con su cuenta, cuántas **repiten** (2 o más
       viajes en el período) y cuántas viajaron **por primera vez**.
     - Enlace **Ver detalle** → página **Uso de la app**: filtro 7 · 30 · 90 días, los mismos números, la
       comparación **por chofer** (app / en el camino / a mano, para ver quién todavía anota mucho a mano) y la
       **lista de pasajeros identificados**: foto, nombre, viajes en el período, último viaje y "Nuevo" si su primer
       viaje fue en el período. Primero quien más viaja.
  6. **Comunidad:** choferes y pasajeros aprobados, y cuántos se registraron en los últimos 7 días.
- **Viajes en curso** (se actualiza sola): un bloque por chofer
  con viajes abiertos, primero quien va en ruta. Arriba el chofer (foto, nombre, placa, unidad, conectado) y
  **Ver en el mapa** (R41). Por cada viaje: sentido, estado ("En ruta hacia el Centro, salió a las 7:40" /
  "Recoge en Valle Grande en ~5 min" / "Próximo viaje"), puestos ocupados de cuántos, y la gente separada en
  **A bordo**, **Por recoger** (con dónde y "✋ ya está en el sitio"), **Pedidos en el camino** y **Lista de espera**.
  Cada persona con nombre completo, dónde la recogen, WhatsApp y Llamar. Solo lectura: el admin no cambia listas.
- **Viajes terminados**: los
  viajes finalizados de toda la línea, del más reciente al más viejo, con filtro **Hoy · 7 días · 30 días**
  (máx. 100). Arriba, el total del período: viajes, pasajeros llevados y ★ promedio. Cada viaje, plegado como en
  Mis viajes del chofer (R50): chofer y placa, sentido, salida y llegada, duración, a quién llevó (nombre completo y
  cómo entró), quién no vino y sus calificaciones. A diferencia del chofer (R52), el admin sí ve quién calificó.
- **Demanda** (para organizar la operación; se actualiza sola, §4). El admin sí ve quién espera y dónde (§6):
  1. **Por sentido** (Al Centro / A Valle Grande): cuántos esperan, cuántas unidades aceptan pasajeros con cuántos
     puestos libres, y si **falta transporte** (esperan más que los puestos libres) o está cubierto.
  2. **Quién espera**, por sentido y primero quien lleva más tiempo: foto, nombre, "espera hace N min" (en
     amarillo desde 20 min), dónde (texto) y **Ver ubicación** si compartió GPS (abre el mapa del teléfono),
     WhatsApp y Llamar. Solo esperas activas de las últimas 2 h (R35).
  3. **Hoy** (hora de Caracas): pedidos, cuántos consiguieron puesto, cuántos se fueron sin transporte (la
     espera venció), cuántos cancelaron y la espera promedio hasta conseguir puesto.
- **Choferes:** la tarjeta destaca el carro (foto, placa, unidad, aire) y su actividad: conectado ahora, viajes
  terminados, ★ promedio y último viaje.
- **Pasajeros:** la tarjeta destaca la foto y dónde vive, y su actividad: viajes hechos y último viaje.
- Cada lista tiene sus pestañas Pendientes / Aprobados / Rechazados y las acciones de R2 (aprobar, rechazar,
  eliminar), WhatsApp y Llamar.

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

**Pasajero: una intención por pantalla.** Quien abre la app quiere una de tres cosas, y cada una tiene su lugar:
**viajar ahora** (Inicio, casi siempre), **ver cómo está la línea y por dónde van los carros** (La línea, a veces, antes
de salir de casa) y **acompañar su viaje** (Mi viaje, con reserva). Lo demás (Choferes, Mis viajes, Mi carnet) está
en el menú. *(Oct. 2026: antes Inicio mezclaba todo — lista de choferes, mapas, unidades, atajos — y el mismo chofer
aparecía dos veces.)*

**Inicio del pasajero = "quiero viajar".** Mirar primero, comprometerse después: el lugar y cuántos van se preguntan
recién al apartar (R27, R57). Una pregunta, una respuesta, una acción:

1. **Bloque principal** (azul de la línea, como Esperando): el saludo chico y la pregunta en grande **¿Hacia dónde
   vas?**, con los dos sentidos ahí mismo (Al Centro / A Valle Grande, cada uno con cuántas unidades van). Empieza en el
   sentido sugerido por la hora y dónde vive; cambiarlo es un toque. Abajo, una franja con **las caras de quienes
   trabajan** y "2 choferes trabajando · Cómo está la línea ›" (o "Ningún chofer trabajando ahora"). Más el aviso del
   día. Tocar la franja abre **La línea ahora** (hoja): la toca casi siempre quien **no ve unidades en su sentido** y
   quiere entender la situación. Por cada chofer conectado: foto, nombre, ★, placa y ❄️; **qué hace ahora** (sentido
   como etiqueta y "En ruta hacia el Centro" / "Recoge en Valle Grande en ~5 min" / "Disponible, sin viaje"); **cuántos
   lleva** ("3 de 4 · 1 libre" / "Lleno"); **qué viene después** ("Después: recoge en Valle Grande a las 3:40", o "Sin
   próximo viaje publicado") y el **mapa** (R41). Primero los que tienen un viaje hacia el sentido escogido.
2. **Unidades al Centro** con cuántas son y el orden explicado ("la que recoge primero, arriba", R16).
3. **Cada unidad, una tarjeta** corta y fácil de comparar: el **estado** como etiqueta ("Recogiendo ahora", "Próximo
   viaje", "En ruta"), **cuándo recoge** en grande, **puestos** con etiqueta ("2 libres" / "Lleno"), **quién maneja**
   (foto, nombre, ★, placa) y **Apartar puesto** (o pedir en el camino; lleno, sin botón, R59) con el **mapa** al lado
   (R41). La primera con puesto lleva **"Recoge primero"**. Foto del carro y aire, al abrir "Ver chofer y carro".
   Al apartar sube la hoja "¿Dónde te recogemos?" (R27, con ¿Cuántos van?, R57) → Mi viaje.
4. **Sin unidades** de ese sentido, o todas llenas: una tarjeta que lo dice ("Ahora no hay unidades al Centro" /
   "Todas van llenas por ahora") y que la pantalla se actualiza sola. Sin "Avísame" por ahora (R31 suspendida).

**Esperando (página aparte).** *(Suspendida con R31.)* Esperar es un estado, como tener un viaje: tiene su propia página y **el sentido queda
fijo** (para ir al otro lado, primero "Ya no estoy esperando"). Mientras haya una espera activa, **Inicio lleva a
Esperando** y el menú muestra "Esperando" de primero. Es una pantalla de **estado**, no una lista de secciones: arriba
dice dónde está la persona en el proceso y todo lo demás cuelga de eso.
1. **Estado** (bloque destacado, azul de la línea): "Esperando unidad" con un pulso, **hacia dónde** en grande, el
   lugar y desde cuándo, y dos acciones secundarias: **Cambiar lugar** y **Dejar de esperar**.
2. **Los pasos**, para saber qué sigue: ✓ Avisaste → **Buscando unidad** (o **¡Hay unidad!**) → Apartas tu puesto.
3. **La unidad**: mientras no hay, un bloque "buscando" con la silueta de una tarjeta que late y "Te la mostramos
   apenas salga; esta pantalla se actualiza sola". Al aparecer: "¡Ya hay una unidad a Valle Grande!" y sus tarjetas,
   cada una con Apartar (la hoja empieza con el lugar de la espera, R27) y el mapa.
4. **Esperan contigo**: las iniciales de quienes esperan en el mismo sentido, una junto a otra, con "3 personas
   esperan a Valle Grande" y sus nombres cortos y desde cuándo (§6; la propia marcada "Tú"); y que los choferes ven
   ese número. Así se sabe que no se espera solo y que la demanda se nota.
Al apartar → Mi viaje. La espera vence sola a las 2 h (R35): vuelve a Inicio.

**La línea = "¿cómo está la línea?"** (página `/linea`; ya no está en el menú: la situación de la línea se ve en la hoja "La línea ahora" de Inicio; se actualiza sola):
- **Un mapa con todos los choferes** que comparten su ubicación: cada 🚐 con su nombre, la flecha de hacia dónde va
  y gris si está sin señal (R41–R42). Al abrir encuadra a todos.
- Debajo, **quién está trabajando**: foto, nombre, ★, placa y unidad, ❄️, qué hace ahora ("En ruta hacia el Centro",
  "Disponible") y si comparte ubicación. Tocar uno lo centra en el mapa. Más el aviso del día.
- Sin choferes: "Ningún chofer trabajando ahora".

Quien pidió **Avísame cuando haya una** pasa a la página **Esperando** (§8): el sentido queda fijo mientras espera.

**Inicio del chofer.** El chofer usa la app **parado en la recogida o en un semáforo, con prisa y a veces con una
mano**. Principio: **lo normal se ve discreto, lo que pide acción se ve claro, el resto queda a un toque.**

**Sin viajes ("¿salgo ahora?"):**

1. **Bloque principal** (azul de la línea, como el del pasajero): saludo, el **estado** en una etiqueta (Conectado /
   Desconectado) y la acción principal **Publicar un viaje** (abre el formulario en una hoja, con el sentido
   contrario al último viaje ya escogido).
2. **Compañeros en la ruta** en una franja: sus caras y "2 compañeros trabajando ›". Tocarla abre la lista (quién
   y qué hace, R7) y **tocar un compañero** abre su detalle: foto, nombre, ★, placa, unidad y ❄️; **qué hace ahora**
   (sentido, estado, "lleva 3 de 4"); **sus próximos viajes** (sentido y hora); el **mapa** (R41) y **WhatsApp** /
   **Llamar** (§6). Sin nombres de pasajeros. Mis viajes y Mis calificaciones están en el menú.

**Con un viaje abierto ("¿qué hago ahora y a quién recojo?"):**

- **Estado en una línea** arriba: "● Conectado · Ubicación activa". Tocarla deja desconectarse (con confirmación si
  cancela viajes, R8) después de "¿Vuelves a trabajar hoy?" (R60). Solo si el GPS falla se vuelve un aviso amarillo con "Intentar de nuevo" (R40).
- **Una sola acción principal a la vez**, grande y fija abajo (zona del pulgar), que cambia con el estado:
  en camino → **Avisar que llego** (y "Ya llegué" directo) · llegando → **Ya llegué** · recogiendo → **Salir con N
  pasajeros** · en ruta → **Terminar viaje**.
- **El viaje en foco**: ruta, qué hace ahora en grande ("Recogiendo en Valle Grande") con su detalle, una **barra de
  pasos** (En camino · Llegando · Recogiendo · En ruta) en vez de más texto, y los puestos dibujados ("3 de 4").
- **La lista es el centro**, en el orden justo (R17): **una fila por reserva**, corta: puesto en grande ("2–4" si es
  un grupo), nombre corto (+ acompañantes), **el lugar** (R25) y "✋ En el sitio" (R23). **Solo la acción del
  momento** va en la fila: pedido en el camino → ✓ Voy / ✕ Sigo (R29, en rojo, arriba); en ruta → Subió / No vino
  y Se bajó (R38); recogiendo → No vino (R21). **Llamar, WhatsApp, Cómo llegar y Waze** van detrás de un botón de
  contacto en la fila (una hoja), para no llenar la pantalla de botones.
- **➕ Ocupar puesto** (R36) y **Opciones** (puestos, cancelar con confirmación, R24) van chicos, lado a lado, al pie
  del viaje.
- **Salir pide confirmación** y avisa quién todavía no está en el sitio, porque al salir la lista se cierra (R14).
  **Avisar que llego** ofrece también el mensaje listo para el grupo de WhatsApp (R15).
- **Próximos viajes** debajo, plegados con su resumen ("Próximo: recoges en el Centro a las 4:13 · 2 de 4"). Al
  abrir: su lista y sus opciones. Empiezan solos (R12).
- **➕ Agregar otro viaje** (R11), debajo de los próximos. Lo que pregunta el tiempo depende de la situación:
  - **Con una recogida en curso**, el nuevo queda como *próximo* (`programado`): "**¿Cuánto tardas en llegar a
    recoger después de salir?**" (15, 20, 30, 45 min, otro o a una hora). Arranca solo al salir con el actual (R12).
  - **Solo con un viaje en ruta**, empieza ya *en camino*: "¿Cuándo llegas a recoger?". Al tocar **Ya llegué** en
    esa recogida, el viaje en ruta se termina solo (R13).
- **Publicar es tocar:** sentido (dos botones), puestos (− / +) y cuándo llega ("Ya estoy aquí", 5, 10, 15, 20 min,
  "Otro" o **"A una hora"**, R10).
- **Compañeros** en la misma franja, al final.

*(Oct. 2026: con R31 suspendida no hay "¿Hay gente esperando?", ni "Ver quién espera", ni cuántos esperan al
publicar.)*

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
