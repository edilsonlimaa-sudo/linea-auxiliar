// Mis números del chofer (R118): las piezas del tablero de la app nativa (linea-apps/apps/chofer/src/ui/tablero.tsx y
// tablero-periodo.tsx) para la web: el héroe azul con lo cobrado (estimado), los tres números y, según el período, sus
// viajes del día y su ritmo, la semana en barras, o el mes con sus días y la próxima meta. Solo sus números (R112)
import { CalendarCheck, CarFront, ChevronLeft, ChevronRight, Flame, Target, TrendingDown, TrendingUp, Trophy, Users } from "lucide-react"
import Link from "next/link"
import type * as React from "react"

import { Badge } from "@/components/nueva/ui/badge"
import { bolivares } from "@/lib/bancos"
import { type Periodo, type TableroMes, type TableroRango, lunesDe, otroDia } from "@/lib/datos/numeros-chofer"
import { hora } from "@/lib/fechas"
import { cn } from "@/lib/utils"
import { SENTIDOS } from "@/lib/viajes"

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"]
const DIAS_PLURAL = ["los lunes", "los martes", "los miércoles", "los jueves", "los viernes", "los sábados", "los domingos"]
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"]
const LETRAS = ["L", "M", "M", "J", "V", "S", "D"]
const METAS = [25, 50, 100, 150, 200, 250, 300, 400, 500, 750, 1000]

const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)
const diaSemana = (dia: string) => DIAS[new Date(`${dia}T12:00:00Z`).getUTCDay()]
const fechaCorta = (dia: string) => `${Number(dia.slice(8))} ${MESES_CORTOS[Number(dia.slice(5, 7)) - 1]}`
const nombreDelMes = (desde: string, antes = false) => MESES[(Number(desde.slice(5, 7)) - 1 + (antes ? 11 : 0)) % 12]
const coma = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ","))
const neto = (c: { pasajes: number; gratis: number; cuotas: number }) => c.pasajes - c.gratis - c.cuotas
const cambio = (ahora: number, antes: number) => (antes > 0 ? Math.round(((ahora - antes) / antes) * 100) : null)

/** "Hoy" · "Ayer" · "Lunes 9 nov" · "Esta semana" · "Semana pasada" · "2 – 8 nov" · "Noviembre 2026" */
export function nombreDelTramo(periodo: Periodo, dia: string, hoy: string) {
  if (periodo === "mes") return `${mayuscula(nombreDelMes(dia))} ${dia.slice(0, 4)}`
  if (periodo === "hoy") {
    if (dia === hoy) return "Hoy"
    if (dia === otroDia(hoy, -1)) return "Ayer"
    return `${mayuscula(diaSemana(dia))} ${fechaCorta(dia)}`
  }
  const lunes = lunesDe(dia)
  if (lunes === lunesDe(hoy)) return "Esta semana"
  if (lunes === otroDia(lunesDe(hoy), -7)) return "Semana pasada"
  return `${Number(lunes.slice(8))} – ${fechaCorta(otroDia(lunes, 6))}`
}

// ——— Período y navegación ———————————————————————————————————————————————————————————————————————————————————————————

/** Hoy · Semana · Mes (como el Segmentado de la app): enlaces, la página se carga del servidor */
export function Periodos({ actual }: { actual: Periodo }) {
  const opciones: { p: Periodo; texto: string }[] = [
    { p: "hoy", texto: "Hoy" },
    { p: "semana", texto: "Semana" },
    { p: "mes", texto: "Mes" },
  ]
  return (
    <nav aria-label="Período" className="grid grid-cols-3 gap-1 rounded-full bg-muted p-1">
      {opciones.map(({ p, texto }) => (
        <Link
          key={p}
          href={`/n/chofer/numeros?p=${p}`}
          replace
          scroll={false}
          aria-current={p === actual ? "page" : undefined}
          className={cn(
            "flex h-9 items-center justify-center rounded-full text-sm font-medium transition-colors",
            p === actual ? "bg-card text-foreground shadow-(--sombra-card)" : "text-muted-foreground"
          )}
        >
          {texto}
        </Link>
      ))}
    </nav>
  )
}

