"use client"

import { CheckIcon, ChevronRightIcon, Loader2Icon, MapPinIcon, NavigationIcon, PhoneIcon, UserXIcon } from "lucide-react"
import { useState, useSyncExternalStore } from "react"

import { useAccion } from "@/components/chofer/use-accion"
import { Confirmar } from "@/components/confirmar"
import { Avatar } from "@/components/foto/avatar"
import { Avatar as AvatarUi, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage } from "@/components/ui/avatar"
import { Button, buttonVariants } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { noEstabaEnLista, subioDeLista } from "@/lib/acciones/chofer"
import type { EntradaGina, EntradaTramo } from "@/lib/datos/inicio-chofer"
import { hace } from "@/lib/fechas"
import { cn } from "@/lib/utils"
import { iniciales } from "@/lib/viajes"

const personas = (n: number) => (n === 1 ? "1 persona" : `${n} personas`)
const suma = (l: { personas: number }[]) => l.reduce((n, e) => n + e.personas, 0)

/** "15 en Gina · 6 en otro lugar", sin las partes en cero */
function resumen(lista: EntradaTramo[]) {
  const enGina = suma(lista.filter((e) => e.enGina))
  const otro = suma(lista.filter((e) => !e.enGina))
  return [enGina > 0 && `${enGina} en Gina`, otro > 0 && `${otro} en otro lugar`].filter(Boolean).join(" · ")
}

const ROL: Record<EntradaGina["rol"], { texto: string; clase: string }> = {
  llamar: { texto: "Llama", clase: "bg-primary text-primary-foreground" },
  guardar: { texto: "Guarda puesto", clase: "bg-warning-muted text-warning" },
  despues: { texto: "Sigue", clase: "bg-muted text-muted-foreground" },
}

/**
 * La lista hacia Valle Grande para los choferes (docs/especificacion.md §5.17): es del tramo, no de un viaje. Una
 * franja en Inicio, que ven todos, con cuántos esperan y dónde; tocarla abre la lista completa en una hoja.
 * - enGina: este chofer está recogiendo en Gina (R64): la hoja muestra el plan de su carro (Llama / Guarda puesto /
 *   Sigue) y deja marcar Subió y No estaba.
 * - enRuta: va hacia Valle Grande (R67): puede subir a quien espera en otro lugar del camino.
 */
export function ListaTramo({
  lista,
  enGina,
  enRuta,
}: {
  lista: EntradaTramo[]
  enGina: { viajeId: string; plan: EntradaGina[] } | null
  enRuta: { viajeId: string; libres: number } | null
}) {
  const [abierta, setAbierta] = useState(false)
  const plan = new Map((enGina?.plan ?? []).map((e) => [e.id, e]))
  const llamar = enGina?.plan.filter((e) => e.rol === "llamar") ?? []
  const guardar = enGina?.plan.filter((e) => e.rol === "guardar") ?? []
  const visibles = lista.slice(0, 3) // pocas caras: el texto es lo que se lee
  const total = suma(lista)

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierta(true)}
        className={cn(
          "flex min-h-16 w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring",
          enGina ? "border-signal bg-signal/15" : "bg-card"
        )}
      >
        {lista.length > 0 ? (
          <AvatarGroup className="*:data-[slot=avatar]:ring-card">
            {visibles.map((e) => (
              <AvatarUi key={e.id} className="size-9">
                {e.fotoUrl && <AvatarImage src={e.fotoUrl} alt="" />}
                <AvatarFallback className="bg-secondary text-sm font-bold text-secondary-foreground">{iniciales(e.nombre)}</AvatarFallback>
              </AvatarUi>
            ))}
            {lista.length > visibles.length && <AvatarGroupCount className="size-9 text-sm font-bold">+{lista.length - visibles.length}</AvatarGroupCount>}
          </AvatarGroup>
        ) : (
          <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-muted-foreground" />
        )}
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block font-bold">
            {enGina ? "Estás en Gina: abre la lista" : "Lista hacia Valle Grande"}
          </span>
          <span className="block text-[15px] text-muted-foreground">
            {lista.length === 0
              ? "Nadie esperando ahora"
              : enGina
                ? [llamar.length > 0 && `Llama a ${llamar.length}`, guardar.length > 0 && `guarda ${personas(suma(guardar))}`]
                    .filter(Boolean)
                    .join(" · ") || resumen(lista)
                : `${personas(total)} · ${resumen(lista)}`}
          </span>
        </span>
        <ChevronRightIcon aria-hidden className="size-5 shrink-0 text-muted-foreground" />
      </button>

      <Sheet open={abierta} onOpenChange={setAbierta}>
        <SheetContent side="bottom" className="mx-auto max-h-[90svh] max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Lista hacia Valle Grande</SheetTitle>
            <SheetDescription className="text-base">
              {lista.length === 0 ? "Nadie esperando ahora." : `${personas(total)} por orden de llegada · ${resumen(lista)}`}
            </SheetDescription>
            {enGina && (
              <p className="rounded-2xl bg-signal/15 px-3 py-2 text-[15px]">
                <strong>Estás en Gina.</strong> Llama en orden y marca Subió a quien sube. A los de otro lugar se les guarda
                puesto: los recoges al pasar.
              </p>
            )}
            {enRuta && !enGina && (
              <p className="rounded-2xl bg-muted px-3 py-2 text-[15px]">
                Vas hacia Valle Grande con {personas(enRuta.libres)} de espacio: si paras por alguien de la lista, márcalo Subió.
              </p>
            )}
          </SheetHeader>
          <ol className="flex flex-col gap-2 px-5 pb-6">
            {lista.map((e) => {
              const p = plan.get(e.id)
              // En Gina: lo que diga el plan. En ruta: solo los de otro lugar del camino, si caben
              const viajeId = enGina?.viajeId ?? enRuta?.viajeId ?? null
              const puedeSubir = enGina ? Boolean(p?.cabe && e.enGina) : Boolean(enRuta && !e.enGina && e.personas <= enRuta.libres)
              // "No estaba": en Gina, solo a los de Gina (a los de otro lugar se los busca después); en ruta, a los del camino
              const conNoEstaba = enGina ? e.enGina : Boolean(enRuta && !e.enGina)
              return <Fila key={e.id} entrada={e} rol={p?.rol ?? null} viajeId={viajeId} puedeSubir={puedeSubir} conNoEstaba={conNoEstaba} />
            })}
          </ol>
        </SheetContent>
      </Sheet>
    </>
  )
}

