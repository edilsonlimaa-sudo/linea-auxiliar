"use client"

import { CarFront, Check, ChevronRight, Loader2, MapPin, Navigation, Phone, Users, UserX } from "lucide-react"
import Link from "next/link"
import * as React from "react"

import { useAccion } from "@/components/chofer/use-accion"
import { ConfirmarDrawer, ErrorAccion } from "@/components/nueva/chofer/comun"
import { personasTexto } from "@/lib/nueva/textos"
import { ChoferAvatar } from "@/components/nueva/pasajero/comunes"
import { Badge } from "@/components/nueva/ui/badge"
import { Button } from "@/components/nueva/ui/button"
import { noEstabaEnLista, subioDeLista, voyPorEl } from "@/lib/acciones/chofer"
import type { EntradaGina, EntradaTramo } from "@/lib/datos/inicio-chofer"
import { hace } from "@/lib/fechas"
import { cn } from "@/lib/utils"
import { iniciales } from "@/lib/viajes"

// La lista hacia Valle Grande para los choferes (§5.17, R62–R68), con las reglas de components/chofer/lista-tramo.tsx

const suma = (l: { personas: number }[]) => l.reduce((n, e) => n + e.personas, 0)

/** "15 en Gina · 6 en otro lugar", sin las partes en cero */
function resumen(lista: EntradaTramo[]) {
  const enGina = suma(lista.filter((e) => e.enGina))
  const otro = suma(lista.filter((e) => !e.enGina))
  return [enGina > 0 && `${enGina} en Gina`, otro > 0 && `${otro} en otro lugar`].filter(Boolean).join(" · ")
}

export const ROL: Record<EntradaGina["rol"], { titulo: string; detalle: string }> = {
  llamar: { titulo: "Llama", detalle: "Están en Gina. Llámalos en este orden." },
  guardar: { titulo: "Guarda puesto", detalle: "Esperan en el camino. Los recoges al salir." },
  despues: { titulo: "Sigue", detalle: "No les cabe puesto. Quedan para el próximo carro." },
}

/** La franja del Inicio: cuántos esperan y dónde; lleva a la lista completa. En Gina o con alguien que dice que ya se montó, destacada */
export function FaixaLista({ lista, destacada = false }: { lista: EntradaTramo[]; destacada?: boolean }) {
  const total = suma(lista)
  const dicen = destacada ? lista.filter((e) => e.diceQueSubio) : []
  return (
    <Link
      href="/n/chofer/lista"
      transitionTypes={["nav-forward"]}
      className={cn("flex items-center gap-3 rounded-3xl border bg-card p-4 transition-colors active:bg-muted", destacada && "border-primary/40 bg-primary/5")}
    >
      <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Users className="size-6" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-heading font-semibold">
          {dicen.length > 0 ? `${dicen.length === 1 ? `${dicen[0].nombre} dice que ya se montó` : `${dicen.length} dicen que ya se montaron`}` : "La lista en Gina"}
        </p>
        <p className="text-sm text-muted-foreground">
          {dicen.length > 0 ? "Márcalo Subió en la lista" : lista.length === 0 ? "Nadie esperando ahora" : `${personasTexto(total)} · ${resumen(lista)}`}
        </p>
      </div>
      <ChevronRight className="size-5 text-muted-foreground" />
    </Link>
  )
}

