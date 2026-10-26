"use client"

import { Loader2, Snowflake, Star, Users } from "lucide-react"
import * as React from "react"

import { carroLabel, ChoferAvatar, puestosLabel } from "@/components/nueva/pasajero/comunes"
import { Badge } from "@/components/nueva/ui/badge"
import { Button } from "@/components/nueva/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/nueva/ui/drawer"
import { Input } from "@/components/nueva/ui/input"
import { Separator } from "@/components/nueva/ui/separator"
import { apartarPuesto } from "@/lib/acciones/pasajero"
import type { UnidadVista } from "@/lib/nueva/vistas"
import { tarifaEn, textoTarifa } from "@/lib/tarifas"
import { cn } from "@/lib/utils"

type Paso = "detalle" | "apartar"

/**
 * Una unidad en "Al Centro": tocarla abre la hoja con el chofer y el carro; "Apartar puesto" la abre en el formulario
 * (R25, R57). La que pasa primero va destacada (R16).
 */
export function UnidadCard({ unidad, destacada = false }: { unidad: UnidadVista; destacada?: boolean }) {
  const [open, setOpen] = React.useState(false)
  const [paso, setPaso] = React.useState<Paso>("detalle")
  const { chofer } = unidad
  const sinPuestos = unidad.libres <= 0 || !unidad.aceptaReservas
  const enRuta = unidad.estado === "en_ruta"

  const abrir = (p: Paso) => (setPaso(p), setOpen(true))

  return (
    <>
      <div
        className={cn(
          "flex flex-col gap-3 rounded-3xl border bg-card p-4 text-card-foreground",
          destacada && "border-primary/40 ring-2 ring-primary/20"
        )}
      >
        {destacada ? (
          <div>
            <Badge>Pasa primero</Badge>
          </div>
        ) : null}
        <button type="button" onClick={() => abrir("detalle")} className="flex w-full items-center gap-3 text-left">
          <ChoferAvatar chofer={chofer} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-heading font-semibold">{chofer.nombre}</p>
            <p className="truncate text-sm text-muted-foreground">
              {carroLabel(chofer.carro)}
              {chofer.carro ? ` · ${chofer.carro.placa}` : ""}
            </p>
          </div>
          <div className="shrink-0 text-right">
            {unidad.minutos ? <p className="font-heading text-lg font-semibold tabular-nums">{unidad.minutos}</p> : null}
            <p className="text-xs text-muted-foreground">{unidad.etiqueta}</p>
          </div>
        </button>
        <p className="text-sm text-muted-foreground">
          {unidad.llegada.principal}
          {unidad.llegada.detalle ? ` · ${unidad.llegada.detalle}` : ""}
        </p>
        <div className="flex items-center gap-2 text-sm">
          <Badge variant={sinPuestos ? "outline" : "secondary"}>
            <Users className="size-3.5" />
            {puestosLabel(unidad.libres)}
          </Badge>
          {chofer.carro?.aire ? (
            <Badge variant="outline">
              <Snowflake className="size-3.5" />
              Aire
            </Badge>
          ) : null}
        </div>
        {destacada || enRuta ? (
          <Button size="lg" disabled={sinPuestos} onClick={() => abrir("apartar")}>
            {enRuta ? "Pedir que me recoja" : "Apartar puesto"}
          </Button>
        ) : null}
      </div>

      <Drawer open={open} onOpenChange={setOpen} showSwipeHandle>
        <DrawerContent className="sm:mx-auto sm:max-w-[430px]">
          {paso === "detalle" ? (
            <>
              <DrawerHeader className="items-center text-center">
                <ChoferAvatar chofer={chofer} className="size-20 text-2xl" />
                <DrawerTitle className="font-heading text-xl">{chofer.nombre}</DrawerTitle>
                <DrawerDescription className="flex items-center justify-center gap-1">
                  {chofer.estrellas !== null ? (
                    <>
                      <Star className="size-4 fill-amber-400 text-amber-400" />
                      {chofer.estrellas.toFixed(1).replace(".", ",")} · {chofer.calificaciones}{" "}
                      {chofer.calificaciones === 1 ? "calificación" : "calificaciones"}
                    </>
                  ) : (
                    "Sin calificaciones aún"
                  )}
                </DrawerDescription>
              </DrawerHeader>
              <div className="flex flex-col gap-3 px-4 text-sm">
                <dl className="grid grid-cols-2 gap-3 rounded-2xl bg-muted/60 p-3">
                  <div>
                    <dt className="text-xs text-muted-foreground">Carro</dt>
                    <dd className="font-medium">{carroLabel(chofer.carro)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Placa</dt>
                    <dd className="font-medium">{chofer.carro?.placa ?? "—"}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-muted-foreground">{unidad.etiqueta}</dt>
                    <dd className="font-medium">{unidad.llegada.principal}</dd>
                  </div>
                </dl>
                {chofer.carro?.fotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- foto del carro servida por /foto (R54)
                  <img src={chofer.carro.fotoUrl} alt={`Carro de ${chofer.nombre}`} className="aspect-video w-full rounded-2xl object-cover" />
                ) : null}
                <Separator />
                <p className="font-medium">{puestosLabel(unidad.libres)}</p>
              </div>
              <div className="flex flex-col gap-2 p-4">
                <Button size="lg" disabled={sinPuestos} onClick={() => setPaso("apartar")}>
                  {enRuta ? "Pedir que me recoja" : "Apartar puesto"}
                </Button>
              </div>
            </>
          ) : (
            <ApartarPuestoForm unidad={unidad} onVolver={() => setPaso("detalle")} />
          )}
        </DrawerContent>
      </Drawer>
    </>
  )
}

