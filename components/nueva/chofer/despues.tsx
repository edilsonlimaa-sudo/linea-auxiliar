"use client"

import { CircleCheck, Coffee, Flag, Loader2, Repeat, X } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import * as React from "react"

import { marcarAhoraNo, useAhoraNo } from "@/components/chofer/ahora-no"
import { useAccion } from "@/components/chofer/use-accion"
import { ErrorAccion, Opcion } from "@/components/nueva/chofer/comun"
import { puestosTexto } from "@/lib/nueva/textos"
import { Button } from "@/components/nueva/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/nueva/ui/drawer"
import { Input } from "@/components/nueva/ui/input"
import { decirDespues, publicarVuelta } from "@/lib/acciones/chofer"
import { textoVuelta } from "@/lib/fechas"
import { contrario, SENTIDOS, type Viaje } from "@/lib/viajes"

// "¿Qué haces después de este viaje?" (R73), con las reglas de components/chofer/preguntar-vuelta.tsx y despues-foco.tsx:
// se pregunta una vez por viaje; cerrarla es "ahora no" y se recuerda en el teléfono.

export type Respuesta = "vuelta" | "pausa" | "ultimo"
const MINUTOS_VUELTA = [20, 30, 45, 60]
const PAUSAS = [
  { minutos: 30, texto: "30 min" },
  { minutos: 60, texto: "1 hora" },
  { minutos: 120, texto: "2 horas" },
]
const minutosTexto = (m: number) => (m === 60 ? "1 hora" : `${m} min`)
const preguntar = (r?: Respuesta) => `/n/chofer?despues=1${r ? `&r=${r}` : ""}`