/** ‹ El tramo que se ve › (el de después, solo hasta el actual; el de antes, desde su primer viaje) */
export function Navegar({ periodo, nombre, antes, despues }: { periodo: Periodo; nombre: string; antes: string | null; despues: string | null }) {
  const flecha = "flex size-9 items-center justify-center rounded-full border bg-card transition-colors active:bg-muted"
  const apagada = "flex size-9 items-center justify-center rounded-full border text-muted-foreground/40"
  return (
    <div className="flex items-center gap-2">
      {antes ? (
        <Link href={`/n/chofer/numeros?p=${periodo}&d=${antes}`} replace scroll={false} aria-label="Anterior" className={flecha}>
          <ChevronLeft className="size-4" />
        </Link>
      ) : (
        <span aria-hidden className={apagada}>
          <ChevronLeft className="size-4" />
        </span>
      )}
      <p className="flex-1 text-center font-heading font-semibold">{nombre}</p>
      {despues ? (
        <Link href={`/n/chofer/numeros?p=${periodo}&d=${despues}`} replace scroll={false} aria-label="Siguiente" className={flecha}>
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span aria-hidden className={apagada}>
          <ChevronRight className="size-4" />
        </span>
      )}
    </div>
  )
}

// ——— Piezas comunes ——————————————————————————————————————————————————————————————————————————————————————————————————

function Heroe({ etiqueta, monto, chip, sube, cobrado }: { etiqueta: string; monto: number; chip: string | null; sube: boolean; cobrado: TableroMes["cobrado"] }) {
  return (
    <section className="flex flex-col gap-1 rounded-3xl bg-primary p-5 text-primary-foreground shadow-(--sombra-card)">
      <p className="text-sm font-medium opacity-80">{etiqueta}</p>
      <p className="font-heading text-4xl font-semibold tracking-tight tabular-nums">{bolivares(monto)}</p>
      {chip ? (
        <p className="mt-1 flex w-fit items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-sm font-medium">
          {sube ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
          {chip}
        </p>
      ) : null}
      <p className="mt-1 text-[13px] opacity-75">
        {bolivares(cobrado.pasajes)} en pasajes
        {cobrado.gratis > 0 ? ` · −${bolivares(cobrado.gratis)} gratis` : ""}
        {cobrado.cuotas > 0 ? ` · −${bolivares(cobrado.cuotas)} de aportes` : ""} · estimado
      </p>
    </section>
  )
}

function Cifra({ icono, valor, nombre, tono = "primario" }: { icono: React.ReactNode; valor: number; nombre: string; tono?: "primario" | "exito" | "fuego" }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border bg-card p-3 shadow-(--sombra-card)">
      <span
        className={cn(
          "flex size-7 items-center justify-center rounded-full",
          tono === "primario" ? "bg-secondary text-primary" : tono === "exito" ? "bg-success/15 text-success" : "bg-orange-500/15 text-orange-600"
        )}
      >
        {icono}
      </span>
      <span className="font-heading text-2xl font-semibold tabular-nums">{valor}</span>
      <span className="text-[13px] leading-tight text-muted-foreground">{nombre}</span>
    </div>
  )
}

function Tarjeta({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-3xl border bg-card p-4 shadow-(--sombra-card)">
      <h2 className="font-heading text-base font-semibold">{titulo}</h2>
      {children}
    </section>
  )
}

function Promedio({ valor, nombre }: { valor: string; nombre: string }) {
  return (
    <div className="flex flex-1 flex-col gap-0.5 rounded-2xl bg-accent px-3 py-2.5">
      <span className="font-heading text-xl font-semibold tabular-nums">{valor}</span>
      <span className="text-[13px] text-muted-foreground">{nombre}</span>
    </div>
  )
}

