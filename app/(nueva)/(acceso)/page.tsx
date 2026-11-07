import { Shield, UserPlus } from "lucide-react"
import { cookies } from "next/headers"
import Link from "next/link"

import { FormularioEntrar } from "@/components/nueva/acceso/formularios"
import { Marca } from "@/components/nueva/acceso/marca"
import { Screen } from "@/components/nueva/app/screen"
import { buttonVariants } from "@/components/nueva/ui/button"
import { APARATO_ADMIN } from "@/lib/admin"

// Portada (sin sesión) = Entrar (docs/especificacion.md §8), con el aspecto de la nueva para todos (R84): casi siempre la
// abre alguien que ya tiene cuenta. Crear una cuenta es el camino secundario. Con sesión, el proxy manda directo a /inicio.
export default async function Portada() {
  // Solo en aparatos donde el admin ya entró (§8); en los demás, la entrada queda escondida (5 toques al logo)
  const aparatoAdmin = (await cookies()).has(APARATO_ADMIN)

  return (
    <Screen>
      <div className="flex flex-1 flex-col gap-6 px-5 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <Marca />
        <p className="font-heading text-3xl leading-tight font-semibold text-balance">
          Tu puesto en el carro, <span className="text-primary">sin adivinar.</span>
        </p>

        <section aria-labelledby="titulo-entrar" className="flex flex-col gap-4 rounded-3xl border bg-card p-5 shadow-(--sombra-card)">
          <header>
            <h1 id="titulo-entrar" className="font-heading text-xl font-semibold">
              Entrar
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Con tu número de celular y tu PIN.</p>
          </header>
          <FormularioEntrar />
          <p className="text-center text-sm text-muted-foreground">¿Olvidaste tu PIN? Pídele al administrador de la línea un PIN nuevo.</p>
        </section>

        <section aria-labelledby="titulo-nueva" className="flex flex-col gap-3 text-center">
          <h2 id="titulo-nueva" className="font-heading font-semibold">
            ¿Primera vez en la línea?
          </h2>
          <Link href="/registro" className={buttonVariants({ variant: "outline", size: "lg", className: "h-12 w-full text-base" })}>
            <UserPlus />
            Crear una cuenta
          </Link>
        </section>

        {aparatoAdmin ? (
          <Link
            href="/admin/entrar"
            className="mx-auto inline-flex min-h-11 items-center gap-1.5 rounded-2xl px-3 text-sm text-muted-foreground underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Shield aria-hidden className="size-4" />
            Entrar como administrador
          </Link>
        ) : null}
      </div>
    </Screen>
  )
}
