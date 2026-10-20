import { CheckCircle2Icon, ChevronRightIcon, ClockIcon, MapPinIcon, StarIcon, TriangleAlertIcon, UserCheckIcon } from "lucide-react"
import Link from "next/link"

import { PorSentido } from "@/components/admin/demanda"
import { UsoNumeros } from "@/components/admin/uso"
import { promedioTexto } from "@/components/estrellas"
import { Avatar } from "@/components/foto/avatar"
import { VerEnMapa } from "@/components/pasajero/ver-en-mapa"
import type {
  ChoferEnCurso,
  CuentaConActividad,
  DemandaHoy,
  Esperando,
  OfertaSentido,
  Resumen as DatosResumen,
  RolCuenta,
  Uso,
} from "@/lib/datos/admin"
import { hace } from "@/lib/fechas"
import { cn } from "@/lib/utils"
import { ETIQUETA_ESTADO, haciaEnFrase, llegada, SENTIDOS, type Sentido, type Viaje } from "@/lib/viajes"

const ORDEN: Sentido[] = ["vg_a_centro", "centro_a_vg"]

/**
 * Tablero del admin (§8, "Resumen"): indicadores → lo que requiere atención → qué pasa ahora (en la ruta y
 * esperando) → cómo vamos (uso de la app y comunidad). En la computadora, las secciones van en dos columnas.
 */
export function Resumen({
  cuentas,
  resumen,
  pendientes,
  uso,
  enCurso,
  esperando,
  oferta,
  demandaHoy,
}: {
  cuentas: CuentaConActividad[]
  resumen: DatosResumen | null
  pendientes: Record<RolCuenta, number>
  uso: Uso
  enCurso: ChoferEnCurso[]
  esperando: Esperando[]
  oferta: Record<Sentido, OfertaSentido>
  demandaHoy: DemandaHoy | null
}) {
  const conectados = cuentas.filter((c) => c.rol === "chofer" && c.estado === "aprobado" && c.actividad?.conectado)
  const aprobados = (rol: RolCuenta) => cuentas.filter((c) => c.rol === rol && c.estado === "aprobado").length

  return (
    <div className="flex flex-col gap-6">
      <Indicadores conectados={conectados.length} resumen={resumen} esperando={esperando.length} />

      <Atencion pendientes={pendientes} esperando={esperando} oferta={oferta} />

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <EnLaRuta conectados={conectados} enCurso={enCurso} />
        <EsperandoAhora esperando={esperando} oferta={oferta} hoy={demandaHoy} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Tarjeta titulo="Uso de la app · 7 días">
          <UsoNumeros uso={uso} enlace="/admin/uso" />
        </Tarjeta>
        <Tarjeta titulo="Comunidad">
          <div className="grid grid-cols-3 gap-2">
            <Indicador valor={aprobados("chofer")} texto="choferes aprobados" href="/admin/choferes?estado=aprobado" />
            <Indicador valor={aprobados("pasajero")} texto="pasajeros aprobados" href="/admin/pasajeros?estado=aprobado" />
            <Indicador valor={resumen?.registros_7d ?? 0} texto={resumen?.registros_7d === 1 ? "registro en 7 días" : "registros en 7 días"} />
          </div>
        </Tarjeta>
      </div>
    </div>
  )
}

// ---------- 1. Indicadores ----------

function Indicadores({ conectados, resumen, esperando }: { conectados: number; resumen: DatosResumen | null; esperando: number }) {
  return (
    <section aria-label="Indicadores" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <Indicador valor={conectados} texto={conectados === 1 ? "chofer conectado" : "choferes conectados"} href="/admin/viajes" destacado={conectados > 0} borde />
      <Indicador valor={resumen?.viajes_en_curso ?? 0} texto={resumen?.viajes_en_curso === 1 ? "viaje en curso" : "viajes en curso"} href="/admin/viajes" borde />
      <Indicador valor={esperando} texto={esperando === 1 ? "pasajero esperando" : "pasajeros esperando"} href="/admin/demanda" borde />
      <Indicador
        valor={resumen?.viajes_hoy ?? 0}
        texto={resumen?.viajes_hoy === 1 ? "viaje terminado hoy" : "viajes terminados hoy"}
        href="/admin/viajes/terminados?periodo=hoy"
        borde
      />
      <Indicador
        valor={resumen?.pasajeros_hoy ?? 0}
        texto={resumen?.pasajeros_hoy === 1 ? "pasajero llevado hoy" : "pasajeros llevados hoy"}
        href="/admin/viajes/terminados?periodo=hoy"
        borde
      />
      <Indicador
        valor={
          resumen?.estrellas_7d != null ? (
            <span className="inline-flex items-center gap-1">
              <StarIcon aria-hidden className="size-6 fill-signal text-signal" />
              {promedioTexto(Number(resumen.estrellas_7d))}
            </span>
          ) : (
            "—"
          )
        }
        texto={
          resumen?.calificaciones_7d
            ? `${resumen.calificaciones_7d} ${resumen.calificaciones_7d === 1 ? "calificación" : "calificaciones"} en 7 días`
            : "sin calificaciones en 7 días"
        }
        href="/admin/viajes/terminados?periodo=7"
        borde
      />
    </section>
  )
}