function Dato({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 rounded-2xl bg-accent px-3 py-2 text-sm">
      <Trophy className="size-4 shrink-0 text-amber-600" />
      <span>{children}</span>
    </p>
  )
}

/** Siete barras con su número encima (lunes a domingo); la más alta, azul */
function Barras({ valores, destacada, hoyIndice = -1, futuros = [] }: { valores: number[]; destacada: number; hoyIndice?: number; futuros?: boolean[] }) {
  const max = Math.max(1, ...valores)
  return (
    <div className="flex items-end gap-2" aria-label={`Por día: ${valores.map((v, i) => `${DIAS_PLURAL[i]} ${Math.round(v)}`).join(", ")}`}>
      {valores.map((v, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <span className={cn("text-[13px] font-semibold tabular-nums", i === destacada && "text-primary")}>{futuros[i] ? "" : v ? Math.round(v) : "–"}</span>
          <span
            className={cn("w-full max-w-8 rounded-md", futuros[i] ? "bg-transparent" : i === destacada ? "bg-primary" : v ? "bg-primary/30" : "bg-muted")}
            style={{ height: v ? Math.max(6, (v / max) * 64) : 3 }}
          />
          <span className={cn("text-[13px] font-medium text-muted-foreground", (i === destacada || i === hoyIndice) && "font-semibold text-primary")}>{LETRAS[i]}</span>
        </div>
      ))}
    </div>
  )
}

// ——— El mes ——————————————————————————————————————————————————————————————————————————————————————————————————————————

/** La racha: días seguidos con pasajeros hasta hoy (si hoy todavía no, desde ayer). El domingo no la corta */
function racha(dias: TableroMes["mes"]["dias"]) {
  let n = 0
  let i = dias.length - 1
  if (i >= 0 && dias[i].pasajeros === 0) i--
  for (; i >= 0; i--) {
    const domingo = new Date(`${dias[i].dia}T12:00:00Z`).getUTCDay() === 0
    if (dias[i].pasajeros > 0) n++
    else if (!domingo) break
  }
  return n
}

export function NumerosDelMes({ datos }: { datos: TableroMes }) {
  const { mes, cobrado } = datos
  const c = cambio(mes.pasajeros, mes.pasajeros_antes)
  const trabajados = mes.dias.filter((d) => d.pasajeros > 0)
  const dias = mes.actual ? racha(mes.dias) : trabajados.length
  return (
    <>
      <Heroe
        etiqueta={`${mes.actual ? "Llevas en" : "Cobraste en"} ${nombreDelMes(mes.desde)}`}
        monto={neto(cobrado)}
        chip={c !== null ? `${c >= 0 ? "+" : ""}${c}% pasajeros vs. ${nombreDelMes(mes.desde, true)}` : null}
        sube={(c ?? 0) >= 0}
        cobrado={cobrado}
      />
      <div className="grid grid-cols-3 gap-2">
        <Cifra icono={<Users className="size-4" />} valor={mes.pasajeros} nombre="pasajeros" />
        <Cifra icono={<CarFront className="size-4" />} valor={mes.viajes} nombre="viajes" />
        {mes.actual ? (
          <Cifra icono={<Flame className="size-4" />} valor={dias} nombre={dias === 1 ? "día seguido" : "días seguidos"} tono="fuego" />
        ) : (
          <Cifra icono={<CalendarCheck className="size-4" />} valor={dias} nombre={dias === 1 ? "día activo" : "días activos"} tono="exito" />
        )}
      </div>
      <TusDias mes={mes} />
      {mes.actual ? <Meta mes={mes} /> : null}
    </>
  )
}

