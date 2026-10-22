import { StarIcon } from "lucide-react"
import Link from "next/link"

import { promedioTexto } from "@/components/estrellas"
import { ViajesChofer } from "@/components/historial/viajes-chofer"
import { buttonVariants } from "@/components/ui/button"
import { cargarViajesCerradosAdmin, type FiltroCerrados } from "@/lib/datos/historial"
import { inicioDelDia } from "@/lib/fechas"
import { cn } from "@/lib/utils"

const ESTADOS: { id: FiltroCerrados; titulo: string }[] = [
  { id: "terminados", titulo: "Terminados" },
  { id: "cancelados", titulo: "Cancelados" },
  { id: "todos", titulo: "Todos" },
]

const PERIODOS = [
  { id: "hoy", titulo: "Hoy", dias: 0 },
  { id: "7", titulo: "7 días", dias: 6 },
  { id: "30", titulo: "30 días", dias: 29 },
  { id: "todo", titulo: "Todo", dias: null },
] as const

type Filtros = { estado: FiltroCerrados; periodo: (typeof PERIODOS)[number]["id"]; pagina?: number }
type Param = string | string[] | undefined

/**
 * Viajes cerrados (§8): terminados, cancelados o todos, por período, de 50 en 50, con los totales arriba. De toda la
 * línea (Viajes terminados) o de un chofer (`choferId`, en su detalle: sin su nombre en cada tarjeta). `base` es la
 * página donde está, para los enlaces de los filtros.
 */
export async function ViajesCerrados({
  base,
  params,
  choferId,
  porDefecto = { estado: "terminados", periodo: "7" },
}: {
  base: string
  params: { periodo?: Param; estado?: Param; pagina?: Param }
  choferId?: string
  porDefecto?: { estado: FiltroCerrados; periodo: Filtros["periodo"] }
}) {
  const enlace = ({ estado, periodo, pagina }: Filtros) =>
    `${base}?estado=${estado}&periodo=${periodo}${pagina && pagina > 1 ? `&pagina=${pagina}` : ""}`
  const periodo = PERIODOS.find((p) => p.id === params.periodo) ?? PERIODOS.find((p) => p.id === porDefecto.periodo) ?? PERIODOS[1]
  const estado = ESTADOS.find((e) => e.id === params.estado) ?? ESTADOS.find((e) => e.id === porDefecto.estado) ?? ESTADOS[0]
  const pagina = Math.max(1, Number(params.pagina) || 1)
  const { viajes, hayMas, totales } = await cargarViajesCerradosAdmin({
    desde: periodo.dias === null ? null : inicioDelDia(periodo.dias),
    filtro: estado.id,
    pagina,
    choferId,
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Chips titulo="Estado" opciones={ESTADOS} activo={estado.id} href={(id) => enlace({ estado: id, periodo: periodo.id })} />
        <Chips titulo="Período" opciones={PERIODOS} activo={periodo.id} href={(id) => enlace({ estado: estado.id, periodo: id })} />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Total valor={totales.terminados} texto={totales.terminados === 1 ? "terminado" : "terminados"} />
        <Total valor={totales.cancelados} texto={totales.cancelados === 1 ? "cancelado" : "cancelados"} />
        <Total valor={totales.pasajeros} texto={totales.pasajeros === 1 ? "pasajero llevado" : "pasajeros llevados"} />
        <Total
          valor={
            totales.promedio !== null ? (
              <span className="inline-flex items-center gap-1">
                <StarIcon aria-hidden className="size-6 fill-signal text-signal" />
                {promedioTexto(totales.promedio)}
              </span>
            ) : (
              "—"
            )
          }
          texto={totales.calificaciones === 1 ? "1 calificación" : `${totales.calificaciones} calificaciones`}
        />
      </div>

      {/* R72: por qué se cancelan, para entender a los choferes */}
      {estado.id !== "terminados" && totales.porQue.length > 0 && (
        <section aria-labelledby="titulo-porque" className="flex flex-col gap-2 rounded-2xl border-2 bg-card p-4">
          <h2 id="titulo-porque" className="font-bold">
            Por qué se cancelaron
          </h2>
          <ul className="flex flex-col gap-1">
            {totales.porQue.map((m) => (
              <li key={m.texto} className="flex items-baseline justify-between gap-3">
                <span>{m.texto}</span>
                <span className="font-bold tabular-nums">{m.veces}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ViajesChofer viajes={choferId ? viajes.map((v) => ({ ...v, chofer: undefined })) : viajes} admin />

      {(pagina > 1 || hayMas) && (
        <nav aria-label="Páginas" className="flex items-center justify-between gap-2">
          {pagina > 1 ? (
            <Link href={enlace({ estado: estado.id, periodo: periodo.id, pagina: pagina - 1 })} className={buttonVariants({ variant: "outline" })}>
              Más recientes
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-muted-foreground">Página {pagina}</span>
          {hayMas ? (
            <Link href={enlace({ estado: estado.id, periodo: periodo.id, pagina: pagina + 1 })} className={buttonVariants({ variant: "outline" })}>
              Ver más
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  )
}

function Chips<T extends string>({
  titulo,
  opciones,
  activo,
  href,
}: {
  titulo: string
  opciones: readonly { id: T; titulo: string }[]
  activo: T
  href: (id: T) => string
}) {
  return (
    <nav aria-label={titulo} className="flex flex-wrap gap-2">
      {opciones.map((o) => {
        const esActivo = o.id === activo
        return (
          <Link
            key={o.id}
            href={href(o.id)}
            aria-current={esActivo ? "page" : undefined}
            className={cn(
              "flex min-h-10 items-center rounded-full border-2 px-4 font-bold outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
              esActivo ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"
            )}
          >
            {o.titulo}
          </Link>
        )
      })}
    </nav>
  )
}

function Total({ valor, texto }: { valor: React.ReactNode; texto: string }) {
  return (
    <div className="flex min-h-24 flex-col justify-between gap-2 rounded-2xl border-2 bg-card p-3">
      <span className="text-xl leading-none font-bold tabular-nums">{valor}</span>
      <span className="text-sm leading-tight text-muted-foreground">{texto}</span>
    </div>
  )
}
