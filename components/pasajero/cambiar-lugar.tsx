"use client"

import { PencilIcon } from "lucide-react"
import { useState } from "react"

import { HojaLugar } from "@/components/pasajero/hoja-lugar"
import { Button } from "@/components/ui/button"
import { cambiarLugar } from "@/lib/acciones/pasajero"

/** "Cambiar" junto a "Te recoge en …" (R27): misma hoja de lugar que al apartar */
export function CambiarLugar({ reservaId, recientes, lugarActual }: { reservaId: string; recientes: string[]; lugarActual: string | null }) {
  const [hoja, setHoja] = useState(false)
  return (
    <>
      <Button variant="outline" size="sm" className="self-start" onClick={() => setHoja(true)}>
        <PencilIcon aria-hidden />
        Cambiar dónde me recogen
      </Button>
      <HojaLugar
        abierta={hoja}
        onCambiar={setHoja}
        titulo="¿Dónde te recogemos?"
        descripcion="El chofer ve el lugar nuevo enseguida."
        recientes={recientes}
        lugarInicial={lugarActual}
        textoBoton="Guardar"
        onEnviar={async (datos) => {
          const r = await cambiarLugar(reservaId, datos)
          if (r.ok) setHoja(false)
          return r
        }}
      />
    </>
  )
}