/** Apartar puesto (R25, R57): cuántos van y dónde está; un campo escrito */
function ApartarPuestoForm({ unidad, onVolver }: { unidad: UnidadVista; onVolver: () => void }) {
  const [cuantos, setCuantos] = React.useState(1)
  const [donde, setDonde] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [pendiente, iniciar] = React.useTransition()
  // R80: el pasaje solo si rige la tarifa especial (al abrir la hoja)
  const [tarifa] = React.useState(() => tarifaEn(new Date()))
  const maximo = Math.max(1, Math.min(4, unidad.libres))
  const enRuta = unidad.estado === "en_ruta"

  function enviar(e: React.FormEvent) {
    e.preventDefault()
    const texto = donde.trim()
    if (!texto) return setError("Dinos dónde estás para que el chofer te busque.")
    const datos = new FormData()
    datos.set("lugar", texto)
    datos.set("personas", String(cuantos))
    iniciar(async () => {
      // Si sale bien, la acción lleva a /n (Mi viaje)
      const r = await apartarPuesto(unidad.id, datos)
      if (r?.error) setError(r.error)
    })
  }

  return (
    <form onSubmit={enviar} className="flex flex-col">
      <DrawerHeader>
        <DrawerTitle className="font-heading text-xl">{enRuta ? "Pedir que me recoja" : "Apartar puesto"}</DrawerTitle>
        <DrawerDescription>
          {unidad.chofer.nombre} · {unidad.llegada.principal.toLowerCase()}
          {enRuta ? ". Ya salió: el chofer decide si pasa por ti." : ""}
        </DrawerDescription>
      </DrawerHeader>

      <div className="flex flex-col gap-5 px-4">
        <fieldset className="flex flex-col gap-2">
          <legend className="font-medium">¿Cuántos van?</legend>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((n) => (
              <Button
                key={n}
                type="button"
                size="lg"
                variant={cuantos === n ? "default" : "outline"}
                disabled={n > maximo}
                aria-pressed={cuantos === n}
                onClick={() => setCuantos(n)}
                className="font-heading text-base"
              >
                {n === 1 ? "Solo yo" : n}
              </Button>
            ))}
          </div>
          {maximo < 4 ? (
            <p className="text-xs text-muted-foreground">
              Quedan {maximo} {maximo === 1 ? "puesto" : "puestos"} en este carro.
            </p>
          ) : null}
        </fieldset>

        <div className="flex flex-col gap-2">
          <label htmlFor="donde" className="font-medium">
            ¿Dónde estás?
          </label>
          <Input
            id="donde"
            value={donde}
            onChange={(e) => (setDonde(e.target.value), error && setError(null))}
            maxLength={60}
            placeholder="Ej.: entrada de Las Cayenas"
            aria-invalid={error ? true : undefined}
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">Calle, casa o negocio de referencia. El chofer lo ve en grande.</p>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        {tarifa.tipo !== "normal" ? (
          <p className="rounded-2xl bg-secondary px-3 py-2 text-sm">
            Pasaje: <strong>{textoTarifa(tarifa)}</strong>
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 p-4">
        <Button type="submit" size="lg" disabled={pendiente}>
          {pendiente ? <Loader2 className="animate-spin" /> : null}
          {enRuta ? "Pedir" : "Confirmar puesto"}
        </Button>
        <Button type="button" variant="ghost" size="lg" onClick={onVolver}>
          Volver
        </Button>
      </div>
    </form>
  )
}
