import { ShieldIcon, UserPlusIcon } from "lucide-react"
import { cookies } from "next/headers"
import Link from "next/link"

import { FormularioEntrar } from "@/components/formulario/formulario-entrar"
import { buttonVariants } from "@/components/ui/button"
import { APARATO_ADMIN } from "@/lib/admin"

// Portada (sin sesión) = Entrar (docs/especificacion.md §8): casi siempre la abre alguien que ya tiene cuenta.
// Crear una cuenta es el camino secundario, y recién ahí se pregunta si es pasajero o chofer.
// Con sesión, el proxy manda directo a /inicio.
export default async function Portada() {
  // Solo en aparatos donde el admin ya entró (§8); en los demás, la entrada queda escondida (5 toques al logo)
  const aparatoAdmin = (await cookies()).has(APARATO_ADMIN)

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

      {aparatoAdmin && (
        <Link
          href="/admin/entrar"
          className="mx-auto inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 text-[15px] text-muted-foreground underline underline-offset-4 outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          <ShieldIcon aria-hidden className="size-4" />
          Entrar como administrador
        </Link>
      )}
    </div>
  )
}