/** Una persona de la lista con lo que el chofer puede hacer ahora (Subió, No estaba y, en ruta, Voy) */
export function FilaLista({
  entrada: e,
  rol = null,
  viajeId,
  puedeIr = false,
  puedeSubir,
  conNoEstaba,
}: {
  entrada: EntradaTramo
  rol?: EntradaGina["rol"] | null
  viajeId: string | null
  puedeIr?: boolean // en ruta (R67): "Voy" la liga a este carro
  puedeSubir: boolean
  conNoEstaba: boolean
}) {
  const { ejecutar, pendiente, error } = useAccion()
  const [confirmar, setConfirmar] = React.useState(false)
  // "hace N min" depende de la hora del celular: solo en el navegador
  const montado = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
  const telefono = e.telefono?.replace(/\D/g, "")
  const gps = e.lat !== null && e.lng !== null ? `${e.lat},${e.lng}` : null

  return (
    <li className={cn("flex flex-col gap-2 p-3", e.diceQueSubio && "bg-primary/5", rol === "despues" && !puedeSubir && "opacity-60")}>
      <div className="flex items-center gap-3">
        <span className="w-5 shrink-0 text-center font-heading font-semibold text-muted-foreground tabular-nums">{e.posicion}</span>
        <ChoferAvatar chofer={{ nombre: e.nombre, iniciales: iniciales(e.nombre), fotoUrl: e.fotoUrl }} className="size-10" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">{e.nombre}</p>
            {e.personas > 1 ? <Badge>+{e.personas - 1}</Badge> : null}
          </div>
          <p className={cn("flex items-center gap-1 truncate text-sm", e.enGina ? "text-muted-foreground" : "font-medium text-primary")}>
            <MapPin className="size-3.5 shrink-0" />
            {e.enGina ? "En Gina" : e.lugar}
            {montado ? <span className="font-normal text-muted-foreground"> · {hace(e.creadaEn)}</span> : null}
          </p>
        </div>
        {e.diceQueSubio ? (
          <Badge>Dice que ya se montó</Badge>
        ) : rol === "guardar" ? (
          <Badge variant="secondary">Guardado</Badge>
        ) : rol === "despues" ? (
          <Badge variant="outline">Próximo carro</Badge>
        ) : null}
        {telefono ? (
          <Button size="icon-sm" variant="outline" className="rounded-full" render={<a href={`tel:+${telefono}`} aria-label={`Llamar a ${e.nombre}`} />} nativeButton={false}>
            <Phone />
          </Button>
        ) : null}
        {!e.enGina && gps ? (
          <Button
            size="icon-sm"
            variant="outline"
            className="rounded-full"
            render={<a href={`https://www.google.com/maps/dir/?api=1&destination=${gps}`} target="_blank" rel="noreferrer" aria-label={`Cómo llegar a ${e.nombre}`} />}
            nativeButton={false}
          >
            <Navigation />
          </Button>
        ) : null}
      </div>

      {viajeId && (puedeIr || puedeSubir || conNoEstaba) ? (
        <div className="flex gap-2 *:flex-1">
          {puedeIr ? (
            <Button disabled={pendiente} onClick={() => ejecutar(() => voyPorEl(e.id, viajeId))}>
              {pendiente ? <Loader2 className="animate-spin" /> : <CarFront />}
              Voy
            </Button>
          ) : null}
          {puedeSubir ? (
            <Button variant={puedeIr ? "outline" : "default"} disabled={pendiente} onClick={() => ejecutar(() => subioDeLista(e.id, viajeId))}>
              {pendiente && !puedeIr ? <Loader2 className="animate-spin" /> : <Check />}
              Subió
            </Button>
          ) : null}
          {conNoEstaba ? (
            <Button variant="outline" disabled={pendiente} onClick={() => setConfirmar(true)}>
              <UserX /> No estaba
            </Button>
          ) : null}
        </div>
      ) : null}
      {rol === "despues" && e.personas > 1 && !puedeSubir ? (
        <p className="text-xs text-muted-foreground">El grupo no cabe en lo que queda: sigue para el próximo carro.</p>
      ) : null}
      <ErrorAccion error={confirmar ? undefined : error} />
      <ConfirmarDrawer
        abierto={confirmar}
        onCambiar={setConfirmar}
        titulo={`¿${e.nombre} no estaba?`}
        descripcion="Sale de la lista. Si todavía quiere ir, tiene que anotarse otra vez (al final)."
        confirmar="Sí, no estaba"
        cancelar="No, volver"
        ocupado={pendiente}
        error={error}
        onConfirmar={() => ejecutar(() => noEstabaEnLista(e.id), () => setConfirmar(false))}
      />
    </li>
  )
}

