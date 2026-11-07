"use client"

import { ChevronRight, ExternalLink } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/nueva/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/nueva/ui/drawer"
import { INSTAGRAM, marcarInstagramOfrecido, PARAM_SEGUIR } from "@/lib/instagram"

/** El ícono de Instagram (lucide ya no trae marcas): cuadrado redondeado, lente y punto */
export function IconoInstagram({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
    </svg>
  )
}

/** R95: la línea del Menú (pasajero y chofer), con el mismo aspecto que las demás */
export function SeguirInstagramItem() {
  return (
    <a href={INSTAGRAM.url} target="_blank" rel="noreferrer" className="flex w-full items-center gap-3 p-3 text-left transition-colors active:bg-muted">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <IconoInstagram className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium">Síguenos en Instagram</p>
        <p className="truncate text-sm text-muted-foreground">@{INSTAGRAM.usuario} · novedades de la línea</p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </a>
  )
}

/**
 * R95: después de calificar un viaje con 4–5 estrellas (Inicio con `?seguir=1` y sin la cookie), una hoja ofrece
 * seguirnos. Una sola vez por teléfono, toque lo que toque: al mostrarse pone la cookie y quita la marca de la dirección
 * para que un refresco no la vuelva a abrir. Siempre montada: `ofrecer` (decidido en el servidor) solo vale al montar, así
 * un refresco en vivo de Inicio (que ya ve la cookie) no la cierra mientras se lee.
 */
export function SeguirInstagramHoja({ ofrecer }: { ofrecer: boolean }) {
  const [abierta, setAbierta] = React.useState(ofrecer)
  const inicial = React.useRef(ofrecer)

  React.useEffect(() => {
    if (!inicial.current) return
    marcarInstagramOfrecido()
    const url = new URL(window.location.href)
    url.searchParams.delete(PARAM_SEGUIR)
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash)
  }, [])

  return (
    <Drawer open={abierta} onOpenChange={setAbierta} showSwipeHandle>
      <DrawerContent className="sm:mx-auto sm:max-w-[430px]">
        <DrawerHeader className="items-center text-center">
          <div className="mb-2 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <IconoInstagram className="size-7" />
          </div>
          <DrawerTitle className="font-heading text-xl">¡Gracias! ¿Nos sigues en Instagram?</DrawerTitle>
          <DrawerDescription>Ahí contamos las novedades de la línea: cambios de horario, choferes nuevos y lo que viene.</DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <Button size="lg" render={<a href={INSTAGRAM.url} target="_blank" rel="noreferrer" onClick={() => setAbierta(false)} />} nativeButton={false}>
            <ExternalLink /> Seguir a @{INSTAGRAM.usuario}
          </Button>
          <Button variant="ghost" size="lg" onClick={() => setAbierta(false)}>
            Ahora no
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
