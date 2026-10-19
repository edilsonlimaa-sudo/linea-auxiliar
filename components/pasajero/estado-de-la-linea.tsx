import { BusIcon } from "lucide-react"

import { EstadoLinea } from "@/components/pasajero/estado-linea"
import { cn } from "@/lib/utils"
import { SENTIDOS, type Sentido } from "@/lib/viajes"

export type ResumenSentido = { cuantas: number; proxima: string | null } // proxima: "recoge en Valle Grande en ~5 min"

/**
 * "¿Cómo está la línea?" (§8): lo que todos quieren saber al abrir, sin comprometerse a nada. Choferes trabajando,
 * una línea por sentido y el aviso del día.
 */
export function EstadoDeLaLinea({
  choferes,
  porSentido,
  aviso,
}: {
  choferes: number
  porSentido: Record<Sentido, ResumenSentido>
  aviso: { texto: string } | null
}) {
  return (
    <section aria-labelledby="titulo-linea" className="flex flex-col gap-3 rounded-3xl border-2 bg-card p-4">
      <h2 id="titulo-linea" className="text-lg font-bold">
        ¿Cómo está la línea?
      </h2>
      <p className="flex items-center gap-2.5 text-lg font-bold">
        <span aria-hidden className={cn("size-3 shrink-0 rounded-full", choferes > 0 ? "bg-success" : "bg-muted-foreground")} />
        {choferes === 0 ? "Ningún chofer trabajando ahora" : choferes === 1 ? "1 chofer trabajando ahora" : `${choferes} choferes trabajando ahora`}
      </p>
      <ul className="flex flex-col gap-2">
        {(Object.keys(SENTIDOS) as Sentido[]).map((s) => {
          const { cuantas, proxima } = porSentido[s]
          return (
            <li key={s} className="flex items-start gap-3 rounded-2xl bg-muted px-3 py-2.5">
              <BusIcon aria-hidden className={cn("mt-0.5 size-5 shrink-0", cuantas > 0 ? "text-primary" : "text-muted-foreground")} />
              <span className="min-w-0">
                <span className="block font-bold">
                  {SENTIDOS[s].corto}
                  <span className="font-normal text-muted-foreground">
                    {" · "}
                    {cuantas === 0 ? "sin unidades ahora" : cuantas === 1 ? "1 unidad" : `${cuantas} unidades`}
                  </span>
                </span>
                {proxima && <span className="block text-[15px] text-muted-foreground">La próxima {proxima}</span>}
              </span>
            </li>
          )
        })}
      </ul>
      {aviso && <EstadoLinea aviso={aviso} />}
    </section>
  )
}
