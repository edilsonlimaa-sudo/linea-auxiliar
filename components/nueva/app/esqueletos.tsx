import { AppHeader } from "@/components/nueva/app/app-header"
import { Skeleton } from "@/components/nueva/ui/skeleton"

/**
 * Lo que se ve mientras llega una pestaña (los `loading.tsx` de `(tabs)`): el toque responde al momento con la forma
 * de la pantalla y, por tener este límite, Next deja la pestaña lista de antemano hasta aquí. Sin `Screen` (no anima).
 */
export function EsqueletoPantalla({ titulo, children }: { titulo?: string; children: React.ReactNode }) {
  return (
    <main className="flex flex-1 flex-col" aria-busy="true">
      <AppHeader title={titulo ?? <Skeleton className="h-5 w-32" />} />
      <div className="flex flex-col gap-6 p-4">
        {children}
        <span className="sr-only">Cargando…</span>
      </div>
    </main>
  )
}

/** Una lista en tarjeta, con avatar o ícono y dos líneas por fila */
export function EsqueletoLista({ filas = 3, redondo = true }: { filas?: number; redondo?: boolean }) {
  return (
    <div className="divide-y overflow-hidden rounded-3xl border bg-card">
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton className={redondo ? "size-10 shrink-0 rounded-full" : "size-10 shrink-0 rounded-2xl"} />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Título de sección */
export function EsqueletoTitulo() {
  return <Skeleton className="h-5 w-36" />
}
