import { BusIcon, HandIcon, MapPinIcon, MessageCircleIcon, PhoneIcon } from "lucide-react"

import { CerrarViaje, DesconectarChofer } from "@/components/admin/acciones-viaje"
import { LineaDeTiempo } from "@/components/admin/linea-de-tiempo"
import { Avatar } from "@/components/foto/avatar"
import { VerEnMapa } from "@/components/pasajero/ver-en-mapa"
import { buttonVariants } from "@/components/ui/button"
import type { ChoferEnCurso, CuentaConActividad, PersonaEnViaje, ViajeEnCurso } from "@/lib/datos/admin"
import { hora } from "@/lib/fechas"
import { cn } from "@/lib/utils"
import { conAcompanantes, enEspera, ETIQUETA_ESTADO, llegada, SENTIDOS, type Viaje } from "@/lib/viajes"

/**
 * Viajes en curso del panel (§8): un bloque por chofer, con cada viaje abierto y su gente separada en
 * a bordo, por recoger, pedidos en el camino y lista de espera. El admin no cambia listas, pero puede cerrar un
 * viaje o desconectar al chofer (R69).
 */
export function ViajesEnCurso({ choferes, sinViaje = [] }: { choferes: ChoferEnCurso[]; sinViaje?: CuentaConActividad[] }) {
  const conectados = <ConectadosSinViaje choferes={sinViaje} />
  if (choferes.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        {conectados}
        <SinViajes />
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-5">
      {conectados}
      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        {choferes.map((c) => (
          <BloqueChofer key={c.id} chofer={c} />
        ))}
      </div>
    </div>
  )
}

/** Conectados sin viaje abierto (R69): por si alguno quedó conectado sin trabajar y hay que desconectarlo */
function ConectadosSinViaje({ choferes }: { choferes: CuentaConActividad[] }) {
  if (choferes.length === 0) return null
  return (
    <section aria-labelledby="titulo-sin-viaje" className="flex flex-col gap-2">
      <h2 id="titulo-sin-viaje" className="text-xl font-bold">
        Conectados sin viaje <span className="font-normal text-muted-foreground">({choferes.length})</span>
      </h2>
      <ul className="grid gap-2 lg:grid-cols-2">
        {choferes.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-2xl border-2 bg-card px-3 py-2.5">
            <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-success" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold">{c.nombre}</span>
              {c.placa && <span className="font-mono text-sm font-bold tracking-wider text-muted-foreground">{c.placa}</span>}
            </span>
            <DesconectarChofer choferId={c.id} chofer={c.nombre} viajesAbiertos={0} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function SinViajes() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed px-5 py-10 text-center">
      <BusIcon aria-hidden className="size-10 text-muted-foreground" />
      <p className="text-lg font-bold">No hay viajes en curso ahora</p>
      <p className="text-muted-foreground">Cuando un chofer publique un viaje, aparece aquí con su gente.</p>
    </div>
  )
}

function BloqueChofer({ chofer: c }: { chofer: ChoferEnCurso }) {
  const porId = new Map<string, Viaje>(c.viajes.map((v) => [v.id, v]))
  return (
    <article className="flex flex-col gap-4 rounded-3xl border-2 bg-card p-4">
      <header className="flex items-center gap-3">
        <Avatar url={c.fotoUrl} nombre={c.nombre} className="size-14 text-lg" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl leading-tight font-bold">{c.nombre}</h2>
          <p className="flex flex-wrap items-center gap-x-2 text-[15px] text-muted-foreground">
            {c.placa && <span className="font-mono font-bold tracking-wider text-foreground">{c.placa}</span>}
            {c.unidad && <span>Unidad {c.unidad}</span>}
            {c.carro && <span>{c.carro}</span>}
          </p>
          <p className={cn("flex items-center gap-1.5 text-sm font-bold", c.conectado ? "text-success" : "text-muted-foreground")}>
            <span aria-hidden className={cn("size-2 rounded-full", c.conectado ? "bg-success" : "bg-muted-foreground")} />
            {c.conectado ? "Conectado" : "Desconectado"}
          </p>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        <VerEnMapa choferId={c.id} chofer={c.nombre} yo={null} admin className="flex-1" />
        <Contacto telefono={c.telefono} />
        <DesconectarChofer choferId={c.id} chofer={c.nombre} viajesAbiertos={c.viajes.length} />
      </div>

      {c.viajes.map((v) => (
        <BloqueViaje key={v.id} viaje={v} porId={porId} chofer={c.nombre} />
      ))}
    </article>
  )
}

function BloqueViaje({ viaje: v, porId, chofer }: { viaje: ViajeEnCurso; porId: Map<string, Viaje>; chofer: string }) {
  const cuando =
    v.estado === "en_ruta"
      ? `${ETIQUETA_ESTADO.en_ruta} ${SENTIDOS[v.sentido].hacia}${v.salida_en ? `, salió a las ${hora(v.salida_en)}` : ""}`
      : llegada(v, porId).principal
  const aBordo = v.personas.filter((p) => p.estado === "subio")
  const pedidos = v.personas.filter((p) => p.estado === "activa" && p.pendiente)
  const porRecoger = v.personas.filter((p) => p.estado === "activa" && !p.pendiente && p.confirmado)
  const enLista = v.personas.filter((p) => p.estado === "activa" && !p.pendiente && !p.confirmado)
  const ocupados = Math.min(v.ocupados, v.puestos)
  const espera = enEspera(v)

  return (
    <section aria-label={`${SENTIDOS[v.sentido].largo}: ${ETIQUETA_ESTADO[v.estado]}`} className="flex flex-col gap-3 rounded-2xl border-2 p-3">
      <div className="flex flex-col gap-1">
        <p className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold tracking-wide text-muted-foreground uppercase">{SENTIDOS[v.sentido].largo}</span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-sm font-bold",
              v.estado === "programado" ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"
            )}
          >
            {ETIQUETA_ESTADO[v.estado]}
          </span>
        </p>
        <p className="text-lg leading-tight font-bold">{cuando}</p>
        <p className="text-[15px] text-muted-foreground">
          {ocupados} de {v.puestos} puestos{espera > 0 && ` · ${espera} en lista de espera`}
        </p>
      </div>

      <LineaDeTiempo eventos={v.eventos} />

      {v.personas.length === 0 ? (
        <p className="text-muted-foreground">Todavía nadie en este viaje.</p>
      ) : (
        <>
          <Grupo titulo="A bordo" personas={aBordo} />
          <Grupo titulo="Pedidos en el camino" personas={pedidos} destacado />
          <Grupo titulo={v.estado === "en_ruta" ? "Va a recoger en el camino" : "Por recoger"} personas={porRecoger} />
          <Grupo titulo="Lista de espera" personas={enLista} />
        </>
      )}

      <CerrarViaje viajeId={v.id} chofer={chofer} enRuta={v.estado === "en_ruta"} haciaValle={v.sentido === "centro_a_vg"} />
    </section>
  )
}

