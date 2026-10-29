import { ChoferAvatar } from "@/components/nueva/pasajero/comunes"
import type { ServicioVista } from "@/lib/nueva/vistas"

/** La línea ahora (§8): quiénes trabajan y qué hace cada uno */
export function LineaAhora({ choferes }: { choferes: ServicioVista[] }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="font-heading text-lg font-semibold">La línea ahora</h2>
        <span className="text-sm text-muted-foreground">
          {choferes.length === 0 ? "Nadie trabajando" : choferes.length === 1 ? "1 chofer" : `${choferes.length} choferes`}
        </span>
      </div>
      {choferes.length === 0 ? (
        <p className="rounded-3xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Ningún chofer está trabajando ahora. Esta pantalla se actualiza sola.
        </p>
      ) : (
        <ul className="divide-y overflow-hidden rounded-3xl border bg-card">
          {choferes.map((c) => (
            <li key={c.id} className="flex items-center gap-3 p-3">
              <ChoferAvatar chofer={c} className="size-10" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.nombre}</p>
                <p className="truncate text-sm text-muted-foreground">{c.actividad}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
