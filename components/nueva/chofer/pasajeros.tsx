"use client"

import { Check, Hand, Loader2, MapPin, MessageCircle, Navigation, Phone, UserPlus, UserX, X } from "lucide-react"
import * as React from "react"

import { useAccion } from "@/components/chofer/use-accion"
import { ConfirmarDrawer, ErrorAccion, Opcion } from "@/components/nueva/chofer/comun"
import { ChoferAvatar } from "@/components/nueva/pasajero/comunes"
import { Badge } from "@/components/nueva/ui/badge"
import { Button } from "@/components/nueva/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/nueva/ui/drawer"
import { Input } from "@/components/nueva/ui/input"
import { marcarNoVino, marcarSeBajo, marcarSubio, ocuparPuesto, quitarAnotado, responderPedido } from "@/lib/acciones/chofer"
import type { FilaChofer } from "@/lib/datos/inicio-chofer"
import { cn } from "@/lib/utils"
import { iniciales, PERSONAS_MAX, textoPersonas, textoPuestos, type EstadoViaje } from "@/lib/viajes"

type Pregunta = {
  titulo: string
  descripcion: string
  confirmar: string
  variante?: "destructive" | "default"
  accion: () => Promise<{ ok?: boolean; error?: string }>
}

/**
 * Una persona en la lista del carro (reglas de components/chofer/fila-pasajero.tsx). En la fila, solo la acción del
 * momento: un pedido en el camino (Voy / Sigo) o, en ruta, Subió / No vino. Tocarla abre su hoja: llamar, WhatsApp,
 * cómo llegar y lo que se usa menos (No vino antes de salir, Se bajó, Quitar).
 */
