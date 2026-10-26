"use client"

import { CheckIcon, Loader2Icon, RotateCcwIcon } from "lucide-react"
import Link from "next/link"
import { useState, useTransition } from "react"

import { Estrellas } from "@/components/estrellas"
import { Avatar } from "@/components/foto/avatar"
import { Button } from "@/components/ui/button"
import { marcarSugerencia } from "@/lib/acciones/sugerencias"
import type { SugerenciaAdmin } from "@/lib/datos/sugerencias"
import { diaYHora } from "@/lib/fechas"
import { cn } from "@/lib/utils"

/** Sugerencias y opiniones (R81–R82): las no leídas primero, con quién y cuándo; Marcar leída */
export function SugerenciasLista({ sugerencias }: { sugerencias: SugerenciaAdmin[] }) {
  if (sugerencias.length === 0) {
    return <p className="rounded-2xl border-2 border-dashed px-4 py-6 text-center text-muted-foreground">Todavía no llegan sugerencias.</p>
  }
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {sugerencias.map((s) => (
        <Fila key={s.id} s={s} />
      ))}
    </ul>
  )
}

function Fila({ s }: { s: SugerenciaAdmin }) {
  const [pendiente, iniciar] = useTransition()
  const [error, setError] = useState<string>()
  const perfil = s.rol === "chofer" ? `/admin/choferes/${s.autorId}` : `/admin/pasajeros/${s.autorId}`
  const marcar = () =>
    iniciar(async () => {
      const r = await marcarSugerencia(s.id, !s.leida)
      setError(r.error)
    })

  return (
    <li className={cn("flex flex-col gap-3 rounded-2xl border-2 bg-card p-4", !s.leida && "border-primary")}>
      <div className="flex items-center gap-3">
        <Avatar url={s.fotoUrl} nombre={s.autor} className="size-10 text-sm" />
        <div className="min-w-0 flex-1">
          <Link href={perfil} className="block truncate font-bold hover:underline">
            {s.autor}
          </Link>
          <p className="text-sm text-muted-foreground">
            {s.rol === "chofer" ? "Chofer" : "Pasajero"} · {diaYHora(s.creadaEn)}
          </p>
        </div>
        {!s.leida && <span className="shrink-0 rounded-full bg-primary px-2.5 py-0.5 text-sm font-bold text-primary-foreground">Nueva</span>}
      </div>
      {s.estrellas !== null && (
        <p className="flex items-center gap-2 text-sm font-bold">
          Opinión sobre la app: <Estrellas valor={s.estrellas} tamano="size-4" />
        </p>
      )}
      {s.texto && <p className="whitespace-pre-line">{s.texto}</p>}
      {error && (
        <p role="alert" className="font-bold text-destructive">
          {error}
        </p>
      )}
      <Button variant="outline" size="sm" className="self-start" disabled={pendiente} onClick={marcar}>
        {pendiente ? <Loader2Icon aria-hidden className="animate-spin" /> : s.leida ? <RotateCcwIcon aria-hidden /> : <CheckIcon aria-hidden />}
        {s.leida ? "Marcar no leída" : "Marcar leída"}
      </Button>
    </li>
  )
}
