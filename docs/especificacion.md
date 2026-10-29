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
| **Lugar** | Dónde recoger al pasajero: **texto libre** que él escribe (ej. "Entrada de Las Cayenas"). No hay paradas registradas (ver §4) |
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
| Dónde recoger | **Texto libre, sin GPS ni paradas registradas.** Así se coordina hoy en el grupo ("estoy en la entrada de Las Cayenas"); una lista fija obliga a escoger la parada "más cercana" y el chofer va al sitio equivocado, y además habría que mantenerla |

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
- **R4. PIN olvidado [servidor].** No hay recuperación automática: en el detalle de la cuenta, el admin toca
  **Restablecer PIN** y confirma; la app genera un **PIN temporal** de 6 números al azar, que el admin ve **una sola vez**
  (no se guarda en ningún lado) y le manda por WhatsApp con un botón. El PIN anterior deja de servir y se cierran las
  sesiones abiertas de esa cuenta. Al entrar con el temporal, antes de ver cualquier otra pantalla, la persona **escoge
  su PIN** (6 números, dos veces, distinto del temporal); hasta que lo haga, toda pantalla la lleva ahí.
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
  hora**) · **No, terminé por hoy**. Se guarda como una **pausa** (desde, vuelve a las…, cerrada) y se responde con uno o
  dos toques, sin escribir.
  - **La hora es opcional** *(Oct. 2026: prometer una hora y no cumplirla es peor que no decirla)*: con **Sí, vuelvo** el
    botón Desconectarme ya se habilita. Sin hora, los pasajeros ven **"vuelve más tarde"** hasta la medianoche; quien
    quiere dar previsibilidad escoge la hora.
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
- **R69. El admin cierra viajes y desconecta choferes [servidor].** *(Oct. 2026: viajes muertos y choferes que avisan
  que no pueden seguir.)* Con confirmación:
  - **Cerrar viaje** (en cada viaje de Viajes en curso): si todavía no salió, se **cancela** (como cuando cancela el chofer, R24); si va **en ruta**, se
    **termina**: quienes ya subieron quedan como viaje hecho y quienes faltaba recoger quedan **sin puesto**. Se
    promueve el siguiente viaje de la cadena, como siempre (R12).
  - **Desconectar** (en Viajes en curso, también en **"Conectados sin viaje"**; en "En la ruta ahora" del Resumen y en
    la tarjeta de Choferes de quien está conectado): **tenga o no viajes**, cierra **todos** sus viajes abiertos (también el que va en ruta, que el chofer no puede cerrar
    desconectándose, R8) y lo desconecta con "terminó por hoy" (R60).
  - **Nadie de la lista hacia Valle Grande pierde su lugar:** quien estaba ligado al carro (del camino, R66) o subió
    en Gina en un viaje que no llegó a salir **vuelve a la lista en su mismo lugar**, con 30 min para que lo busque otro
    carro. Esto vale también cuando el chofer cancela o se desconecta.
  - Al pasajero con puesto se le explica en Inicio ("Tu viaje se canceló" o "Tu viaje se cerró sin pasar por ti").

### 5.3 Publicar viajes y cadena

- **R10.** Al publicar, el chofer elige solo el **sentido** (se muestra cuánta gente espera en cada sentido),
  **puestos** (1–8) y **cuándo llega a la zona de recogida**: "Ya estoy aquí", botones rápidos (5/10/15/20 min),
  cualquier número de minutos (1–240) o **una hora fija** (ej. 14:00; si esa hora ya pasó hoy, es la de
  mañana). **El sentido nunca viene escogido** *(Oct. 2026: choferes publicaban hacia el lado equivocado por no mirar
  la opción ya marcada)*: hasta que toca **Al Centro** o **A Valle Grande**, no se publica.
- **R11. Cadena.** Mientras va en ruta (o con una recogida en curso), puede **agregar todos los viajes que
  necesite** ("➕ Agregar otro viaje"). El sentido tampoco viene escogido aquí (R10). Los
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
    ruta, R11/R13). *(Desde R73 ya no hay "No, por ahora no": la hoja pregunta qué hace después.)* Se pregunta
    todavía parado, nunca con el carro andando. Si ya tenía la vuelta publicada, no aparece.