export function FilaPasajero({ fila, estadoViaje }: { fila: FilaChofer; estadoViaje: EstadoViaje }) {
  const { ejecutar, pendiente, error } = useAccion()
  const [hoja, setHoja] = React.useState(false)
  const [pregunta, setPregunta] = React.useState<Pregunta | null>(null)
  const enRuta = estadoViaje === "en_ruta"
  const recogiendo = estadoViaje === "en_camino" || estadoViaje === "llegando" || estadoViaje === "en_parada"
  const telefono = fila.telefono?.replace(/\D/g, "")
  const gps = fila.lat !== null && fila.lng !== null ? `${fila.lat},${fila.lng}` : null
  // Anotado a mano sin nombre (R36): se reconoce por dónde se recoge
  const porLugar = !fila.conApp && fila.nombre === "Pasajero sin app" && Boolean(fila.lugar)
  const quien = porLugar ? (fila.lugar ?? fila.nombre) : fila.nombre
  const apagada = !fila.confirmado && !enRuta && !fila.pendiente

  const preguntar = (p: Pregunta) => (setHoja(false), setPregunta(p))
  const noVino = () =>
    preguntar({
      titulo: `¿${quien} no vino?`,
      descripcion: fila.confirmado && !enRuta ? "Su puesto pasa a la siguiente persona de la lista." : "Se libera su puesto.",
      confirmar: "Sí, no vino",
      accion: () => marcarNoVino(fila.id),
    })
  const seBajo = () =>
    preguntar({
      titulo: `¿${quien} se bajó?`,
      // Para el pasajero el viaje termina aquí y se le pide calificar (R38, R45)
      descripcion: fila.conApp ? "Su puesto queda libre y para esa persona el viaje termina: la app le pedirá que te califique." : "Su puesto queda libre.",
      confirmar: "Sí, se bajó",
      variante: "default",
      accion: () => marcarSeBajo(fila.id),
    })
  const quitar = () =>
    preguntar({
      titulo: `¿Quitar a ${quien}?`,
      descripcion: "Lo anotaste tú a mano. Su puesto queda libre.",
      confirmar: "Sí, quitar",
      accion: () => quitarAnotado(fila.id),
    })

  const puesto = fila.personas > 1 ? `${fila.desde}–${fila.hasta}` : String(fila.desde)
  const estado = fila.pendiente
    ? { texto: "Pide que pases", variante: "destructive" as const }
    : fila.estado === "subio"
      ? { texto: "A bordo", variante: "default" as const }
      : enRuta
        ? { texto: "Por recoger", variante: "secondary" as const }
        : fila.confirmado
          ? { texto: `Puesto ${puesto}`, variante: "secondary" as const }
          : { texto: "En espera", variante: "outline" as const }

  return (
    <li className={cn("flex flex-col gap-2 p-3", fila.pendiente && "bg-destructive/5")}>
      <Drawer open={hoja} onOpenChange={setHoja} showSwipeHandle>
        <DrawerTrigger className={cn("flex w-full items-center gap-3 rounded-2xl text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50", apagada && "opacity-60")}>
          <ChoferAvatar chofer={{ nombre: quien, iniciales: iniciales(quien), fotoUrl: fila.fotoUrl }} className="size-10" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium">{quien}</p>
              {fila.personas > 1 ? <Badge>+{fila.personas - 1}</Badge> : null}
              {!fila.conApp ? <Badge variant="outline">Sin app</Badge> : null}
              {fila.listo && fila.conApp && !enRuta ? (
                <Badge variant="outline" className="border-primary/40 text-primary">
                  <Hand className="size-3" /> En el sitio
                </Badge>
              ) : null}
            </div>
            {!porLugar && fila.lugar ? (
              <p className="flex items-center gap-1 truncate text-sm text-muted-foreground">
                <MapPin className="size-3.5 shrink-0" />
                {fila.lugar}
              </p>
            ) : null}
          </div>
          <Badge variant={estado.variante}>{estado.texto}</Badge>
        </DrawerTrigger>

        <DrawerContent className="sm:mx-auto sm:max-w-[430px]">
          <DrawerHeader>
            <DrawerTitle className="font-heading text-xl">{quien}</DrawerTitle>
            <DrawerDescription>
              {textoPuestos(fila.desde, fila.hasta)}
              {fila.personas > 1 ? ` · ${textoPersonas(fila.personas)}` : ""}
              {fila.lugar && !porLugar ? ` · ${fila.lugar}` : ""}
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex flex-col gap-2 px-4 pb-6">
            {telefono || gps ? (
              <div className="grid grid-cols-2 gap-2">
                {telefono ? (
                  <Button size="lg" variant="outline" render={<a href={`tel:+${telefono}`} />} nativeButton={false}>
                    <Phone /> Llamar
                  </Button>
                ) : null}
                {telefono ? (
                  <Button size="lg" variant="outline" render={<a href={`https://wa.me/${telefono}`} target="_blank" rel="noreferrer" />} nativeButton={false}>
                    <MessageCircle /> WhatsApp
                  </Button>
                ) : null}
                {gps ? (
                  <Button
                    size="lg"
                    variant="outline"
                    render={<a href={`https://www.google.com/maps/dir/?api=1&destination=${gps}`} target="_blank" rel="noreferrer" />}
                    nativeButton={false}
                  >
                    <Navigation /> Cómo llegar
                  </Button>
                ) : null}
                {gps ? (
                  <Button size="lg" variant="outline" render={<a href={`https://waze.com/ul?ll=${gps}&navigate=yes`} target="_blank" rel="noreferrer" />} nativeButton={false}>
                    Waze
                  </Button>
                ) : null}
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground">Subió sin app: no hay teléfono.</p>
            )}
            {enRuta && fila.estado === "subio" ? (
              <Button size="lg" variant="outline" onClick={seBajo}>
                Se bajó
              </Button>
            ) : null}
            {/* Quien ya subió por la lista de Gina (R64) no tiene "No vino" */}
            {recogiendo && fila.conApp && fila.confirmado && !fila.pendiente && fila.estado === "activa" ? (
              <Button size="lg" variant="destructive" onClick={noVino}>
                <UserX /> No vino
              </Button>
            ) : null}
            {!enRuta && !fila.conApp ? (
              <Button size="lg" variant="destructive" onClick={quitar}>
                <X /> Quitar
              </Button>
            ) : null}
          </div>
        </DrawerContent>
      </Drawer>

      {/* La acción del momento, en la fila */}
      {fila.pendiente ? (
        <div className="grid grid-cols-2 gap-2">
          <Button disabled={pendiente} onClick={() => ejecutar(() => responderPedido(fila.id, true))}>
            {pendiente ? <Loader2 className="animate-spin" /> : <Check />}
            Voy
          </Button>
          <Button variant="outline" disabled={pendiente} onClick={() => ejecutar(() => responderPedido(fila.id, false))}>
            <X /> Sigo
          </Button>
        </div>
      ) : enRuta && fila.estado === "activa" ? (
        <div className="grid grid-cols-2 gap-2">
          <Button disabled={pendiente} onClick={() => ejecutar(() => marcarSubio(fila.id))}>
            {pendiente ? <Loader2 className="animate-spin" /> : <Check />}
            Subió
          </Button>
          <Button variant="outline" disabled={pendiente} onClick={noVino}>
            <UserX /> No vino
          </Button>
        </div>
      ) : null}
      <ErrorAccion error={pregunta ? undefined : error} />

      {pregunta ? (
        <ConfirmarDrawer
          abierto
          onCambiar={(v) => !v && setPregunta(null)}
          titulo={pregunta.titulo}
          descripcion={pregunta.descripcion}
          confirmar={pregunta.confirmar}
          variante={pregunta.variante}
          cancelar="No, volver"
          ocupado={pendiente}
          error={error}
          onConfirmar={() => ejecutar(pregunta.accion, () => setPregunta(null))}
        />
      ) : null}
    </li>
  )
}