function Fila({
  entrada: e,
  rol,
  viajeId,
  puedeSubir,
  conNoEstaba,
}: {
  entrada: EntradaTramo
  rol: EntradaGina["rol"] | null
  viajeId: string | null
  puedeSubir: boolean
  conNoEstaba: boolean
}) {
  const { ejecutar, pendiente, error } = useAccion()
  const [confirmar, setConfirmar] = useState(false)
  // "hace N min" depende de la hora del celular: solo en el navegador
  const montado = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
  const telefono = e.telefono?.replace(/\D/g, "")
  const gps = e.lat !== null && e.lng !== null ? `${e.lat},${e.lng}` : null

  return (
    <li className="flex flex-col gap-2 rounded-2xl border-2 bg-card p-3">
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary font-bold text-primary-foreground">{e.posicion}</span>
        <Avatar url={e.fotoUrl} nombre={e.nombre} className="size-10 text-sm" />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-lg leading-tight font-bold">{e.nombre}</span>
            {e.personas > 1 && <span className="rounded-full bg-primary px-2 py-0.5 text-sm font-bold text-primary-foreground">+{e.personas - 1}</span>}
            {rol && <span className={cn("rounded-full px-2 py-0.5 text-sm font-bold", ROL[rol].clase)}>{ROL[rol].texto}</span>}
          </p>
          {/* Dónde espera (lo que el chofer necesita) y, más chico, desde cuándo */}
          <p className={cn("text-[15px] leading-snug", e.enGina ? "text-muted-foreground" : "font-bold text-primary")}>
            <MapPinIcon aria-hidden className="mr-1 inline size-4 align-[-2px]" />
            {e.enGina ? "En Gina" : e.lugar}
          </p>
          {montado && <p className="text-sm text-muted-foreground">{hace(e.creadaEn)}</p>}
        </div>
        {telefono && (
          <a href={`tel:+${telefono}`} aria-label={`Llamar a ${e.nombre}`} className={buttonVariants({ variant: "outline", size: "icon-sm", className: "rounded-full" })}>
            <PhoneIcon aria-hidden />
          </a>
        )}
        {!e.enGina && gps && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${gps}`}
            target="_blank"
            rel="noreferrer"
            aria-label={`Cómo llegar a ${e.nombre}`}
            className={buttonVariants({ variant: "outline", size: "icon-sm", className: "rounded-full" })}
          >
            <NavigationIcon aria-hidden />
          </a>
        )}
      </div>

      {viajeId && (puedeSubir || conNoEstaba) && (
        <div className="flex gap-2">
          {puedeSubir && (
            <Button size="sm" className="flex-1" disabled={pendiente} onClick={() => ejecutar(() => subioDeLista(e.id, viajeId))}>
              {pendiente ? <Loader2Icon aria-hidden className="animate-spin" /> : <CheckIcon aria-hidden />}
              Subió
            </Button>
          )}
          {conNoEstaba && (
            <Button size="sm" variant="ghost" className="text-destructive" disabled={pendiente} onClick={() => setConfirmar(true)}>
              <UserXIcon aria-hidden />
              No estaba
            </Button>
          )}
        </div>
      )}
      {rol === "despues" && e.personas > 1 && !puedeSubir && (
        <p className="text-sm text-muted-foreground">El grupo no cabe en lo que queda: sigue para el siguiente carro.</p>
      )}
      {error && !confirmar && (
        <p role="alert" className="font-bold text-destructive">
          {error}
        </p>
      )}
      <Confirmar
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
