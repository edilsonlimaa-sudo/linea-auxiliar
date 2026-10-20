import type { Metadata } from "next"

import { EnVivo } from "@/components/en-vivo"
import { EstadoLinea } from "@/components/pasajero/estado-linea"
import { MapaLinea } from "@/components/pasajero/mapa-linea"
import { cargarInicioPasajero } from "@/lib/datos/inicio-pasajero"
import { exigirCuentaAprobada } from "@/lib/sesion"

export const metadata: Metadata = { title: "La línea · Línea Auxiliar" }

// La línea (docs/especificacion.md §8): ¿cómo está la línea y por dónde van los carros? Se actualiza sola.
export default async function PaginaLinea() {
  const perfil = await exigirCuentaAprobada()
  const { enServicio, aviso } = await cargarInicioPasajero(perfil.id)
  const n = enServicio.length

  return (
    <div className="flex flex-col gap-5">
      <EnVivo />
      <header className="flex flex-col gap-1">
        <h1 className="text-[26px] leading-tight font-bold">La línea</h1>
        <p className="flex items-center gap-2 text-muted-foreground">
          <span aria-hidden className={n > 0 ? "size-2.5 rounded-full bg-success" : "size-2.5 rounded-full bg-muted-foreground"} />
          {n === 0 ? "Ningún chofer trabajando ahora" : n === 1 ? "1 chofer trabajando ahora" : `${n} choferes trabajando ahora`}
        </p>
      </header>
      {aviso && <EstadoLinea aviso={aviso} />}
      <MapaLinea choferes={enServicio} />
    </div>
  )
}
