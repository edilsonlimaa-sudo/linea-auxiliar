"use client"

import { GiftIcon, Loader2Icon, Trash2Icon } from "lucide-react"
import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { quitarRegalo, regalarViajes } from "@/lib/acciones/viajes-gratis"
import type { ViajesGratisAdmin } from "@/lib/datos/viajes-gratis"
import { fechaHora } from "@/lib/fechas"
import { SENTIDOS } from "@/lib/viajes"

const viajesTexto = (n: number) => (n === 1 ? "1 viaje gratis" : `${n} viajes gratis`)
const ESTADO_USO: Record<string, string> = { activa: "apartado", subio: "a bordo", bajo: "viajó" }

/**
 * Viajes gratis en el detalle del pasajero (R102): cuántos le quedan, los regalos (con Quitar, si no se usaron) y en
 * qué viajes los usó; abajo, Regalar viajes.
 */
export function ViajesGratis({ pasajeroId, datos }: { pasajeroId: string; datos: ViajesGratisAdmin }) {
  const [cantidad, setCantidad] = useState("1")
  const [motivo, setMotivo] = useState("")
  const [error, setError] = useState<string>()
  const [listo, setListo] = useState<string>()
  const [pendiente, iniciar] = useTransition()

  const regalar = (e: React.FormEvent) => {
    e.preventDefault()
    const n = Number(cantidad)
    iniciar(async () => {
      const r = await regalarViajes(pasajeroId, n, motivo)
      setError(r.error)
      if (!r.error) {
        setListo(`Listo: ${viajesTexto(n)} más.`)
        setMotivo("")
        setCantidad("1")
      }
    })
  }
  const quitar = (id: string) =>
    iniciar(async () => {
      const r = await quitarRegalo(pasajeroId, id)
      setError(r.error)
      setListo(undefined)
    })

  return (
    <section aria-labelledby="titulo-gratis" className="flex flex-col gap-3 rounded-2xl border-2 bg-card px-4 py-3">
      <div className="flex items-center gap-3">
        <GiftIcon aria-hidden className="size-5 shrink-0 text-success" />
        <div className="min-w-0 flex-1">
          <h2 id="titulo-gratis" className="font-bold">
            Viajes gratis
          </h2>
          <p className="text-sm text-muted-foreground">
            {datos.quedan > 0 ? `Le quedan ${viajesTexto(datos.quedan)}. Los usa cuando quiera desde Mi viaje.` : "No tiene viajes gratis para usar."}
          </p>
        </div>
      </div>

      {datos.regalos.length > 0 && (
        <ul className="flex flex-col divide-y rounded-xl border">
          {datos.regalos.map((g) => (
            <li key={g.id} className="flex items-center gap-2 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {viajesTexto(g.cantidad)} · {g.motivo}
                </p>
                <p className="text-sm text-muted-foreground">{fechaHora(g.creadoEn)}</p>
              </div>
              <Button variant="outline" size="sm" disabled={pendiente} onClick={() => quitar(g.id)} aria-label={`Quitar ${g.motivo}`}>
                <Trash2Icon aria-hidden /> Quitar
              </Button>
            </li>
          ))}
        </ul>
      )}

      {datos.usos.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-bold">Usados ({datos.usos.length})</p>
          <ul className="flex flex-col gap-0.5 text-sm text-muted-foreground">
            {datos.usos.map((u) => (
              <li key={u.reservaId}>
                {fechaHora(u.cuando)} · {SENTIDOS[u.sentido].largo} · con {u.chofer.split(" ")[0]} · {ESTADO_USO[u.estado] ?? u.estado}
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={regalar} className="flex flex-wrap items-end gap-2 border-t pt-3">
        <div className="flex w-24 flex-col gap-1">
          <Label htmlFor="gratis-cantidad">Cuántos</Label>
          <Input
            id="gratis-cantidad"
            type="number"
            inputMode="numeric"
            min={1}
            max={10}
            value={cantidad}
            onChange={(e) => (setCantidad(e.target.value), setListo(undefined))}
          />
        </div>
        <div className="flex min-w-48 flex-1 flex-col gap-1">
          <Label htmlFor="gratis-motivo">Motivo</Label>
          <Input
            id="gratis-motivo"
            maxLength={80}
            placeholder="Premio de la semana 3"
            value={motivo}
            onChange={(e) => (setMotivo(e.target.value), setListo(undefined))}
          />
        </div>
        <Button type="submit" disabled={pendiente}>
          {pendiente ? <Loader2Icon aria-hidden className="animate-spin" /> : <GiftIcon aria-hidden />}
          Regalar viajes
        </Button>
      </form>
      {error && (
        <p role="alert" className="font-bold text-destructive">
          {error}
        </p>
      )}
      {listo && !error && (
        <p role="status" className="font-bold text-success">
          {listo}
        </p>
      )}
    </section>
  )
}