/**
 * "Subió alguien" / "Ocupar puesto" para quien no usa la app (R36–R37): dónde, cuántos y, si quiere, el nombre. Toma el
 * siguiente puesto libre.
 */
export function SubioAlguienDrawer({ viajeId, enRuta, libres }: { viajeId: string; enRuta: boolean; libres: number }) {
  const [abierta, setAbierta] = React.useState(false)
  const [lugar, setLugar] = React.useState("")
  const [nombre, setNombre] = React.useState("")
  const [personas, setPersonas] = React.useState(1)
  const { ejecutar, pendiente, error, limpiar } = useAccion()
  const maximo = Math.max(1, Math.min(PERSONAS_MAX, libres))

  const guardar = (e: React.FormEvent) => {
    e.preventDefault()
    ejecutar(
      () => ocuparPuesto(viajeId, { lugar, nombre, personas }),
      () => (setAbierta(false), setLugar(""), setNombre(""), setPersonas(1))
    )
  }

  return (
    <Drawer open={abierta} onOpenChange={(v) => (setAbierta(v), limpiar())} showSwipeHandle>
      <DrawerTrigger render={<Button variant="outline" size="lg" className="w-full" disabled={libres <= 0} />}>
        <UserPlus />
        {enRuta ? "Subió alguien" : "Ocupar puesto"}
      </DrawerTrigger>
      <DrawerContent className="sm:mx-auto sm:max-w-[430px]">
        <form onSubmit={guardar} className="flex flex-col">
          <DrawerHeader>
            <DrawerTitle className="font-heading text-xl">{enRuta ? "Subió alguien sin app" : "Ocupar un puesto"}</DrawerTitle>
            <DrawerDescription>
              {enRuta ? "Para alguien que no usa la app y se montó en el camino." : "Para alguien que no usa la app. Toma el siguiente puesto libre."}
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex flex-col gap-4 px-4">
            <label className="flex flex-col gap-2">
              <span className="font-medium">{enRuta ? "¿Dónde se montó?" : "¿Dónde lo recoges?"}</span>
              <Input value={lugar} onChange={(e) => setLugar(e.target.value)} maxLength={60} placeholder="Ej.: Entrada de Frailejones" autoComplete="off" />
            </label>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 font-medium">¿Cuántos van?</legend>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: PERSONAS_MAX }, (_, i) => i + 1).map((n) =>
                  n <= maximo ? (
                    <Opcion key={n} nombre="personas-a-mano" elegida={personas === n} onElegir={() => setPersonas(n)} className="font-heading text-base">
                      {n}
                    </Opcion>
                  ) : (
                    <span key={n} className="flex min-h-11 items-center justify-center rounded-2xl border border-dashed font-heading text-base text-muted-foreground/50">
                      {n}
                    </span>
                  )
                )}
              </div>
              {maximo < PERSONAS_MAX ? <p className="text-xs text-muted-foreground">Te {maximo === 1 ? "queda 1 puesto libre" : `quedan ${maximo} puestos libres`}.</p> : null}
            </fieldset>
            <label className="flex flex-col gap-2">
              <span className="font-medium">
                Nombre <span className="font-normal text-muted-foreground">(opcional)</span>
              </span>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={40} placeholder="Ej.: María" autoComplete="off" />
            </label>
          </div>
          <div className="flex flex-col gap-2 p-4">
            <ErrorAccion error={error} />
            <Button type="submit" size="lg" disabled={pendiente}>
              {pendiente ? <Loader2 className="animate-spin" /> : null}
              Ocupar puesto
            </Button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  )
}
