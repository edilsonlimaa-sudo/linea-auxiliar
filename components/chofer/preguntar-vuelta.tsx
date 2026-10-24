"use client"

import { CircleCheckIcon, CoffeeIcon, FlagIcon, Loader2Icon, RepeatIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useId, useState } from "react"

import { Opcion } from "@/components/chofer/publicar-viaje"
import { useAccion } from "@/components/chofer/use-accion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { decirDespues, publicarVuelta } from "@/lib/acciones/chofer"
import { contrario, SENTIDOS, type Viaje } from "@/lib/viajes"

const MINUTOS_VUELTA = [20, 30, 45, 60]
const PAUSAS = [
  { minutos: 30, texto: "30 min" },
  { minutos: 60, texto: "1 hora" },
  { minutos: 120, texto: "2 horas" },
]
const texto = (m: number) => (m === 60 ? "1 hora" : `${m} min`)

export type Respuesta = "vuelta" | "pausa" | "ultimo"

/**
 * R73 (antes R61): en ruta y sin otro viaje publicado, "¿Qué haces después de este viaje?" → publico mi vuelta (cuándo
 * llega a recoger) · hago una pausa (a qué hora vuelve, como R60) · es mi último viaje de hoy. Sin "No, por ahora no":
 * cerrar la hoja no responde y el viaje lo sigue pidiendo (DespuesDelViaje, y Terminar viaje abre esta hoja).
 * Llega abierta por ?vuelta=1 (al salir, el viaje cambia de lugar en la pantalla y un estado local se perdería).
 */
export function PreguntarVuelta({
  viaje,
  inicial = null,
}: {
  viaje: Pick<Viaje, "id" | "sentido" | "puestos" | "ocupados" | "despues">
  inicial?: Respuesta | null // la respuesta ya escogida al abrirla desde el foco (R75)
}) {
  const router = useRouter()
  const [abierta, setAbierta] = useState(true)
  const [respuesta, setRespuesta] = useState<Respuesta | null>(inicial)
  const [minutos, setMinutos] = useState<number | null>(null)
  const [pausa, setPausa] = useState<number | "hora" | null>(null)
  const [hora, setHora] = useState("")
  const idHora = useId()
  const { ejecutar, pendiente, error } = useAccion()
  const regreso = SENTIDOS[contrario(viaje.sentido)]
  const pasajeros = Math.min(viaje.ocupados, viaje.puestos)

  const cerrar = () => {
    setAbierta(false)
    router.replace("/inicio", { scroll: false })
  }

  const listo =
    (respuesta === "vuelta" && minutos !== null) ||
    (respuesta === "pausa" && (typeof pausa === "number" || (pausa === "hora" && hora !== ""))) ||
    respuesta === "ultimo"

  const enviar = () => {
    if (respuesta === "vuelta" && minutos !== null) ejecutar(() => publicarVuelta(viaje.sentido, viaje.puestos, minutos), cerrar)
    else if (respuesta === "pausa" && pausa !== null)
      ejecutar(() => decirDespues(viaje.id, pausa === "hora" ? { hora } : { minutos: pausa }), cerrar)
    else if (respuesta === "ultimo") ejecutar(() => decirDespues(viaje.id, "ultimo"), cerrar)
  }

  return (
    <Sheet open={abierta} onOpenChange={(v) => !v && cerrar()}>
      <SheetContent side="bottom" className="mx-auto max-h-[90svh] max-w-2xl overflow-y-auto">
        <SheetHeader>
          {/* Primero, lo que acaba de pasar: la hoja sigue a "Salir", no la interrumpe */}
          <p className="flex items-center gap-2 font-bold text-success">
            <CircleCheckIcon aria-hidden className="size-5 shrink-0" />
            Vas {SENTIDOS[viaje.sentido].hacia}
            {pasajeros > 0 && ` con ${pasajeros === 1 ? "1 pasajero" : `${pasajeros} pasajeros`}`}
          </p>
          <SheetTitle>¿Qué haces después de este viaje?</SheetTitle>
          <SheetDescription className="text-base">Tus pasajeros lo ven: así saben si vuelves y cuándo.</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4">
          <fieldset className="flex flex-col gap-2">
            <legend className="sr-only">Después de este viaje</legend>
            <Opcion nombre="despues" elegida={respuesta === "vuelta"} onElegir={() => setRespuesta("vuelta")} className="justify-start text-left">
              <RepeatIcon aria-hidden className="size-5 shrink-0" />
              Sigo trabajando: publico mi vuelta
            </Opcion>
            <Opcion nombre="despues" elegida={respuesta === "pausa"} onElegir={() => setRespuesta("pausa")} className="justify-start text-left">
              <CoffeeIcon aria-hidden className="size-5 shrink-0" />
              Hago una pausa
            </Opcion>
            <Opcion nombre="despues" elegida={respuesta === "ultimo"} onElegir={() => setRespuesta("ultimo")} className="justify-start text-left">
              <FlagIcon aria-hidden className="size-5 shrink-0" />
              Es mi último viaje de hoy
            </Opcion>
          </fieldset>

          {respuesta === "vuelta" && (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-base font-bold">¿Cuándo llegas a recoger {regreso.enRecogida}?</legend>
              <div className="grid grid-cols-2 gap-2">
                {MINUTOS_VUELTA.map((m) => (
                  <Opcion key={m} nombre="vuelta-llega" elegida={minutos === m} onElegir={() => setMinutos(m)}>
                    {texto(m)}
                  </Opcion>
                ))}
              </div>
              {/* Lo que se va a publicar, antes de tocar */}
              <p className="mt-1 text-sm text-muted-foreground">
                Vuelta: {regreso.largo} · {viaje.puestos} {viaje.puestos === 1 ? "puesto" : "puestos"}. La gente que espera
                ahí ya la ve y aparta puesto mientras llegas.
              </p>
            </fieldset>
          )}

          {respuesta === "pausa" && (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-base font-bold">¿En cuánto vuelves?</legend>
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
              {pausa === "hora" && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={idHora} className="font-bold">
                    Vuelvo a las
                  </label>
                  <Input id={idHora} type="time" value={hora} onChange={(e) => setHora(e.target.value)} autoFocus className="w-40" />
                </div>
              )}
              <p className="text-sm text-muted-foreground">Al terminar este viaje quedas desconectado hasta que vuelvas.</p>
            </fieldset>
          )}

          {respuesta === "ultimo" && (
            <p className="text-sm text-muted-foreground">
              Al terminar este viaje quedas desconectado y la gente ve que terminaste por hoy. Si cambias de idea, publica
              otro viaje.
            </p>
          )}
        </div>

        <SheetFooter>
          {error && (
            <p role="alert" className="font-bold text-destructive">
              {error}
            </p>
          )}
          <Button variant="signal" size="lg" className="w-full" disabled={!listo || pendiente} onClick={enviar}>
            {pendiente && <Loader2Icon aria-hidden className="animate-spin" />}
            {respuesta === "vuelta" ? "Publicar mi vuelta" : respuesta === "pausa" ? "Avisar mi pausa" : respuesta === "ultimo" ? "Avisar que es el último" : "Escoge una opción"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