/**
 * La lista con lo que este chofer puede hacer según dónde está: en Gina (R64), el plan de su carro con Subió y No
 * estaba; en ruta hacia Valle Grande (R67), Voy y Subió para quien espera en el camino; si no, solo mirar.
 */
export function ListaConAcciones({
  lista,
  enGina,
  enRuta,
  agrupada = false,
}: {
  lista: EntradaTramo[]
  enGina: { viajeId: string; plan: EntradaGina[]; libres: number } | null
  enRuta: { viajeId: string; libres: number } | null
  agrupada?: boolean // en Gina: en grupos Llama / Guarda puesto / Sigue (Inicio); si no, en orden (la lista completa)
}) {
  const plan = new Map((enGina?.plan ?? []).map((e) => [e.id, e]))
  const viajeId = enGina?.viajeId ?? enRuta?.viajeId ?? null
  const fila = (e: EntradaTramo) => {
    const p = plan.get(e.id)
    const cabeEnRuta = Boolean(enRuta && !e.enGina && e.personas <= enRuta.libres)
    // Quien dice que ya se montó se marca aunque no le tocara, si cabe (R62)
    const libres = enGina?.libres ?? enRuta?.libres ?? 0
    const yaSeMonto = Boolean((enGina || enRuta) && e.diceQueSubio && e.personas <= libres)
    const puedeSubir = yaSeMonto || (enGina ? Boolean(p?.cabe && e.enGina) : cabeEnRuta)
    // "No estaba": en Gina, solo a los de Gina; en ruta, a los del camino
    const conNoEstaba = enGina ? e.enGina : Boolean(enRuta && !e.enGina)
    return (
      <FilaLista
        key={e.id}
        entrada={e}
        rol={p?.rol ?? null}
        viajeId={viajeId}
        puedeIr={!enGina && cabeEnRuta && !e.diceQueSubio}
        puedeSubir={puedeSubir}
        conNoEstaba={conNoEstaba}
      />
    )
  }

  if (lista.length === 0) {
    return <p className="rounded-3xl border border-dashed p-6 text-center text-sm text-muted-foreground">Nadie está esperando en Gina ahora.</p>
  }

  if (!agrupada || !enGina) {
    return <ol className="divide-y overflow-hidden rounded-3xl border bg-card">{lista.map(fila)}</ol>
  }

  // En Gina: primero quien dice que ya se montó, después Llama, Guarda puesto y Sigue
  const grupos: { clave: string; titulo: string; detalle?: string; entradas: EntradaTramo[] }[] = [
    { clave: "dicen", titulo: "Dicen que ya se montaron", detalle: "Márcalos Subió antes de salir.", entradas: lista.filter((e) => e.diceQueSubio) },
    ...(["llamar", "guardar", "despues"] as const).map((rol) => ({
      clave: rol,
      titulo: ROL[rol].titulo,
      detalle: ROL[rol].detalle,
      entradas: lista.filter((e) => !e.diceQueSubio && plan.get(e.id)?.rol === rol),
    })),
  ]
  return (
    <div className="flex flex-col gap-4">
      {grupos
        .filter((g) => g.entradas.length > 0)
        .map((g) => (
          <section key={g.clave} className="flex flex-col gap-2">
            <div>
              <h4 className="font-medium">
                {g.titulo} <span className="text-muted-foreground">· {g.entradas.length}</span>
              </h4>
              {g.detalle ? <p className="text-xs text-muted-foreground">{g.detalle}</p> : null}
            </div>
            <ol className="divide-y overflow-hidden rounded-3xl border bg-card">{g.entradas.map(fila)}</ol>
          </section>
        ))}
    </div>
  )
}
