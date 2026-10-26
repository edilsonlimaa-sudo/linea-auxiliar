"use client"

import { Camera, Loader2 } from "lucide-react"

import { useSubirFoto } from "@/components/foto/subir-foto"
import { Button } from "@/components/nueva/ui/button"

/** Poner o cambiar la foto del perfil (R54), con el mismo envío que la clásica */
export function CambiarFoto({ tieneFoto }: { tieneFoto: boolean }) {
  const { campo, abrir, subiendo, error } = useSubirFoto("perfil")
  return (
    <div className="flex flex-col gap-2">
      {campo}
      <Button variant="outline" size="lg" disabled={subiendo} onClick={abrir}>
        {subiendo ? <Loader2 className="animate-spin" /> : <Camera />}
        {subiendo ? "Subiendo…" : tieneFoto ? "Cambiar mi foto" : "Poner mi foto"}
      </Button>
      {error ? (
        <p role="alert" className="text-center text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