- **R73. ¿Qué haces después? (se pregunta una vez).** *(Oct. 2026: choferes salían sin publicar la vuelta y el pasajero no sabía
  si iban a volver.)* Reemplaza el "No, por ahora no" de R61. Al salir (`en_ruta`) **sin otro viaje publicado**, en los dos
  sentidos, la hoja pregunta **"¿Qué haces después de este viaje?"** con tres respuestas:
  - **Sigo trabajando: publico mi vuelta** → "¿Cuándo llegas a recoger en …?" (20, 30, 45 min, 1 hora), como en R61.
  - **Hago una pausa** → "¿A qué hora vuelves?" (30 min, 1 hora, 2 horas o **a una hora**, como R60).
  - **Es mi último viaje de hoy.**
  - **Se pregunta una sola vez por viaje** *(Oct. 2026: "acabo de tocar la X para no publicar otro y ya me sale de
    nuevo")*: la hoja se abre sola al salir; **cerrarla (✕) es "ahora no"** y ese viaje no vuelve a preguntarlo: ni
    tarjeta en el foco, ni botón amarillo fijo, ni al tocar **Terminar** (que termina sin preguntar). Si la hoja no llegó
    a verse (recargó la app), el foco muestra la pregunta una vez, también con **✕ Ahora no**. Lo que quiera hacer
    después sigue a mano sin empujar: **Agregar otro viaje** al final de Inicio y, al desconectarse, "¿Vuelves hoy?"
    (R60). Ya respondido, el viaje dice "Después: pausa, vuelves como a las 4:30" / "Es tu último viaje de hoy", con
    **Cambiar**.
  - **[servidor]** Se guarda en el viaje (`despues`: pausa con su hora, o último). Publicar cualquier viaje mientras va
    en ruta lo cambia a **vuelta** (cambió de idea). Al **terminar** el viaje con pausa o último, y sin otro viaje
    abierto, queda **desconectado** con la pausa de R60 (vuelve a las… / terminó por hoy).
  - Los pasajeros lo ven en **La línea ahora**: en vez de "Sin próximo viaje publicado", "Después hace una pausa:
    vuelve como a las 4:30" o "Es su último viaje de hoy". Al terminar, como cualquier pausa (R60).
  - En el panel (**Viajes terminados**), cada viaje dice qué avisó: publicó la vuelta, pausa hasta tal hora o último
    del día.
- **R71. Terminar viaje, sin apuro.** *(Oct. 2026: choferes terminaban el viaje a 1 min de salir, por el mismo botón
  donde acababan de tocar Salir o creyendo que hacía falta para publicar la vuelta; sus pasajeros quedaban calificando
  con el carro andando y él se veía libre.)* **Terminar viaje** sigue siendo la acción principal en ruta, pero:
  - Si lo toca antes de **10 min** desde que salió, se confirma: "Saliste hace 1 minuto. ¿Ya dejaste a todos en …?" →
    **Sí, terminar** · **No, sigo en ruta** (la opción segura en amarillo y con el foco). La confirmación recuerda que no hace falta
    terminar para publicar la vuelta. Después de 10 min termina directo.
  - Debajo del botón, una línea lo aclara: "No hace falta terminar para publicar tu vuelta: este viaje se termina solo
    al tocar Ya llegué en tu próxima recogida" (R13). Con la vuelta ya publicada: "Este viaje se termina solo al tocar
    Ya llegué en tu próxima recogida".

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
| `en_ruta` | Va hacia el destino | **Terminar viaje** (confirma si salió hace menos de 10 min, R71) |
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
    Al anotar a mano (R36) también se dice cuántos van.
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
- **R72. Por qué se cancela [servidor].** *(Oct. 2026: los choferes cancelaban mucho y no se sabía por qué.)*
  - Al cancelar, el chofer escoge **por qué**, con un toque: **Quiero cambiar la hora** · **Me equivoqué al publicar**
    · **No había nadie para recoger** · **Se llenó por fuera de la app** · **Problema con el carro** · **Terminé por hoy
    / no puedo seguir** · **Otra razón** (con un campo opcional, máx. 120). El motivo es obligatorio en la app.
  - Dos motivos tienen otra salida, sin cancelar: con **Quiero cambiar la hora**, si va a recoger (`en_camino`), se
    sugiere **Me atraso** (R70: nadie pierde su puesto); con **Me equivoqué al publicar**, que los puestos se cambian
    arriba en la misma hoja. Puede cancelar igual.
  - Todo cierre que no sea el normal guarda **quién** lo hizo: el chofer al cancelar, el chofer al desconectarse (R8),
    el admin al cerrar el viaje o al desconectar al chofer (R69).
  - Solo lo ven el **admin** y el chofer de ese viaje. En **Viajes terminados** (§8) cada cancelado dice quién y por qué,
    y con el filtro **Cancelados** arriba se cuentan los motivos del período.

### 5.6 Dónde recoger al pasajero

- **R25.** Al **apartar puesto** (o al pedir "Avísame cuando haya una", R31), el pasajero **escribe dónde está** (texto libre, máx. 60 caracteres,
  ej. "Entrada de Las Cayenas"). Eso es lo principal y lo que el chofer ve en grande. *(Oct. 2026: sin los lugares
  recientes de un toque; la hoja muestra **solo el campo de texto**. Al cambiar el lugar en Mi viaje, el campo empieza
  con el lugar actual.)*
- **R26 [servidor]. Sin GPS del pasajero: el lugar escrito es obligatorio.** *(Oct. 2026: antes había una casilla
  "Agregar mi ubicación GPS" y bastaba el GPS solo. Se quitó porque hacía creer que el chofer iba a buscar a cada
  uno donde estaba; el carro pasa por la ruta y el pasajero dice en qué punto de ella espera.)* Al apartar, al cambiar
  el lugar y al anotarse en otro punto del camino (R62) hace falta el texto. Lo que ya se guardó con GPS se sigue
  mostrando al chofer como antes.
- **R27.** **Dónde estás se pregunta al apartar**, no antes: primero se miran las unidades sin compromiso. Al tocar
  **Apartar puesto** sube una hoja corta **"¿Dónde te recogemos?"** (solo el lugar escrito) con el
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

- **R94. Avísame cuando haya un carro al Centro [servidor].** *(Oct. 2026: en el sentido Al Centro el pasajero solo
  veía algo si ya había viajes; quien no encontraba carro se iba sin dejar rastro. Solo en la interfaz nueva, que tiene
  los avisos en el celular, R90. Usa las esperas de R31, sin pedir el lugar.)* En **Al Centro**, cuando no hay ningún
  carro con puesto, la pantalla ofrece, **discreta y en una línea** debajo de los carros, **¿Te avisamos cuando salga un
  carro?** con **Avísame** y una ✕ para cerrarla (cerrada no vuelve a salir en ese celular por 12 h). **La Línea fija el
  tiempo: 2 horas**; la persona no escoge (*oct. 2026: preguntar cuánto tiempo era una decisión de más*). Mientras
  espera, la línea solo lo confirma ("Te avisamos hasta las 3:40 p. m."), **sin botón para cancelar**: pedido es
  pedido, vence solo. Reglas para no molestar a nadie:
  - **Un pedido, un aviso:** llega una sola vez, con el primer viaje al Centro que se publique **con puesto** mientras
    el pedido vale; después ya no llega nada más. Si se le escapa, lo pide otra vez.
  - **Vence solo** a las 2 horas, sin aviso. Un viaje con **hora fija** después de esa hora no avisa.
  - Se cierra solo si la persona **aparta puesto** (R35); un pedido activo por persona.
  - El aviso llega al celular si activó los avisos (R90): "Hay un carro al Centro", quién va y cuándo llega a recoger;
    tocarlo abre Al Centro. Sin avisos activados, lo ve al abrir la app. Un chofer de prueba solo avisa a cuentas de
    prueba (R91).
  - Nadie más ve quién pidió aviso (ni los choferes); el admin, sí. *(Mostrar a los choferes cuántos esperan queda para
    después.)*
- **R31.** *(Suspendida en oct. 2026: por ahora el pasajero solo ve las unidades y pide puesto; no hay "Avísame"
  ni página Esperando. La base sigue lista para volver a activarla. Desde R94, las esperas vuelven solo como aviso al
  Centro de la interfaz nueva; "quién espera" con teléfono para los choferes sigue apagado.)* **Esperar es opcional:** el pasajero ve las unidades sin dar nada. Si no hay unidad de su sentido o
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
- **R35 [servidor].** Una espera vence sola a las 2 h (el aviso de R94 también). También se
  cierra cuando la persona aparta (R18).

### 5.9 Puestos manuales (quien no usa la app)

- **R36.** **➕ Ocupar puesto** en cualquier viaje del chofer (recogida actual, en ruta o próximo). Pregunta primero
  **¿Dónde lo recoges?** (el lugar, máx. 60) y **cuántos van** (1–4, R57); el **nombre** es opcional, debajo. Nada es
  obligatorio: un toque basta. *(Oct. 2026: los choferes escribían el lugar en el campo del nombre, "Entrada
  Frailejones"; lo que necesitan es saber dónde recoger, no cómo se llama.)* En la lista del chofer, quien se anotó
  sin nombre se ve por su lugar, con "Sin app".
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
- **R70. "Me atraso": una hora nueva [servidor].** *(Oct. 2026: que el pasajero vea siempre una previsión real.)*
  Mientras va a recoger (`en_camino`), el chofer puede tocar **Me atraso** y escoger en cuánto llega ahora, con un
  toque: 5, 10, 15, 20, 30, 45 min o 1 hora (cada opción muestra la hora: "15 min · a las 5:40").
  - **Si pasa la hora que dijo**, su viaje lo avisa en amarillo ("Ya pasó la hora que dijiste: tus pasajeros ven «en
    cualquier momento». Dales una hora nueva") con el botón **Me atraso** a mano. Antes de esa hora el botón está,
    más discreto.
  - El pasajero ve la hora nueva ("Recoge en Valle Grande en ~15 min · a las 5:40 · avisó que se atrasa"). Los viajes
    encadenados se corren solos.
  - La **puntualidad** (R56) sigue comparando con lo **primero** que prometió; la línea de tiempo del panel muestra
    cada aviso de atraso con su hora nueva.

### 5.11 Ubicación del chofer (mapa en vivo)

- **R40.** Con el chofer conectado y con viajes, su teléfono envía la posición como mucho cada **15 s** (o al
  moverse más de 30 m). El chofer ve "📡 Tus pasajeros ven por dónde vas" o un aviso si falta permiso. Solo
  funciona **con la app abierta y la pantalla encendida** (límite de una web app, §11); el chofer lo ve dicho.
- **R92. Recorrido de los viajes [servidor].** *(Oct. 2026: para ver la ruta de verdad, sus variantes, el tiempo de
  cada tramo y dónde para la gente.)* Solo si el admin lo **enciende** en el panel (Análisis → **Rutas**, "Grabar
  recorridos"; apagado por defecto). En esa misma pantalla, un **mapa** dibuja **todo el recorrido grabado**: lo que va
  de la salida a la llegada de un viaje, del color de su sentido (donde se juntan muchas líneas está la ruta principal), y
  lo que no es en ruta (recoger, ir a la parada, volver vacío) en gris punteado; cada punto
  grabado se ve como un puntito, y **flechitas** a lo largo de cada línea dicen hacia dónde iba el carro (a la misma
  distancia en la pantalla con cualquier zoom). La línea se corta donde el GPS dejó de grabar más de 2 min (no se inventa el tramo) y
  se descartan los puntos imprecisos (más de 50 m) y los saltos imposibles (más de 150 km/h). Filtros de período,
  sentido (escoger uno deja solo sus viajes), chofer y "Todo el recorrido / Solo viajes"; tocar una línea dice de quién es, cuándo
  fue y cuánto duró. **Debajo del mapa, "En orden"**: los mismos tramos como bloques, por día (el más nuevo primero y
  abierto) y por chofer, en el orden en que pasaron: tipo (sentido o fuera de un viaje), de qué hora a qué hora, cuánto
  duró, cuántos puntos y cuántos km; entre dos bloques, cuánto tiempo estuvo **sin GPS**. Los bloques de un mismo **viaje** van dentro de un **marco punteado** con el viaje, sus horas y cuándo salió.
  Sale de los registros del viaje, sin adivinar nada por el GPS: el viaje empieza cuando el chofer **empieza a recoger**
  (la primera vez que toca Ya llegué; sin ese registro, cuando sale) y termina cuando lo termina o lo cancela. Lo gris
  dentro del marco es **Recogiendo** (de Ya llegué a Salir); lo de fuera de todo marco (ir a la parada, volver vacío,
  sin viaje) es fuera de un viaje. Tocar el encabezado del marco (**Ver en el mapa**) deja en el mapa **solo ese
  viaje**, con todos sus bloques resaltados, y lo encuadra; arriba del mapa un aviso lo dice, con **Ver todo**. Igual con
  cada bloque: tocarlo deja en el mapa **solo ese bloque**, con su popup. Tocarlo otra vez, o Ver todo,
  vuelve a mostrar todo. Los bloques de **fuera de un viaje** traen una casilla. **Ver en el mapa** de los viajes y las casillas **se suman**:
  el mapa muestra solo lo marcado, todo resaltado junto, para comparar (por ejemplo, un viaje y lo que el chofer hizo antes
  y después: "Solo se ven el viaje a Valle Grande (9:29 – 9:52) y 2 bloques fuera de un viaje"); tocar otra vez un
  encabezado o una casilla lo saca. Entre los bloques, en su hora, cada **desconexión** del chofer (tocó Desconectarme, R60):
  qué dijo ("dijo que vuelve 12:01 p. m." o "terminó por hoy") y qué pasó ("Volvió 12:37 p. m. (2 h 23 min después) · 35 min
  tarde", "Sigue desconectado", "No volvió ese día", o "Lo cambió enseguida" si se volvió a desconectar en menos de 1 min);
  el día cuenta sus desconexiones. No van al mapa. Tocar una línea en el mapa la escoge sin esconder nada. **En la computadora** el mapa y la lista van **lado a lado**, del alto de la ventana: la lista rueda sola y el mapa nunca sale de la vista (el aviso de lo que se ve va encima del mapa); **Ocultar** recoge la lista para que el mapa tome todo el ancho ("Ver la lista" la vuelve a abrir; se recuerda en ese navegador). En el celular, uno debajo del otro. Tocar un bloque lleva el mapa
  a ese tramo y lo resalta con su popup; tocar una línea en el mapa marca su bloque. Mientras comparte la posición (R40), el teléfono del chofer también **guarda cada punto
  en el teléfono** (IndexedDB, sobrevive a cerrar la app) y los sube **en lotes**: cada ~100 puntos (unos 25 min), al
  salir de la app o dejar de compartir (sin viajes), y al abrirla si quedó algo pendiente (sin señal, se reintenta
  después). Un punto ya guardado no se guarda dos veces. Cada lote queda con el chofer y su hora; a qué viaje pertenece
  se sabe cruzando la hora con sus viajes. Solo el admin lo ve; se borra a los **60 días**. Con la grabación encendida,
  el chofer lo ve dicho donde se habla de su ubicación: "También guardamos tu recorrido para mejorar la línea; solo lo
  ve la administración."
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
  ahí mismo. En la interfaz nueva van **por día** (Hoy, Ayer, fecha) y, si hay sin calificar, un aviso arriba dice
  cuántos; sin viajes, la pantalla explica qué va a aparecer ahí y lleva a buscar un carro.
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
  - **Dónde se ven:** la del chofer en las unidades y en Mi viaje; **la del carro en Mi viaje** (plegada, a un
    toque: "Ver el carro"), para reconocerlo al llegar; la de cada pasajero en la lista del chofer; ambas en el panel del admin y en el carnet. Sin foto,
    las iniciales.
  - **[servidor]** Bucket privado: cada uno sube solo a su carpeta; las ven solo usuarios con sesión.
  - **Una dirección fija por foto** *(Oct. 2026: el tráfico de Storage pasaba el plan gratis)*: la app las sirve en
    `/foto/<carpeta>/<archivo>`, que pide sesión y deja al teléfono guardarla (privada, sin vencer: el nombre del
    archivo cambia cuando la persona cambia la foto). Antes eran enlaces firmados de 1 h que cambiaban en cada
    actualización de la pantalla, y el teléfono volvía a bajar todas las fotos cada vez.
- **R74. Pago Móvil del chofer [servidor].** *(Oct. 2026: los pasajeros preguntaban los datos en cada viaje.)*
  - El chofer registra en **Mi carnet** su Pago Móvil: **banco** (de la lista de bancos, con su código), **teléfono** y
    **cédula** (la app sugiere los suyos). Es opcional; lo cambia o lo quita cuando quiera.
  - **Quién lo ve:** el pasajero con reserva activa o a bordo en un viaje de ese chofer, y hasta **3 h** después de
    bajarse o de terminar el viaje; el admin y el propio chofer. Nadie más (lleva la cédula).
  - **Dónde:** en **Mi viaje** (a bordo, a la vista; esperando el carro, plegado: "Pago Móvil del chofer") y en
    **"¿Cómo te fue?"** al terminar. **En la interfaz nueva (§5.21), solo a bordo**, en Mi viaje *(Oct. 2026: aparecía en
    momentos en que no hay que pagar; la clásica sigue igual)*. **Copiar todo** es la acción principal, arriba y grande: los tres datos, uno por
    línea, para usar el **Pegar** de las apps de los bancos (en Venezuela llenan todos los campos de una vez).
    *(Oct. 2026: antes cada dato tenía su botón grande; es lo menos usado.)* Debajo, cada dato con un **Copiar** chico
    (el banco como código "0102", el teléfono solo con números "04141234567", la cédula "V12345678"), por si la app no
    pega todo junto. "Copiado" al tocar.
  - La app no cobra ni registra pagos: solo muestra los datos.
- **R55. Aire acondicionado.** El chofer indica si su carro tiene aire (al registrarse y en Mi carnet). Los
  pasajeros lo ven en cada unidad y en Mi viaje ("❄️ Con aire").

### 5.17 Lista hacia Valle Grande: el tramo Centro → Valle Grande (modelo híbrido)

*(Oct. 2026, hablado con choferes y pasajeros.)* La competencia por puesto está en la salida del Centro: ahí la
gente espera, casi siempre en la parada de **Gina**, y el que llega primero debe subir primero. En ese tramo la app deja
de apartar puestos y arma **una sola lista del tramo, por orden de llegada**: la lista no es de una parada; cada uno
dice **dónde está** y Gina es solo el lugar más común. Valle Grande → Centro sigue igual (apartar).

- **R62. Anotarse en la lista [servidor].** En Centro → Valle Grande el pasajero no escoge carro: **se anota en la
  lista del tramo** (**Anotarme en la lista**) y dice **dónde está**: **En Gina** es la opción principal, ya escogida
  (un toque); si espera en otro punto del camino, lo **escribe** ("Plaza del Indio", máx. 60; sin GPS, R26). Pregunta
  **cuántos van** (1–4, R57): el grupo **sube junto o no sube**. Una sola entrada activa por persona.
  - Avisar es estar ahí: no hay "llego en 5 min". Si el GPS dice que está a más de 300 m de Gina, la app pregunta
    "¿Ya estás en Gina?" y deja seguir igual; se guarda la distancia para medir abusos.
  - El aviso **vence a los 30 min**. El pasajero **ve siempre cuánto le queda** (barra y "Tu lugar vale 18 min más ·
    hasta las 3:45 p. m.") y puede renovarlo cuando quiera con **Sigo aquí** (vuelve a 30 min sin perder el lugar).
    A los 20 el contador se vuelve un aviso amarillo **"¿Sigues ahí?"** con el mismo botón, grande. *(Oct. 2026: antes
    45 min con aviso a los 35. En los primeros 71 avisos, dos tercios de quienes tocaron Me fui lo hicieron antes de los
    20 min (mediana 13) y el 77 % de quienes subieron lo hizo antes de los 30 (nadie después de 35); el 21 % vencía sin
    avisar y ocupaba la lista 45 min. Revisar con más datos.)* **Me fui** está
    siempre a un toque y saca a la persona de la lista al instante.
  - **¿Cómo te vas? [servidor].** Al tocar **Me fui** la app pregunta por qué, con opciones grandes que confirman en un
    toque: **Me fui en la van** (el transporte autorizado, que no usa el app), **En otro carro o taxi**, **Me cansé de
    esperar**, **Cambié de planes** u **Otra razón**. Sirve para medir cuánta gente se pierde y por qué (sobre todo
    por la van). El motivo lo ven solo el admin y los choferes (`lista_gina_privado`), no los demás pasajeros.
  - **"Me monté en un carro de la línea" — retirada** *(Oct. 2026)*. La hoja de Me fui ya no la ofrece: solo dice
    cómo se va. Montarse sigue sin ser "Me fui": lo marca el chofer con **Subió**, y Salir de Gina avisa si nadie está
    marcado (R66). La base conserva `me_monte` y la marca "dice que se montó" (el chofer la ve destacada con
    **Subió** a mano, aunque ya haya salido de Gina) para quien la tenga de antes; nadie nuevo la recibe.
- **R63. Una sola lista, por orden de llegada [servidor].** El orden lo pone el reloj del servidor. Todos ven
  la misma lista: **nombre corto, cuántos van, dónde está** (Gina o el lugar escrito) y su posición ("Eres el 5").
  Los choferes y los pasajeros ven además **cuántos esperan en Gina** (la demanda).
  - **El pasajero la ve igual, en una franja** ("La lista · 21 personas · 15 en Gina · 6 en otro lugar") que abre la
    lista completa en una hoja, con la suya destacada; su lugar en grande va arriba ("Eres el 11").
  - **Carros que vienen** dice: "Estos son los carros de la Línea hoy. Si un chofer que no aparece aquí te pregunta si
    estás en la lista, no está trabajando con la Línea."
  - **Anotado, va a Mi viaje** *(Oct. 2026)*: como quien aparta puesto, al anotarse pasa a **Mi viaje** (Inicio lo
    lleva ahí mientras siga en la lista, y el menú muestra "Mi viaje" de primero), sin el "¿Hacia dónde vas?". En orden
    de lo que necesita: **su lugar** ("Eres el 3 · en Gina · Antes que tú: 2 personas") → "¿Sigues ahí?" si está por
    vencer → **Carros que vienen** (lo más útil: cuándo pasa el próximo y con cuántos puestos) → cuánto vale su lugar
    y **Sigo aquí** → la lista → **Me fui**. Al salir de la lista (Me fui, venció o subió) vuelve a Inicio o a su viaje.
  - **Los choferes la ven siempre, fuera de sus viajes**: es del tramo, no de un carro. En su Inicio, una franja
    "Lista hacia Valle Grande" (caras, cuántos y dónde: "En Gina: 4 · En otro lugar: 1") abre la **lista completa** en
    una hoja: posición, nombre, cuántos van, **dónde espera**, desde cuándo, teléfono (si está conectado) y "Cómo
    llegar" para los de otro lugar con GPS. Al estar en Gina (R64) o en ruta hacia Valle Grande (R67), la misma hoja
    deja subir a la gente.
- **R64. El carro en Gina: llama, guarda y sube [servidor].** El chofer sigue publicando su viaje Centro → Valle
  Grande (para que vean cuándo llega y con cuántos puestos, R10, R61); nadie aparta en él. Al tocar **Ya llegué**
  en Gina, **la lista del tramo se abre sola** en la hoja (R63; cerrada, la franja sigue destacada: "Estás en Gina: abre
  la lista") y la app arma **el plan del carro** recorriendo la lista en orden hasta
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
    **Recoge en el camino** va arriba, en amarillo, con Subió / No vino.
  - **Que nadie salga sin marcar a quien subió:** si el chofer toca **Salir** de Gina **sin nadie marcado Subió**, la
    confirmación lo advierte ("Nadie está marcado Subió: si se montó alguien, márcalo en la lista antes de salir");
    y si alguien **dice que ya se montó** y no está marcado, lo nombra. Arriba se lee "3 pasajeros a bordo · 1 por
    recoger" (a bordo son solo los que subieron).
- **R67. Avisos del camino con el carro ya en ruta [servidor].** Si alguien se anota en otro lugar del camino cuando
  los carros ya salieron de Gina:
  - **Cada chofer en ruta hacia Valle Grande con puesto** lo ve en su viaje con un **aviso amarillo** ("Espera en el
    camino: Marta P. · Redoma de Juanico", con teléfono y "Cómo llegar"), sin tener que abrir la lista.
  - **Voy**: el chofer que va por esa persona la toma: queda **ligada a su carro** (como al salir de Gina, R66), sale
    de la lista y del aviso de los demás choferes, y la persona ve "José va por ti". El primero que toca **Voy** (o
    **Subió**) se la lleva; el otro ve que ya no está en la lista. Solo si cabe en el carro.
  - **Subió** directo, si paró sin avisar antes.
  - El pasajero en el camino ve también los **carros en ruta con puesto** en "Carros que vienen" ("Ya salió de Gina
    con 1 puesto: puede recogerte al pasar").
  - Si nadie va por esa persona, espera al siguiente carro, que le guarda puesto como en R64.
- **Historial de la lista (panel).** El admin ve, además de la lista en vivo, **quién pasó por la lista y por qué
  salió**, por período (hoy, ayer, 7 días): subió en Gina o en el camino (y con qué chofer), se fue ("Me fui", con su motivo: en la van, en otro carro…), venció
  sin responder "¿Sigues ahí?", el chofer marcó "No estaba", no estaba cuando pasó el carro, canceló o se canceló el
  viaje. Con dónde esperaba, cuánto tiempo estuvo en la lista y a qué hora salió, y un resumen por motivo arriba (con cuántos se fueron en la van).
- **R68. A bordo, igual que hoy.** Cada **Subió** crea un pasajero a bordo del viaje: **Se bajó** (R38),
  historial (R50–R51) y calificaciones (R44–R45) funcionan como en Valle Grande → Centro.

### 5.18 Cuota del día (choferes)

*(Oct. 2026: primera monetización, leve. El admin no madruga y hay choferes que empiezan muy temprano: el primer aviso
del día libera al momento y él concilia después con el estado de cuenta.)*

- **R76. Trabajar con la línea pide el día pagado [servidor].** Desde la fecha de inicio que fija el admin, para **publicar un
  viaje** (el primero, en cadena, la vuelta) el chofer necesita el **día habilitado** (día de Caracas). La cuota es
  **Bs. 1.000** por día (el admin la cambia). Con la cuota apagada (o antes de la fecha de inicio) todo funciona como antes.
  - **Sin el día habilitado tampoco se conecta ni ve la lista hacia Valle Grande** (ni nombres ni teléfonos) *(Oct.
    2026: un chofer que no pagó buscaba a la gente preguntando "¿estás en la lista?" y parecía seguir con la línea)*.
    En Inicio no tiene "Conectarme" ni la franja de la lista; sí entra a la app, ve su historial y paga la cuota.
  - Quien tiene un **viaje abierto** (p. ej., le rechazaron el pago a media jornada) lo termina como siempre: sigue
    conectado, recoge, ve la lista y sale.
- **R77. Avisar el pago [servidor].** El chofer paga por **Pago Móvil** a la cuenta de la línea (banco, teléfono y
  cédula con **Copiar todo**, como R74) y avisa con la **referencia** (4 a 20 números) y el **banco desde el que
  pagó**. En Inicio va solo el aviso ("Para publicar hoy, paga la cuota del día" · **Pagar la cuota**, en lugar de
  Publicar); el pago y el aviso de la referencia, en su propia pantalla **Cuota del día**.
  - **El primer aviso del día queda "En revisión" y habilita al momento.**
  - Un aviso a la vez: con uno en revisión o aprobado no se avisa otro ese día.
  - **Si el admin lo rechaza, no puede publicar más viajes ese día** (lo ya publicado sigue). Puede avisar otro pago,
    pero ese **ya no habilita hasta que el admin lo apruebe**. Así nadie vive diciendo que pagó.
  - Al día siguiente empieza de cero.
- **R78. Revisión en el panel [servidor].** **Cuotas** muestra los avisos del día (se puede ir a otros días): en
  revisión primero, con chofer, referencia, banco, monto y hora. **Aprobar** o **Rechazar** (con confirmación y motivo
  opcional, que el chofer ve); una decisión se puede cambiar. El menú cuenta los que están en revisión. Ahí mismo el
  admin carga los datos del cobro: cuota activa, desde qué día, monto y su Pago Móvil (sin esos datos no se puede
  activar).

### 5.19 El pasaje

*(Oct. 2026: la línea fija el precio del pasaje y lo cambia de noche y los domingos. Mostrarlo siempre cansa; se
muestra donde sirve.)*

- **R79. Tarifa.** **Bs. 1.000**. **Tarifa especial, Bs. 1.300**: **de noche** (desde las **6:00 p. m.** hasta las
  5:00 a. m.) y **los domingos** todo el día (hora de Caracas). Vale la hora en que **sale** el viaje; antes de salir,
  la hora del momento.
- **R80. Dónde se ve (sin cansar).**
  - **Al pagar**, siempre: en Mi viaje, en el Pago Móvil del chofer: "Pasaje: Bs. 1.300 · tarifa nocturna".
  - **Aviso de tarifa especial** en Inicio del pasajero, **solo cuando rige** (o 30 min antes de que empiece la
    nocturna: "Desde las 6:00 p. m. el pasaje es Bs. 1.300"). Se cierra con ✕ y no vuelve en esa noche o ese domingo.
  - **Al apartar o anotarse en la lista**, una línea en la hoja solo si rige la especial.
  - **Chofer**: en la tarjeta del viaje en ruta, una línea solo si rige la especial, para cobrar bien.
  - La tarifa normal no se anuncia fuera del momento de pagar.

### 5.20 Sugerencias y opinión sobre la app

- **R81. Sugerencias [servidor].** En el menú, **Enviar una sugerencia** (pasajeros y choferes): un texto (hasta 1.000
  letras) que le llega al admin. En el panel, **Sugerencias**: la más nueva primero, con quién (nombre y si es chofer o
  pasajero) y cuándo; **Marcar leída**. El menú cuenta las no leídas.
- **R82. "¿Qué tal la app?" [servidor].** Estrellas (1–5) y un comentario opcional; llega a Sugerencias con sus
  estrellas. Se pide en un momento bueno, nunca en medio de un viaje:
  - **Pasajero:** justo después de calificar un viaje con 4 o 5 estrellas, si ya hizo 3 viajes o más.
  - **Chofer:** en Inicio sin viajes abiertos, si ya terminó 10 viajes o más.
  - Nadie la ve si opinó en los últimos **60 días**. **Ahora no** la esconde **14 días** en ese teléfono.

### 5.21 Interfaz nueva: migración controlada

*(Oct. 2026: el diseño nuevo, pensado para el celular (pestañas abajo, hojas inferiores, transiciones), llega de a poco y
con vuelta atrás inmediata. La experiencia y las reglas son las mismas; cambia la presentación.)*

- **R83. Cada cuenta tiene su interfaz [servidor].** **Clásica** (la de siempre, por defecto) o **nueva**. **Solo el admin
  la cambia**, por persona o en grupo; el usuario no puede volver por su cuenta. Orden: **primero pasajeros**, después
  choferes.
- **R84. La app lleva a cada uno a la suya.** La nueva vive en `/n` (pasajero) y en `/n/chofer` (chofer, con las mismas
  pantallas de la clásica: Inicio con su viaje, Publicar, la lista de Gina, la cuota, Mis viajes, Calificaciones, Mi carnet y
  los compañeros). Pestañas del chofer en la nueva: **Inicio · Compañeros · Calificaciones · Menú**. **Compañeros**
  (como Choferes del pasajero): "Trabajando ahora" (qué hace cada uno, cuántos lleva y qué viene después; al tocar, su
  detalle con WhatsApp, Llamar y el mapa) y "Fuera de servicio" (cuándo vuelve, si avisó una pausa, R60); en Inicio ya
  no hay franja de compañeros. **Mis viajes** (R50) se abre desde el Menú.
  Quien está en la nueva y abre una dirección de la clásica (un enlace viejo, la app instalada) va a la pantalla
  equivalente de la nueva, y al revés. Un cambio hecho en el panel se aplica **al siguiente toque** (cada pantalla mira la
  interfaz de la cuenta en la base). Entrar (teléfono + PIN), registrarse y el panel son los mismos para las dos.
- **R85. Mismas reglas, mismos datos.** Las dos interfaces usan las mismas funciones de la base y los mismos datos: un
  pasajero en la nueva y un chofer en la clásica viajan juntos sin notarlo. **La clásica no cambia** mientras convivan;
  se apaga cuando todos estén en la nueva y no haga falta volver. La nueva sigue el **tema del teléfono** (claro u
  oscuro) por defecto; en Menú → Apariencia se escoge Sistema, Claro u Oscuro (se guarda en el teléfono, aparte del
  tema de la clásica). **Fondo "aurora arriba"** (Oct. 2026): arriba de cada pantalla, manchas suaves con los colores
  de la tarde llanera (azul de la Línea, ámbar, coral) que se mueven despacio y se desvanecen hacia el fondo. En el
  claro el fondo es gris claro y las tarjetas blancas y opacas con sombra suave (contraste para leer en la calle); en el
  oscuro las tarjetas dejan ver un poco la aurora. Es solo CSS (sin imágenes) y se queda quieta si el teléfono pide
  "reducir movimiento".

### 5.22 Demanda y oferta; cuentas de prueba

*(Oct. 2026: la lista hacia Valle Grande mostró que en la tarde la gente espera y no hay carro; el admin necesita ver
los picos y si la oferta alcanza, con números de varios días.)*

- **R86. Cuentas de prueba [servidor].** El admin marca una cuenta (pasajero o chofer) como **de prueba** en su detalle
  y la desmarca cuando quiera. Sus viajes, reservas y anotaciones **no cuentan en Demanda y oferta**. La cuenta sigue
  funcionando igual.
- **R91. El chofer de prueba no se ve [servidor].** *(Oct. 2026: el admin prueba en producción con un chofer de prueba y
  eso no debe aparecerle a nadie.)* Un **chofer de prueba** (R86), sus viajes, su ubicación, su carro, sus calificaciones y
  su pausa solo los ven él mismo, las **cuentas de prueba** y el admin: los demás pasajeros y choferes no lo ven en ninguna
  pantalla (unidades, La línea, Choferes, compañeros, carros que vienen, quién vuelve). Tampoco se cruza con la gente
  real: nadie de verdad puede apartar en sus viajes, en la lista hacia Valle Grande solo ve y atiende a pasajeros de
  prueba, y su carro en Gina no les quita puestos a los choferes reales (R63). Un **pasajero de prueba** sí se ve y viaja
  con choferes reales, como siempre.
- **R87. Demanda y oferta [servidor].** Solo el admin lo ve. Para cada hora del día (hora de Caracas):
  - **A Valle Grande** (desde Gina): cuántas **personas querían ir** y qué pasó con ellas: **llevadas**, se fueron en
    **otro transporte** (van u otro carro), la anotación **venció** (R65) o **desistieron**. Una persona que se vuelve a
    anotar menos de 60 min después de cerrarse su anotación es **la misma espera** (se cuenta una vez). Se suman los
    pedidos en el camino (R28) y la gente sin app que el chofer subió (R36), que siempre cuentan como llevados.
  - **Al Centro:** cuántas personas fueron **llevadas** y cuántas **no atendidas** (sin puesto, rechazadas, no llegó).
    Sin lista en ese sentido, quien no consiguió carro no queda registrado: se dice en pantalla.
  - **Oferta:** salidas de cada sentido (con sus puestos) y **choferes trabajando** (con algún viaje abierto en esa hora;
    un viaje olvidado abierto cuenta como mucho 6 h).
  - Cuenta la hora en que empezó la espera o se hizo la reserva, y la hora de salida de cada viaje.

### 5.23 Notificaciones

*(Oct. 2026: el admin necesita un canal propio para avisar, dar consejos y contar novedades, a todos o a una persona,
y saber quién lo vio. Primera etapa: solo pasajeros de la interfaz nueva y solo lo que manda el admin; después,
choferes, la clásica y avisos automáticos.)*

- **R88. El admin manda notificaciones [servidor].** Desde el panel escribe una: **tipo** (Aviso · Consejo · Novedad),
  **título** (hasta 60 caracteres) y **texto** (hasta 280), y escoge a quién: **todos los pasajeros de la interfaz
  nueva** o **personas escogidas** (de entre ellos). Cada destinatario recibe su copia; quien entra a la nueva después
  no recibe las anteriores. Una enviada no se edita; el admin la puede **retirar** (desaparece para todos).
- **R89. El pasajero las ve [servidor].** Cada uno ve **solo las suyas**. En la interfaz nueva hay una pestaña
  **Notificaciones** (campana) con un **número** de no leídas, que se actualiza solo en cualquier pestaña. La lista
  va de la más nueva a la más vieja, agrupada en **Hoy · Esta semana · Antes**; las no leídas, con fondo destacado.
  **Al abrir la pestaña quedan leídas** (el número desaparece; el destacado se mantiene mientras siga en esa
  pantalla). *(Oct. 2026: sin tarjeta en Inicio; el número
  en la campana basta para llamar la atención.)*
- **R90. También en el celular, si la persona quiere [servidor].** En la pestaña Notificaciones, una tarjeta ofrece
  **Avisarme en el celular**: al tocarla el teléfono pide el permiso (nunca antes de ese toque). Con el permiso, cada
  notificación que manda el admin llega además como aviso del teléfono (título y texto), **aunque la app esté cerrada**;
  tocarlo abre la pestaña Notificaciones. Ya activados, la tarjeta no aparece: **la app no ofrece apagarlos** (quien no
  los quiera los bloquea en el teléfono; ese aparato se borra solo al mandar el siguiente). Vale por aparato: cada
  teléfono de la persona se activa aparte. Si el teléfono lo bloqueó, la tarjeta explica cómo desbloquearlo; en el
  iPhone, que primero hay que agregar la app a la pantalla de inicio. La app se puede instalar (manifiesto con nombre,
  colores e íconos; se abre en pantalla completa). *(Oct. 2026: el push no garantiza la hora exacta: algunos Android con
  ahorro de batería lo entregan al desbloquear.)*
  **Dónde se ofrecen** *(oct. 2026: los avisos son la base de la interfaz nueva y la pestaña Notificaciones los dejaba
  escondidos)*. El navegador pregunta una sola vez (si la persona dice que no, solo se desbloquea en sus ajustes), así
  que la app nunca pregunta en frío: primero explica, y el permiso se pide al tocar.
  - **Bienvenida:** la primera vez que se abre la interfaz nueva en ese aparato, una hoja "¿Te avisamos en el
    celular?" dice para qué sirven (el carro al Centro que pidió, R94, y las novedades de la línea) con **Activar
    avisos** y **Ahora no**. En un iPhone sin la app instalada, explica cómo instalarla. Una sola vez por aparato; no
    aparece si ya están activados o bloqueados.
  - **Recordatorio en Inicio:** quien dijo "Ahora no" ve arriba de Inicio la tarjeta de los avisos (la de la pestaña
    Notificaciones) **desde el día siguiente**; con ✕ vuelve a los **7 días**, como mucho **3 veces**.
  - **En el momento de pedir un aviso** (R94): si el aparato nunca respondió, tocar **Avísame** pide
    el permiso en el mismo toque.
- **En el panel** (**Notificaciones**, en Operación): el formulario para mandar y la lista de las enviadas, la más nueva
  primero, con tipo, título, a cuántos llegó, **a cuántos celulares llegó el aviso** (R90) y **cuántos la vieron**, y
  **Retirar**.
- **R93. Aviso al admin de cada cuenta nueva [servidor].** *(Oct. 2026: para aprobar rápido a quien se acaba de
  registrar.)* Arriba de **Por aprobar**, una tarjeta ofrece **Avisarme en este aparato** (como R90: el permiso se pide
  solo al tocar, vale por aparato, explica si está bloqueado o si es un iPhone sin la app instalada); activado, dice que
  ese aparato recibe los avisos. Cada vez que alguien **termina de registrarse** (pasajero o chofer), los aparatos
  activados del admin reciben **"Nueva cuenta por aprobar"** con el nombre y si es pasajero o chofer; tocarlo abre Por
  aprobar. Lo pide el servidor con la sesión de la cuenta nueva, **una sola vez** por cuenta y solo mientras está
  pendiente y recién creada (15 min); si el aviso falla, el registro sigue igual. Al salir del panel, ese aparato deja
  de recibirlos.

## 6. Privacidad: quién ve qué [servidor]

| Dato | Lo ve |
|---|---|
| Nombre corto, foto, ★, "verificado" | Cualquier usuario con sesión |
| Datos del carro (unidad, placa, modelo, color, foto) | Cualquier usuario con sesión |
| **Teléfono** de un pasajero | Su chofer mientras tiene reserva en uno de sus viajes (y 7 días después), los choferes conectados mientras espera (R31), y el admin |
| **Teléfono** de un chofer | Pasajeros con reserva en sus viajes, otros choferes y el admin |
| **Cédula** | Solo la propia persona y el admin |
| Lugar escrito y GPS de un pasajero (reserva) | Solo el chofer del viaje. La lista pública no lo muestra |
| Espera de un pasajero (aviso al Centro, R94) | Él y el admin. *(Con R31 apagado, los choferes y los demás que esperan ya no la ven: `esperando_para_choferes` y `esperan_conmigo` no se pueden llamar desde la app.)* |
| Lista hacia Valle Grande (R63): nombre corto, foto, cuántos van, dónde está y desde cuándo | Los pasajeros y los choferes con la cuota del día o un viaje abierto (R76). La **distancia** al avisar (R62), solo el admin |
| **Teléfono** de quien está en la Lista hacia Valle Grande | Los choferes conectados mientras espera (para llamarlo, R65) y el admin |
| Posición del chofer | Cualquier usuario con sesión (solo mientras está conectado) |
| Recorrido de los viajes del chofer (R92) | Solo admin (el chofer lo sube; nadie más lo lee). Se borra a los 60 días |
| Alertas de auxilio | Solo choferes |
| Avisos de pago de la cuota (R77) | El propio chofer y el admin |
| Sugerencias y opiniones (R81–R82) | Quien la escribió y el admin |
| Pago Móvil de la línea (para la cuota) | Los choferes |
| Notificaciones (R88–R89) | Su destinatario y el admin (quién la vio, solo el admin) |
| Aparatos inscritos para avisos en el celular (R90) | La propia persona y el servidor al enviar; nadie más. Los del admin, también el servidor al avisar una cuenta nueva (R93) |

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
| Admin | Menú lateral: **Resumen** · Operación (**Viajes en curso** · **Lista a Valle Grande**) · Personas (**Por aprobar** · **Choferes** · **Pasajeros** · **Cuotas**, R78) · Análisis (**Uso de la app** · **Calificaciones** · **Sugerencias**, R81) · Aviso del día y restablecer PIN (más adelante) |

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
- **Operación:** Viajes en curso · Lista a Valle Grande · Notificaciones (R88). *(Oct. 2026: **Demanda** sale del menú mientras "Avísame" esté
  suspendido, R31: sin esperas, estaba siempre vacía. **Viajes terminados** también sale del menú, pero la página
  sigue: se llega desde los indicadores del Resumen y desde Viajes en curso; lo de cada chofer está en su detalle.)*
- **Personas:** Por aprobar · Choferes · Pasajeros.
- **Análisis:** Uso de la app · Demanda y oferta · Calificaciones. *(Oct. 2026: Demanda vuelve al menú, ahora con el
  histórico por hora, R87.)*
- Abajo: Cambiar contraseña · Modo oscuro/claro · Salir del panel.

Cada entrada muestra su contador: cuentas por aprobar en amarillo (piden acción); viajes en curso y personas en la
Lista a Valle Grande en gris (informan). **Celular primero, también en la computadora:** en el celular una sola columna; desde tablet el
contenido usa el ancho de la pantalla (hasta ~1150 px) con grillas. Entrar y cambiar la contraseña siguen angostos y sin
menú (formularios).

- **Resumen** (se actualiza solo, §4), en orden:
  1. **Indicadores:** choferes conectados · viajes en curso · en la Lista a Valle Grande · viajes terminados hoy · pasajeros
     llevados hoy · ★ de los últimos 7 días. Cada uno lleva a su página.
  2. **Requiere atención** (solo si hay algo): cuentas por aprobar (choferes y pasajeros, cada una a Por aprobar). Sin
     nada: "Todo en orden".
  3. **En la ruta ahora:** cada chofer conectado con qué está haciendo (estado y sentido de su viaje actual, puestos
     ocupados; "Conectado, sin viaje" si no tiene) y **Ver en el mapa** (R41, "Dónde está X"). Enlace a Viajes en curso.
     El mapa también está en su tarjeta de Choferes mientras está conectado.
  4. **Uso de la app (últimos 7 días)**, de los pasajeros llevados en viajes terminados (subió o se bajó antes):
     - **Cómo entraron al carro:** por la app (apartó puesto), por la app en el camino (R28) o **anotados a mano**
       por el chofer (R36), con el % que usó la app y una barra.
     - **Pasajeros identificados:** cuántas personas distintas viajaron con su cuenta, cuántas **repiten** (2 o más
       viajes en el período) y cuántas viajaron **por primera vez**.
     - Enlace **Ver detalle** → página **Uso de la app**: filtro 7 · 30 · 90 días, los mismos números, la
       comparación **por chofer** (app / en el camino / a mano, para ver quién todavía anota mucho a mano) y la
       **lista de pasajeros identificados**: foto, nombre, viajes en el período, último viaje y "Nuevo" si su primer
       viaje fue en el período. Primero quien más viaja.
  5. **Comunidad:** choferes y pasajeros aprobados, y cuántos se registraron en los últimos 7 días.
- **Calificaciones** (Análisis): todas las calificaciones de la línea, la más reciente primero, con **quién calificó**
  (a diferencia del chofer, R52). Filtros: **período** (7 días · 30 días · Todo), **chofer** y **nota** (Todas · Solo
  bajas, de 1 a 3 ★). Arriba, para lo filtrado: ★ promedio, cantidad, cuántas hay de cada nota y las etiquetas más
  dichas. Sin chofer escogido, **Por chofer**: cada uno con su ★ promedio, cuántas y cuántas bajas (primero el de
  promedio más bajo, para ver a quién hay que hablarle); tocar uno filtra por él. Cada calificación: estrellas,
  chofer, pasajero (foto y nombre), cuándo, sentido del viaje, etiquetas y comentario.
- **Viajes en curso** (se actualiza sola) *(Oct. 2026: antes un bloque por chofer; ahora mira los viajes)*:
  - **Una columna por sentido** (Hacia el Centro · Hacia Valle Grande; en el celular, una debajo de la otra). Arriba
    de cada una, la oferta: cuántos viajes, puestos libres, a qué hora recoge el próximo y, hacia Valle Grande,
    cuántas personas hay en la lista de Gina.
  - **Filtro por chofer**, arriba: **Todos** y cada chofer con viajes abiertos (nombre corto y cuántos viajes). Con uno
    escogido, las columnas muestran solo sus viajes; la oferta de arriba de cada columna sigue siendo la de toda la
    línea. Queda en la dirección (`?chofer=`).
  - **Orden por el momento del viaje**, lo que pasa ahora primero: Recogiendo → Llegando → En camino a recoger (por
    la hora en que recoge) → Próximos viajes → En ruta (por la hora de salida). **Lo que pide atención sube arriba**
    de su columna, con un aviso amarillo: pasó su hora y no avisó (más de 3 min, R56; con "Me atraso", contra la
    hora nueva) · recogiendo hace 15 min o más · en ruta hace más de 60 min ("¿olvidó terminar?") · pedido en el
    camino sin responder.
  - **Cada viaje, una tarjeta corta:** estado y sentido; el tiempo que importa (cuándo recoge y qué prometió, o
    hace cuánto salió); los puestos dibujados ("3 de 4 · 1 libre"); el chofer en una línea (foto, nombre, placa,
    ★, que abre su detalle) con **Ver en el mapa** (R41) y WhatsApp/Llamar; **Ver pasajeros (N)** y la línea de
    tiempo plegados (al abrir, la gente separada en A bordo, Por recoger con "✋ ya está en el sitio", Pedidos en
    el camino y Lista de espera, cada una con dónde, WhatsApp y Llamar); y **Cerrar viaje** (R69).
  - Al final, **Conectados sin viaje** (con Desconectar, R69) y **En pausa**: quién dijo que vuelve y a qué hora
    (R60), en amarillo quien ya pasó su hora, y quién terminó por hoy. Desconectar a un chofer con viajes se hace
    desde su detalle.
- **Viajes terminados**: **todos** los viajes cerrados de la línea, del más reciente al más viejo (por la hora en
  que se cerraron), con dos filtros: **Terminados · Cancelados · Todos** y **Hoy · 7 días · 30 días · Todo**. Se
  muestran de 50 en 50 (**Ver más**). Arriba, los totales del período: terminados, cancelados, pasajeros llevados y ★
  promedio. Cada viaje, plegado como en Mis viajes del chofer (R50):
  - **Terminado:** chofer y placa, sentido, salida y llegada, duración, a quién llevó (nombre completo y cómo entró),
    quién no vino y sus calificaciones. A diferencia del chofer (R52), el admin sí ve quién calificó.
  - **Cancelado** (en rojo): chofer y placa, sentido, a qué hora se canceló, quién y por qué (R72), hasta dónde llegó ("Antes de llegar a
    recoger" / "Avisó que llegaba" / "Después de llegar a recoger"), quiénes tenían puesto y lo perdieron.
  - Los dos, con su línea de tiempo (R56).
- **Demanda y oferta** (`/admin/demanda`, R87; para organizar la operación y conversar con los choferes con números).
  *(Oct. 2026: antes mostraba quién esperaba con "Avísame", suspendido por R31; sin esperas, estaba siempre vacía.)*
  - **Filtros:** período **Hoy · 7 días · Desde la lista** (21/10/2026, cuando empezó la lista hacia Valle Grande) y
    días **Todos · Lunes a viernes · Fin de semana** (no se muestra con Hoy). Por defecto, 7 días · Lunes a viernes.
  - **Totales del período:** A Valle Grande, personas que querían ir y cuántas fueron llevadas (con %), otro
    transporte, venció y desistieron; Al Centro, llevadas y no atendidas; y qué parte de los llevados **no tiene la
    app** (los subió el chofer).
  - **Por hora** (promedio por día del filtro; con Hoy, los números del día), solo las horas con gente o salidas: barras de
    "querían ir" y "llevados" a Valle Grande, llevados al Centro, salidas de cada sentido y choferes trabajando. Las
    horas en que a Valle Grande quedó más de la mitad sin llevar se marcan en amarillo.
  - **Por día:** fecha, querían ir y llevados a Valle Grande, llevados al Centro, salidas y choferes.
  - Abajo, cómo se cuenta (una espera = varias anotaciones seguidas; "venció" puede incluir a quien subió sin que lo
    marcaran; quien abrió la app y no se anotó no aparece).
- **Por aprobar** *(Oct. 2026: la aprobación sale de Choferes y Pasajeros)*: las cuentas nuevas de los dos roles, con
  pestañas **Pendientes** (con su número en amarillo en el menú) y **Rechazados**, y filtro **Todos · Choferes ·
  Pasajeros**. Cada tarjeta trae lo necesario para verificar (R2, R5): fotos (del chofer, también la del carro),
  teléfono, cédula, dónde vive, placa, unidad, carro y aire; WhatsApp y Llamar; **Aprobar**, **Rechazar** y, en
  rechazados, **Eliminar**.
- **Choferes** y **Pasajeros**: la **lista de los aprobados**, con **búsqueda** (nombre, teléfono, cédula; en choferes
  también placa y unidad; en pasajeros, dónde vive), sin importar tildes ni mayúsculas. **Filtra al escribir**, sobre la
  lista que ya está en pantalla (sin ir al servidor), y queda en la dirección para volver del detalle con ella puesta. Una fila corta por persona:
  foto, nombre y lo que la distingue (chofer: placa, ● conectado, ★ y viajes; pasajero: dónde vive y viajes) y su
  último viaje. Los choferes conectados van primero; después, quien viajó más reciente. Tocar la fila abre el
  **detalle**.
- **Detalle del chofer:** foto, nombre, conectado ahora, teléfono (WhatsApp y Llamar), cédula y desde cuándo está; el
  carro (foto, placa, unidad, modelo, color, aire); números: viajes terminados, cancelados, pasajeros llevados y ★
  promedio; **Ver en el mapa** y **Desconectar** si está conectado (R69); sus **últimos 5 viajes** (terminados y
  cancelados, como en Viajes terminados) y sus **últimas 5 calificaciones** con quién calificó; cada lista termina en
  **Ver todos sus viajes (N)** / **Ver todas sus calificaciones (N)**, que abren su página dentro del detalle con
  los mismos filtros que Viajes terminados (por defecto Todos · Todo) y Calificaciones (período y nota). Abajo, **Rechazar**
  (quitarle el acceso).
- **Detalle del pasajero:** foto, nombre, dónde vive, teléfono (WhatsApp y Llamar), cédula y desde cuándo está;
  números: viajes hechos, reservas que canceló, veces que no llegó y calificaciones que dio; sus **últimas 30
  reservas** (cuándo, sentido, chofer y cómo terminó: viajó, se bajó antes, canceló, no llegó, el chofer canceló…) y
  sus veces en la **Lista hacia Valle Grande** (cómo terminó y por qué se fue). Abajo, **Rechazar**.

**Mi viaje del pasajero (página aparte).** Apartar puesto es pasar de *escoger* a *acompañar* el viaje, así
que tiene su propia página (también es adonde llevan los avisos de §7):

- Al confirmar el puesto, la app abre **Mi viaje**. Mientras haya una reserva activa, **Inicio lleva a Mi viaje**
  (evita apartar otro carro por error) y el menú muestra "Mi viaje" de primero.
- Contenido, en orden y **compacto, para que quepa en la pantalla del celular** *(Oct. 2026, limpio como "Vas a
  bordo")*: ¿tengo puesto? (puesto N de M, turno en lista de espera o pedido pendiente) → cuándo llega y dónde me
  recoge, con **Cambiar** al lado → **✋ Ya estoy en el sitio** → el chofer en una línea (foto, nombre, ★, placa) con
  el **mapa en vivo** (R41) como ícono → Llamar / WhatsApp → avance del viaje → **a pedido**, plegado: la foto del
  carro y la lista del carro → **Ya no voy**.
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
   vas?**, con los dos sentidos ahí mismo (Al Centro / A Valle Grande, cada uno con cuántas unidades van). **Nunca viene un
   sentido escogido** *(Oct. 2026: antes empezaba en el sentido sugerido por la hora y dónde vive)*: hasta que toca uno,
   en lugar de las unidades dice "Toca Al Centro o A Valle Grande para ver cómo ir"; cambiarlo es un toque y **es instantáneo**: los dos sentidos se cargan
   juntos y el teléfono solo muestra el escogido, sin volver a pedir la página *(Oct. 2026)*. El sentido queda en la
   dirección (`?hacia=`) para el refresco en vivo y para volver atrás. Abajo, una franja con **las caras de quienes
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
   (R41). La primera con puesto lleva **"Recoge primero"**. El chofer aparece **una sola vez**: tocarlo abre su
   perfil en una hoja (foto, nombre completo, ★, placa, carro, aire y foto del carro).
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

- **R75. El viaje en ruta, arriba y con sus acciones.** *(Oct. 2026: en ruta el chofer ya no necesita seguir ese viaje; necesita ver
  el próximo. Antes la próxima recogida quedaba debajo de la pantalla y competían dos botones amarillos.)* Con un viaje
  **en ruta**, siempre:
  - Arriba, una **tarjeta azul** del viaje en ruta: "En ruta hacia Valle Grande", "Salió 9:01 · hace 18 min" y, grande,
    **"4 a bordo · 0 libres"**. *(Oct. 2026: la primera versión, una barra de una línea pegada al tope, quedó muy chica
    para ser el viaje en ruta; los choferes pidieron tener a mano subir a quien recogen en el camino y verla **siempre
    abierta**.)* Trae **Subió alguien** (R36, si quedan puestos; si no, "Carro lleno") y, pegado debajo, **una línea por
    persona** (nombre o lugar · dónde · su acción: Se bajó, Subió / No vino, Voy / Sigo): primero lo que no puede
    esperar (un **pedido en el camino**, R29, y a quien hay que **recoger en el camino**), luego quien **espera en el
    camino** (R67, en amarillo) y quienes van a bordo. Al final, las acciones del viaje: **Opciones** · **Terminar** (con
    R71 y R73). No se pliega ni se pega al tope: es lo primero de la pantalla.
  - Debajo, el **foco**: el **próximo viaje**, completo, y el botón fijo de abajo es **el suyo** (Avisar que llego / Ya
    llegué: al llegar, el viaje en ruta se termina solo, R13). Sin próximo viaje y sin haber cerrado la pregunta, el foco
    es **"¿Qué haces después?"** (R73) con las tres respuestas y **✕ Ahora no**, sin botón fijo; si ya avisó pausa o
    último, lo que avisó (con Cambiar y Publicar mi vuelta) y el botón fijo **Terminar viaje**.

- **Estado en una línea** arriba: "● Conectado · Ubicación activa". Tocarla deja desconectarse (con confirmación si
  cancela viajes, R8) después de "¿Vuelves a trabajar hoy?" (R60). Solo si el GPS falla se vuelve un aviso amarillo con "Intentar de nuevo" (R40).
- **Una sola acción principal a la vez**, grande y fija abajo (zona del pulgar), que cambia con el estado:
  en camino → **Avisar que llego** (y "Ya llegué" directo) · llegando → **Ya llegué** · recogiendo → **Salir con N
  pasajeros** · en ruta → **Terminar viaje** (R71).
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

- **Accesibilidad:** texto base 15 px; nada menor a 13 px; botones de 40 px de alto (acción principal 44 px; en filas
  de listas, 32 px); contraste WCAG AA; **nunca texto blanco sobre amarillo**; foco visible. *(Oct. 2026: antes era
  17 px / 52 px / 60 px; se achicó todo porque ocupaba demasiado la pantalla del celular. Se mantiene la letra Atkinson
  Hyperlegible.)*
- **Móvil primero:** pensado para Android de gama baja y datos móviles caros: pantallas livianas, posición del
  chofer como mucho cada 15 s.
- **Tiempo real:** lo que hace un teléfono aparece en los demás en ~1 s.
- **Sin señal:** la app abre (PWA) y muestra el último estado conocido.
- **Hora:** todas las horas en America/Caracas; el orden de las reservas lo define el reloj del servidor.
- **Si una pantalla falla:** nunca la pantalla cruda de Next. Cada interfaz tiene la suya ("Algo salió mal", **Recargar la
  app** y Volver a intentar), y si falla el layout, una general con estilo propio. *(Oct. 2026: el chofer que deja la app
  abierta y vuelve después de un despliegue tenía el código viejo y la pantalla se rompía.)* Un **error de versión**
  (un archivo de la app o una acción que ya no existen en el servidor) **recarga la app sola**, como mucho una vez por
  minuto; si el error sigue, se ve la pantalla.

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
