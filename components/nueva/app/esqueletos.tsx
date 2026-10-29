import { AppHeader } from "@/components/nueva/app/app-header"
import { Skeleton } from "@/components/nueva/ui/skeleton"

/**
 * Lo que se ve mientras llega una pantalla (los `loading.tsx`): el toque responde al momento con la forma de la
 * pantalla y, por tener este límite, Next la deja lista de antemano hasta aquí (también con mala señal: los datos
 * siguen en el servidor, solo la forma llega antes). `backHref`: la flecha, para poder volver mientras carga. Sin
 * `Screen` (no anima).
 */
export function EsqueletoPantalla({ titulo, backHref, children }: { titulo?: string; backHref?: string; children: React.ReactNode }) {
  return (
    <main className="flex flex-1 flex-col" aria-busy="true">
      <AppHeader title={titulo ?? <Skeleton className="h-5 w-32" />} backHref={backHref} />
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

/** Una tarjeta: etiqueta, título y unas líneas (el viaje, el chofer, un formulario) */
export function EsqueletoTarjeta({ lineas = 2 }: { lineas?: number }) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl border bg-card p-4">
      <Skeleton className="h-5 w-24 rounded-full" />
      <Skeleton className="h-7 w-1/2" />
      {Array.from({ length: lineas }, (_, i) => (
        <Skeleton key={i} className={i % 2 ? "h-4 w-2/3" : "h-4 w-4/5"} />
      ))}
    </div>
  )
}

/** Título de sección */
export function EsqueletoTitulo() {
  return <Skeleton className="h-5 w-36" />
}
