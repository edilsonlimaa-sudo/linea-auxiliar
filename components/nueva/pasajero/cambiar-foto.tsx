"use client"

import { Camera, Loader2 } from "lucide-react"

import { useSubirFoto } from "@/components/foto/subir-foto"
import { Button } from "@/components/nueva/ui/button"

/** Poner o cambiar la foto del perfil o del carro (R54), con el mismo envío que la clásica */
export function CambiarFoto({ tieneFoto, tipo = "perfil" }: { tieneFoto: boolean; tipo?: "perfil" | "carro" }) {
  const { campo, abrir, subiendo, error } = useSubirFoto(tipo)
  const que = tipo === "carro" ? "la foto del carro" : "mi foto"
  return (
    <div className="flex flex-col gap-2">
      {campo}
      <Button variant="outline" size="lg" disabled={subiendo} onClick={abrir}>
        {subiendo ? <Loader2 className="animate-spin" /> : <Camera />}
        {subiendo ? "Subiendo…" : tieneFoto ? `Cambiar ${que}` : `Poner ${que}`}
      </Button>
      {error ? (
        <p role="alert" className="text-center text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