function TusDias({ mes }: { mes: TableroMes["mes"] }) {
  const trabajados = mes.dias.filter((d) => d.pasajeros > 0)
  if (trabajados.length === 0)
    return (
      <Tarjeta titulo="Tus días">
        <p className="text-sm text-muted-foreground">Todavía no hay viajes en este mes.</p>
      </Tarjeta>
    )
  const porDia = trabajados.reduce((n, d) => n + d.pasajeros, 0) / trabajados.length
  const bsPorDia = trabajados.reduce((n, d) => n + d.pasajes, 0) / trabajados.length
  const semana = LETRAS.map((_, i) => {
    const suyos = trabajados.filter((d) => (new Date(`${d.dia}T12:00:00Z`).getUTCDay() + 6) % 7 === i)
    return suyos.length ? suyos.reduce((n, d) => n + d.pasajeros, 0) / suyos.length : 0
  })
  const max = Math.max(...semana)
  const fuerte = semana.indexOf(max)
  const mejor = trabajados.reduce((m, d) => (d.pasajeros > m.pasajeros ? d : m), trabajados[0])
  return (
    <Tarjeta titulo="Tus días">
      <div className="flex gap-2">
        <Promedio valor={coma(Math.round(porDia * 10) / 10)} nombre="pasajeros por día" />
        <Promedio valor={bolivares(Math.round(bsPorDia))} nombre="en pasajes por día" />
      </div>
      <Barras valores={semana} destacada={fuerte} />
      <p className="text-sm text-muted-foreground">
        {mayuscula(DIAS_PLURAL[fuerte])} son tu mejor día: {Math.round(max)} pasajeros en promedio.
      </p>
      <Dato>
        Tu mejor día del mes:{" "}
        <strong>
          {diaSemana(mejor.dia)} {Number(mejor.dia.slice(8))}
        </strong>
        , con {mejor.pasajeros} pasajeros
      </Dato>
    </Tarjeta>
  )
}

function Meta({ mes }: { mes: TableroMes["mes"] }) {
  const meta = METAS.find((m) => m > mes.pasajeros) ?? Math.ceil((mes.pasajeros + 1) / 100) * 100
  const antes = [...METAS].reverse().find((m) => m <= mes.pasajeros) ?? 0
  const faltan = meta - mes.pasajeros
  const avance = (mes.pasajeros - antes) / (meta - antes)
  return (
    <section className="flex flex-col gap-3 rounded-3xl border bg-card p-4 shadow-(--sombra-card)">
      <div className="flex items-center gap-3">
        <span className="flex size-7 items-center justify-center rounded-full bg-secondary text-primary">
          <Target className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-heading font-semibold">
            {meta} pasajeros en {nombreDelMes(mes.desde)}
          </p>
          <p className="text-[13px] text-muted-foreground">
            {faltan === 1 ? "Te falta 1" : `Te faltan ${faltan}`}
            {antes > 0 ? ` · ya pasaste los ${antes}` : ""}
          </p>
        </div>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(4, avance * 100)}%` }} />
      </div>
    </section>
  )
}

// ——— El día y la semana ——————————————————————————————————————————————————————————————————————————————————————————————

export function NumerosDelTramo({ datos, periodo, hoy, ahora, abiertos }: { datos: TableroRango; periodo: "hoy" | "semana"; hoy: string; ahora: number; abiertos: number }) {
  const actual = datos.hasta === hoy
  const nombre = nombreDelTramo(periodo, datos.desde, hoy)
  const etiqueta =
    periodo === "hoy"
      ? actual
        ? "Llevas hoy"
        : `Cobraste ${nombre === "Ayer" ? "ayer" : `el ${nombre.toLowerCase()}`}`
      : actual
        ? "Llevas esta semana"
        : `Cobraste la semana del ${Number(datos.desde.slice(8))} al ${fechaCorta(otroDia(datos.desde, 6))}`
  const c = cambio(datos.pasajeros, datos.pasajeros_antes)
  // Hoy: contra ayer a esta misma hora (a las 10 de la mañana no sirve compararse con el día entero de ayer)
  const chip = datos.antes_a_esta_hora
    ? `Ayer a esta hora: ${bolivares(datos.antes_a_esta_hora.pasajes)}`
    : c !== null
      ? `${c >= 0 ? "+" : ""}${c}% pasajeros vs. ${periodo === "hoy" ? (actual ? "ayer" : "el día anterior") : "la semana anterior"}`
      : null
  const sube = datos.antes_a_esta_hora ? datos.cobrado.pasajes >= datos.antes_a_esta_hora.pasajes : (c ?? 0) >= 0
  const trabajados = datos.dias.filter((d) => d.pasajeros > 0).length
  const porViaje = datos.viajes ? Math.round(datos.pasajeros / datos.viajes) : 0
  return (
    <>
      <Heroe etiqueta={etiqueta} monto={neto(datos.cobrado)} chip={chip} sube={sube} cobrado={datos.cobrado} />
      <div className="grid grid-cols-3 gap-2">
        <Cifra icono={<Users className="size-4" />} valor={datos.pasajeros} nombre="pasajeros" />
        <Cifra icono={<CarFront className="size-4" />} valor={datos.viajes} nombre={datos.viajes === 1 ? "viaje" : "viajes"} />
        {periodo === "semana" ? (
          <Cifra icono={<CalendarCheck className="size-4" />} valor={trabajados} nombre={trabajados === 1 ? "día trabajado" : "días trabajados"} tono="exito" />
        ) : (
          <Cifra icono={<Users className="size-4" />} valor={porViaje} nombre="por viaje" tono="exito" />
        )}
      </div>
      {periodo === "hoy" ? (
        <>
          <RitmoDelDia datos={datos} hoy={hoy} ahora={ahora} abiertos={abiertos} />
          <ViajesDelDia datos={datos} hoy={hoy} />
        </>
      ) : (
        <SemanaBarras datos={datos} hoy={hoy} />
      )}
    </>
  )
}

function duracionCorta(minutos: number) {
  const m = Math.round(minutos)
  if (m < 60) return `${m} min`
  return `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60}` : ""}`
}

