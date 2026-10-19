import { UserPlusIcon } from "lucide-react"
import Link from "next/link"

import { FormularioEntrar } from "@/components/formulario/formulario-entrar"
import { buttonVariants } from "@/components/ui/button"

// Portada (sin sesión) = Entrar (docs/especificacion.md §8): casi siempre la abre alguien que ya tiene cuenta.
// Crear una cuenta es el camino secundario, y recién ahí se pregunta si es pasajero o chofer.
// Con sesión, el proxy manda directo a /inicio.
export default function Portada() {
  return (
    <div className="flex flex-col gap-6">
      {/* La barra de arriba ya dice el nombre: aquí solo qué es y por dónde va, en poco espacio (entrar va primero) */}
      <p className="-mx-4 -mt-5 bg-header px-4 pt-1 pb-4 text-center text-header-foreground">
        <span className="block text-sm font-bold tracking-[0.15em] text-signal uppercase">Transporte comunitario</span>
        <span className="mt-1 inline-flex items-center gap-2 font-bold">
          Valle Grande <span aria-label="ida y vuelta" className="text-lg text-signal">⇄</span> Centro de Maturín
        </span>
      </p>

      <section aria-labelledby="titulo-entrar" className="flex flex-col gap-4">
        <header>
          <h1 id="titulo-entrar" className="text-[26px] leading-tight font-bold">
            Entrar
          </h1>
          <p className="mt-1 text-muted-foreground">Con tu número de celular y tu PIN.</p>
        </header>
        <FormularioEntrar />
        <p className="text-center text-muted-foreground">¿Olvidaste tu PIN? Pídele al administrador de la línea un PIN nuevo.</p>
      </section>

      <section aria-labelledby="titulo-nueva" className="flex flex-col gap-3 border-t-2 pt-6 text-center">
        <h2 id="titulo-nueva" className="text-lg font-bold">
          ¿Primera vez en la línea?
        </h2>
        <Link href="/registro" className={buttonVariants({ variant: "outline", className: "w-full" })}>
          <UserPlusIcon aria-hidden />
          Crear una cuenta
        </Link>
      </section>
    </div>
  )
}