// ---------- 2. Requiere atención ----------

function Atencion({
  pendientes,
  esperando,
  oferta,
}: {
  pendientes: Record<RolCuenta, number>
  esperando: Esperando[]
  oferta: Record<Sentido, OfertaSentido>
}) {
  const items: { clave: string; texto: string; href: string; accion: string }[] = []
  if (pendientes.chofer > 0)
    items.push({
      clave: "choferes",
      texto: pendientes.chofer === 1 ? "1 chofer espera tu aprobación" : `${pendientes.chofer} choferes esperan tu aprobación`,
      href: "/admin/choferes?estado=pendiente",
      accion: "Revisar",
    })
  if (pendientes.pasajero > 0)
    items.push({
      clave: "pasajeros",
      texto: pendientes.pasajero === 1 ? "1 pasajero espera tu aprobación" : `${pendientes.pasajero} pasajeros esperan tu aprobación`,
      href: "/admin/pasajeros?estado=pendiente",
      accion: "Revisar",
    })
  for (const s of ORDEN) {
    const esperan = esperando.filter((e) => e.sentido === s).length
    const libres = oferta[s].puestosLibres
    if (esperan > libres)
      items.push({
        clave: s,
        texto: `Falta transporte ${haciaEnFrase(s)}: ${esperan} ${esperan === 1 ? "espera" : "esperan"}, ${libres} ${libres === 1 ? "puesto libre" : "puestos libres"}`,
        href: "/admin/demanda",
        accion: "Ver demanda",
      })
  }

  if (items.length === 0) {
    return (
      <p className="flex items-center gap-2.5 rounded-2xl border-2 bg-success-muted px-4 py-3 font-bold text-success">
        <CheckCircle2Icon aria-hidden className="size-6 shrink-0" />
        Todo en orden: nadie espera aprobación y el transporte alcanza
      </p>
    )
  }
  return (
    <section aria-labelledby="titulo-atencion" className="flex flex-col gap-3 rounded-3xl border-2 border-signal bg-signal/15 p-4">
      <h2 id="titulo-atencion" className="flex items-center gap-2 text-lg font-bold">
        <TriangleAlertIcon aria-hidden className="size-5" />
        Requiere atención
      </h2>
      <ul className="grid gap-2 md:grid-cols-2">
        {items.map((i) => (
          <li key={i.clave}>
            <Link
              href={i.href}
              className="flex min-h-14 items-center gap-3 rounded-2xl bg-card px-4 py-2 font-bold hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"
            >
              <span className="flex-1">{i.texto}</span>
              {/* En el celular basta la flecha: el texto necesita el ancho */}
              <span className="hidden shrink-0 text-primary sm:inline">{i.accion}</span>
              <ChevronRightIcon aria-hidden className="size-5 shrink-0 text-primary" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

// ---------- 3. En la ruta ahora ----------

function EnLaRuta({ conectados, enCurso }: { conectados: CuentaConActividad[]; enCurso: ChoferEnCurso[] }) {
  const porId = new Map(enCurso.map((c) => [c.id, c]))
  // Conectados (con o sin viaje) y, por si acaso, quien tiene viajes abiertos aunque se haya desconectado
  const filas = [
    ...conectados.map((c) => ({ id: c.id, nombre: c.nombre, placa: c.placa, conectado: true, chofer: porId.get(c.id) })),
    ...enCurso
      .filter((c) => !conectados.some((x) => x.id === c.id))
      .map((c) => ({ id: c.id, nombre: c.nombre, placa: c.placa, conectado: false, chofer: c })),
  ]

  return (
    <Tarjeta titulo="En la ruta ahora" enlace={{ href: "/admin/viajes", texto: "Viajes en curso" }}>
      {filas.length === 0 ? (
        <p className="text-muted-foreground">Ningún chofer trabajando en este momento.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filas.map((f) => {
            const actual = f.chofer?.viajes[0]
            const porViaje = new Map<string, Viaje>((f.chofer?.viajes ?? []).map((v) => [v.id, v]))
            return (
              <li key={f.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-muted px-3 py-2.5">
                <Avatar url={f.chofer?.fotoUrl ?? null} nombre={f.nombre} className="size-11" />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2">
                    <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", f.conectado ? "bg-success" : "bg-muted-foreground")} />
                    <span className="truncate font-bold">{f.nombre}</span>
                    {f.placa && <span className="font-mono text-sm font-bold tracking-wider text-muted-foreground">{f.placa}</span>}
                  </p>
                  {actual ? (
                    <p className="text-[15px]">
                      <span className="font-bold text-primary">
                        {actual.estado === "en_ruta" ? `${ETIQUETA_ESTADO.en_ruta} ${SENTIDOS[actual.sentido].hacia}` : llegada(actual, porViaje).principal}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        · {Math.min(actual.ocupados, actual.puestos)}/{actual.puestos} puestos
                      </span>
                    </p>
                  ) : (
                    <p className="text-[15px] text-muted-foreground">{f.conectado ? "Conectado, sin viaje" : "Desconectado"}</p>
                  )}
                </div>
                {f.conectado && <VerEnMapa choferId={f.id} chofer={f.nombre} yo={null} admin className="shrink-0" />}
              </li>
            )
          })}
        </ul>
      )}
    </Tarjeta>
  )
}

// ---------- 4. Esperando ahora ----------

function EsperandoAhora({
  esperando,
  oferta,
  hoy,
}: {
  esperando: Esperando[]
  oferta: Record<Sentido, OfertaSentido>
  hoy: DemandaHoy | null
}) {
  // admin_demanda ya viene ordenada: primero quien lleva más tiempo
  const primeros = esperando.slice(0, 3)
  return (
    <Tarjeta titulo="Esperando ahora" enlace={{ href: "/admin/demanda", texto: "Demanda" }}>
      <div className="grid gap-3 sm:grid-cols-2">
        {ORDEN.map((s) => (
          <PorSentido key={s} sentido={s} esperan={esperando.filter((e) => e.sentido === s).length} oferta={oferta[s]} />
        ))}
      </div>
      {primeros.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="font-bold">Llevan más tiempo esperando</h3>
          <ul className="flex flex-col gap-2">
            {primeros.map((e) => (
              <li key={e.id} className="flex items-center gap-3 rounded-2xl bg-muted px-3 py-2">
                <Avatar url={e.fotoUrl} nombre={e.nombre} className="size-10" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">
                    {e.nombre} <span className="font-normal text-muted-foreground">· {haciaEnFrase(e.sentido)}</span>
                  </p>
                  <p className="flex items-center gap-1 truncate text-[15px] text-muted-foreground">
                    <MapPinIcon aria-hidden className="size-4 shrink-0" />
                    {e.lugar ?? "Solo con GPS"}
                  </p>
                </div>
                <span className={cn("flex shrink-0 items-center gap-1 text-[15px]", e.minutos >= 20 ? "font-bold text-warning" : "text-muted-foreground")}>
                  <ClockIcon aria-hidden className="size-4" />
                  {hace(e.creado_en)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {hoy && hoy.pedidos > 0 && (
        <p className="flex flex-wrap items-center gap-x-2 text-[15px] text-muted-foreground">
          <UserCheckIcon aria-hidden className="size-4" />
          Hoy: {hoy.pedidos} {hoy.pedidos === 1 ? "pedido" : "pedidos"} · {hoy.consiguieron} consiguieron puesto
          {hoy.sin_transporte > 0 && <span className="font-bold text-warning">· {hoy.sin_transporte} sin transporte</span>}
        </p>
      )}
    </Tarjeta>
  )
}

// ---------- Piezas ----------

function Tarjeta({ titulo, enlace, children }: { titulo: string; enlace?: { href: string; texto: string }; children: React.ReactNode }) {
  const id = `titulo-${titulo.toLowerCase().replace(/[^a-záéíóúñ0-9]+/g, "-")}`
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4 rounded-3xl border-2 bg-card p-4 md:p-5">
      <header className="flex items-center justify-between gap-3">
        <h2 id={id} className="text-lg font-bold">
          {titulo}
        </h2>
        {enlace && (
          <Link
            href={enlace.href}
            className="inline-flex min-h-11 shrink-0 items-center gap-0.5 rounded-md text-[15px] font-bold text-primary outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            {enlace.texto}
            <ChevronRightIcon aria-hidden className="size-5" />
          </Link>
        )}
      </header>
      {children}
    </section>
  )
}

function Indicador({
  valor,
  texto,
  destacado,
  href,
  borde,
}: {
  valor: React.ReactNode
  texto: string
  destacado?: boolean
  href?: string
  borde?: boolean // en la fila de indicadores: tarjeta propia sobre el fondo
}) {
  const contenido = (
    <>
      <span className={cn("text-[28px] leading-none font-bold tabular-nums", destacado && "text-success")}>{valor}</span>
      <span className="text-sm leading-tight text-muted-foreground">{texto}</span>
    </>
  )
  const clases = cn("flex min-h-24 flex-col justify-between gap-2 rounded-2xl p-3", borde ? "border-2 bg-card" : "bg-muted")
  return href ? (
    <Link href={href} className={cn(clases, "hover:bg-muted/70 focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none")}>
      {contenido}
    </Link>
  ) : (
    <div className={clases}>{contenido}</div>
  )
}