/** "¿Está valiendo la pena?": de qué hora a qué hora, cuánto por hora, los puestos y un día igual suyo */
function RitmoDelDia({ datos, hoy, ahora, abiertos }: { datos: TableroRango; hoy: string; ahora: number; abiertos: number }) {
  const conHora = datos.lista.filter((v) => v.salida_en)
  const igual = datos.mismo_dia && datos.mismo_dia.dias > 0 ? datos.mismo_dia : null
  const frase = igual ? (
    <p className="rounded-2xl bg-accent px-3 py-2 text-sm">
      Un {diaSemana(datos.desde)} normal tuyo: <strong>{bolivares(Math.round(igual.pasajes))}</strong> y {coma(Math.round(igual.pasajeros * 10) / 10)} pasajeros
    </p>
  ) : null
  if (conHora.length === 0) return igual ? <Tarjeta titulo="Tu ritmo">{frase}</Tarjeta> : null

  const desde = Math.min(...conHora.map((v) => new Date(v.salida_en as string).getTime()))
  const ultima = Math.max(...conHora.map((v) => new Date((v.llegada_en ?? v.salida_en) as string).getTime()))
  const hastaAhora = datos.desde === hoy && abiertos > 0
  const hasta = hastaAhora ? Math.max(ultima, ahora) : ultima
  const minutos = Math.max(0, (hasta - desde) / 60_000)
  const porHora = minutos >= 60 ? datos.cobrado.pasajes / (minutos / 60) : null
  const ofrecidos = datos.lista.reduce((n, v) => n + v.puestos, 0)
  const llenos = datos.lista.reduce((n, v) => n + Math.min(v.personas, v.puestos), 0)
  const vacios = Math.max(0, ofrecidos - llenos)
  const porSentido = (["vg_a_centro", "centro_a_vg"] as const)
    .map((s) => {
      const suyos = datos.lista.filter((v) => v.sentido === s)
      return { s, ofrecidos: suyos.reduce((n, v) => n + v.puestos, 0), llenos: suyos.reduce((n, v) => n + Math.min(v.personas, v.puestos), 0) }
    })
    .filter((x) => x.ofrecidos > 0)

  return (
    <Tarjeta titulo="Tu ritmo">
      <div className="flex gap-2">
        <Promedio valor={porHora !== null ? bolivares(Math.round(porHora)) : "—"} nombre={porHora !== null ? "por hora" : "por hora (desde 1 h)"} />
        <Promedio valor={duracionCorta(minutos)} nombre={`de ${hora(new Date(desde).toISOString())} a ${hastaAhora ? "ahora" : hora(new Date(ultima).toISOString())}`} />
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm">
          Saliste con{" "}
          <strong>
            {llenos} de {ofrecidos} puestos
          </strong>
          {vacios > 0 ? ` · ${vacios === 1 ? "1 vacío" : `${vacios} vacíos`}` : " · todo lleno"}
        </p>
        {porSentido.map((x) => (
          <div key={x.s} className="flex flex-col gap-1">
            <div className="flex justify-between text-[13px] text-muted-foreground">
              <span>{SENTIDOS[x.s].corto}</span>
              <span>
                {x.llenos} de {x.ofrecidos}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${(x.llenos / x.ofrecidos) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
      {frase}
    </Tarjeta>
  )
}

function ViajesDelDia({ datos, hoy }: { datos: TableroRango; hoy: string }) {
  if (datos.lista.length === 0)
    return (
      <Tarjeta titulo="Tus viajes">
        <p className="text-sm text-muted-foreground">{datos.desde === hoy ? "Todavía no terminaste ningún viaje hoy." : "Ese día no terminaste viajes."}</p>
      </Tarjeta>
    )
  return (
    <Tarjeta titulo="Tus viajes">
      <ul className="divide-y">
        {datos.lista.map((v) => (
          <li key={v.id} className="flex items-center gap-3 py-2.5">
            <span className="w-20 shrink-0 text-sm font-medium tabular-nums">{v.salida_en ? hora(v.salida_en) : "—"}</span>
            <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
              <Badge variant="secondary">{SENTIDOS[v.sentido].corto}</Badge>
              <span className="text-[13px] text-muted-foreground">
                {v.personas === 0 ? "Vacío" : v.personas === 1 ? "1 pasajero" : `${v.personas} pasajeros`} de {v.puestos}
              </span>
            </div>
            <span className="font-heading font-semibold tabular-nums">{bolivares(v.pasajes)}</span>
          </li>
        ))}
      </ul>
    </Tarjeta>
  )
}

function SemanaBarras({ datos, hoy }: { datos: TableroRango; hoy: string }) {
  const dias = Array.from({ length: 7 }, (_, i) => {
    const dia = otroDia(datos.desde, i)
    return { ...(datos.dias.find((d) => d.dia === dia) ?? { viajes: 0, pasajeros: 0, pasajes: 0 }), dia, futuro: dia > hoy }
  })
  const trabajados = dias.filter((d) => d.pasajeros > 0)
  const mejor = trabajados.reduce<(typeof dias)[number] | null>((m, d) => (!m || d.pasajeros > m.pasajeros ? d : m), null)
  const bsPorDia = trabajados.length ? trabajados.reduce((n, d) => n + d.pasajes, 0) / trabajados.length : 0
  return (
    <Tarjeta titulo="Tus días">
      <Barras
        valores={dias.map((d) => d.pasajeros)}
        destacada={mejor ? dias.indexOf(mejor) : -1}
        hoyIndice={dias.findIndex((d) => d.dia === hoy)}
        futuros={dias.map((d) => d.futuro)}
      />
      {trabajados.length > 0 ? (
        <>
          <div className="flex gap-2">
            <Promedio valor={bolivares(Math.round(bsPorDia))} nombre="en pasajes por día trabajado" />
          </div>
          {mejor && trabajados.length > 1 ? (
            <Dato>
              Tu mejor día:{" "}
              <strong>
                {diaSemana(mejor.dia)} {Number(mejor.dia.slice(8))}
              </strong>
              , con {mejor.pasajeros} pasajeros
            </Dato>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Todavía no hay viajes en esta semana.</p>
      )}
    </Tarjeta>
  )
}