function Grupo({ titulo, personas, destacado }: { titulo: string; personas: PersonaEnViaje[]; destacado?: boolean }) {
  if (personas.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      <h3 className={cn("font-bold", destacado && "text-destructive")}>
        {titulo} <span className="font-normal text-muted-foreground">({personas.length})</span>
      </h3>
      <ul className="flex flex-col gap-2">
        {personas.map((p) => (
          <li key={p.id} className="flex flex-col gap-2 rounded-xl bg-muted px-3 py-2.5">
            <div className="flex items-center gap-3">
              <Avatar url={p.fotoUrl} nombre={p.nombre} className="size-10" />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-bold">{conAcompanantes(p.nombre, p.personas)}</span>
                  {!p.conApp && <span className="rounded-full bg-card px-2 py-0.5 text-sm">Sin app</span>}
                  {p.listo && p.estado === "activa" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success-muted px-2 py-0.5 text-sm font-bold text-success">
                      <HandIcon aria-hidden className="size-4" /> Ya está en el sitio
                    </span>
                  )}
                </p>
                {(p.lugar || p.lat !== null) && (
                  <p className="flex items-start gap-1 text-[15px]">
                    <MapPinIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    {p.lugar ?? "Solo compartió su GPS"}
                  </p>
                )}
              </div>
            </div>
            <Contacto telefono={p.telefono} gps={p.lat !== null && p.lng !== null ? `${p.lat},${p.lng}` : null} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function Contacto({ telefono, gps }: { telefono: string | null; gps?: string | null }) {
  const digitos = telefono?.replace(/\D/g, "")
  if (!digitos && !gps) return null
  return (
    <div className="flex flex-wrap gap-2">
      {gps && (
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${gps}`}
          target="_blank"
          rel="noreferrer"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <MapPinIcon aria-hidden /> Ubicación
        </a>
      )}
      {digitos && (
        <>
          <a href={`https://wa.me/${digitos}`} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "whatsapp", size: "sm" })}>
            <MessageCircleIcon aria-hidden /> WhatsApp
          </a>
          <a href={`tel:+${digitos}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <PhoneIcon aria-hidden /> Llamar
          </a>
        </>
      )}
    </div>
  )
}
