import { BotonTema } from "@/components/boton-tema"
import { EnlaceInicio } from "@/components/enlace-inicio"

// Barra superior: azul marino con franja amarilla, como un letrero de transporte
export function Cabecera() {
  return (
    <header className="sticky top-0 z-20 border-b-4 border-signal bg-header text-header-foreground">
      <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-2.5">
        <EnlaceInicio className="flex min-w-0 flex-1 items-center gap-3 rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring">
          {/* eslint-disable-next-line @next/next/no-img-element -- ícono SVG local, no necesita optimización */}
          <img src="/icon.svg" alt="" width={38} height={38} className="size-9.5 rounded-[10px]" />
          <span className="min-w-0">
            <span className="block text-base leading-tight font-bold">Línea Auxiliar</span>
            <span className="block text-sm leading-tight opacity-90">Valle Grande</span>
          </span>
        </EnlaceInicio>
        <BotonTema />
      </div>
    </header>
  )
}