/** La hoja: llega abierta por ?despues=1 (al salir, o desde la tarjeta con la respuesta ya escogida en &r=) */
export function PreguntaDespues({
  viaje,
  inicial = null,
}: {
  viaje: Pick<Viaje, "id" | "sentido" | "puestos" | "ocupados">
  inicial?: Respuesta | null
}) {
  const router = useRouter()
  const [abierta, setAbierta] = React.useState(true)
  const [respuesta, setRespuesta] = React.useState<Respuesta | null>(inicial)
  const [minutos, setMinutos] = React.useState<number | null>(null)
  const [pausa, setPausa] = React.useState<number | "hora" | null>(null)
  const [hora, setHora] = React.useState("")
  const { ejecutar, pendiente, error } = useAccion()
  const regreso = SENTIDOS[contrario(viaje.sentido)]
  const pasajeros = Math.min(viaje.ocupados, viaje.puestos)

  const cerrar = () => {
    setAbierta(false)
    router.replace("/n/chofer", { scroll: false })
  }
  const listo =
    (respuesta === "vuelta" && minutos !== null) ||
    (respuesta === "pausa" && (typeof pausa === "number" || (pausa === "hora" && hora !== ""))) ||
    respuesta === "ultimo"
  const enviar = () => {
    if (respuesta === "vuelta" && minutos !== null) ejecutar(() => publicarVuelta(viaje.sentido, viaje.puestos, minutos), cerrar)
    else if (respuesta === "pausa" && pausa !== null) ejecutar(() => decirDespues(viaje.id, pausa === "hora" ? { hora } : { minutos: pausa }), cerrar)
    else if (respuesta === "ultimo") ejecutar(() => decirDespues(viaje.id, "ultimo"), cerrar)
  }

  return (
    <Drawer open={abierta} onOpenChange={(v) => !v && (marcarAhoraNo(viaje.id), cerrar())} showSwipeHandle>
      <DrawerContent className="sm:mx-auto sm:max-w-[430px]">
        <DrawerHeader>
          {/* Primero lo que acaba de pasar: la hoja sigue a "Salir" */}
          <p className="flex items-center gap-2 text-sm font-medium text-primary">
            <CircleCheck className="size-4" />
            Vas {SENTIDOS[viaje.sentido].hacia}
            {pasajeros > 0 ? ` con ${pasajeros === 1 ? "1 pasajero" : `${pasajeros} pasajeros`}` : ""}
          </p>
          <DrawerTitle className="font-heading text-xl">¿Qué haces después de este viaje?</DrawerTitle>
          <DrawerDescription>Tus pasajeros lo ven: así saben si vuelves y cuándo.</DrawerDescription>
        </DrawerHeader>
        <div className="flex max-h-[55svh] flex-col gap-4 overflow-y-auto px-4">
          <div className="flex flex-col gap-2">
            <Opcion nombre="despues" elegida={respuesta === "vuelta"} onElegir={() => setRespuesta("vuelta")} className="justify-start text-left">
              <Repeat className="size-5 shrink-0" /> Sigo trabajando: publico mi vuelta
            </Opcion>
            <Opcion nombre="despues" elegida={respuesta === "pausa"} onElegir={() => setRespuesta("pausa")} className="justify-start text-left">
              <Coffee className="size-5 shrink-0" /> Hago una pausa
            </Opcion>
            <Opcion nombre="despues" elegida={respuesta === "ultimo"} onElegir={() => setRespuesta("ultimo")} className="justify-start text-left">
              <Flag className="size-5 shrink-0" /> Es mi último viaje de hoy
            </Opcion>
          </div>
          {respuesta === "vuelta" ? (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 font-medium">¿Cuándo llegas a recoger {regreso.enRecogida}?</legend>
              <div className="grid grid-cols-2 gap-2">
                {MINUTOS_VUELTA.map((m) => (
                  <Opcion key={m} nombre="vuelta-llega" elegida={minutos === m} onElegir={() => setMinutos(m)}>
                    {minutosTexto(m)}
                  </Opcion>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Vuelta: {regreso.largo} · {puestosTexto(viaje.puestos)}. La gente que espera ahí ya la ve.
              </p>
            </fieldset>
          ) : null}
          {respuesta === "pausa" ? (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 font-medium">¿En cuánto vuelves?</legend>
              <div className="grid grid-cols-3 gap-2">
                {PAUSAS.map((p) => (
                  <Opcion key={p.minutos} nombre="pausa" elegida={pausa === p.minutos} onElegir={() => setPausa(p.minutos)}>
                    {p.texto}
                  </Opcion>
                ))}
                <Opcion nombre="pausa" elegida={pausa === "hora"} onElegir={() => setPausa("hora")} className="col-span-3">
                  A una hora
                </Opcion>
              </div>
              {pausa === "hora" ? (
                <label className="flex items-center gap-3">
                  <span className="font-medium">Vuelvo a las</span>
                  <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="w-36" autoFocus />
                </label>
              ) : null}
              <p className="text-xs text-muted-foreground">Al terminar este viaje quedas desconectado hasta que vuelvas.</p>
            </fieldset>
          ) : null}
          {respuesta === "ultimo" ? (
            <p className="text-sm text-muted-foreground">
              Al terminar este viaje quedas desconectado y la gente ve que terminaste por hoy. Si cambias de idea, publica otro viaje.
            </p>
          ) : null}
        </div>
        <DrawerFooter>
          <ErrorAccion error={error} />
          <Button size="lg" disabled={!listo || pendiente} onClick={enviar}>
            {pendiente ? <Loader2 className="animate-spin" /> : null}
            {respuesta === "vuelta" ? "Publicar mi vuelta" : respuesta === "pausa" ? "Avisar mi pausa" : respuesta === "ultimo" ? "Avisar que es el último" : "Escoge una opción"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

/**
 * En ruta sin otro viaje (R75): si ya avisó (pausa o último), lo que dijo con Cambiar y Publicar mi vuelta; si no, la
 * pregunta con sus tres respuestas y "Ahora no" (una vez por viaje).
 */
export function DespuesTarjeta({ viaje }: { viaje: Pick<Viaje, "id" | "sentido" | "despues" | "despues_vuelve_en"> }) {
  const ahoraNo = useAhoraNo(viaje.id)
  const regreso = SENTIDOS[contrario(viaje.sentido)]
  const avisado = viaje.despues === "pausa" || viaje.despues === "ultimo"

  if (avisado) {
    return (
      <section className="flex flex-col gap-3 rounded-3xl border bg-card p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {viaje.despues === "pausa" ? <Coffee className="size-5" /> : <Flag className="size-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-heading font-semibold">{viaje.despues === "pausa" ? "Después: pausa" : "Es tu último viaje de hoy"}</p>
            <p className="text-sm text-muted-foreground">
              {viaje.despues === "pausa"
                ? `${textoVuelta(viaje.despues_vuelve_en).replace(/^vuelve/, "Vuelves")}. Al terminar quedas desconectado hasta que vuelvas.`
                : "Al terminar quedas desconectado y la gente ve que terminaste por hoy."}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" render={<Link href={preguntar()} scroll={false} />} nativeButton={false}>
            Cambiar
          </Button>
          <Button variant="outline" render={<Link href={preguntar("vuelta")} scroll={false} />} nativeButton={false}>
            <Repeat /> Publicar mi vuelta
          </Button>
        </div>
      </section>
    )
  }
  if (ahoraNo) return null

  return (
    <section className="flex flex-col gap-3 rounded-3xl border bg-card p-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-heading font-semibold">¿Qué haces después de este viaje?</p>
          <p className="text-sm text-muted-foreground">Si quieres, avísalo: así quien espera {regreso.enRecogida} sabe si vuelves.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => marcarAhoraNo(viaje.id)}>
          <X /> Ahora no
        </Button>
      </div>
      {(
        [
          { r: "vuelta" as const, icono: <Repeat />, texto: "Sigo trabajando: publico mi vuelta" },
          { r: "pausa" as const, icono: <Coffee />, texto: "Hago una pausa" },
          { r: "ultimo" as const, icono: <Flag />, texto: "Es mi último viaje de hoy" },
        ] as const
      ).map(({ r, icono, texto }) => (
        <Button key={r} variant="outline" size="lg" className="justify-start" render={<Link href={preguntar(r)} scroll={false} />} nativeButton={false}>
          {icono} {texto}
        </Button>
      ))}
    </section>
  )
}
