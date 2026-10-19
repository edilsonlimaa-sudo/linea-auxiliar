import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = { title: "Crear cuenta · Línea Auxiliar" }

// Crear cuenta, paso 1 (docs/especificacion.md §8): recién aquí se pregunta cómo va a usar la app
export default function PaginaEscogerRol() {
  return (
    <div className="flex flex-col gap-6">
      <Link href="/" className="-ml-1 inline-flex w-fit items-center gap-1 py-2 text-lg font-bold text-primary dark:text-foreground">
        <ChevronLeftIcon aria-hidden className="size-6" /> Atrás
      </Link>
      <header>
        <h1 className="text-[26px] leading-tight font-bold">Crear una cuenta</h1>
        <p className="mt-1 text-muted-foreground">¿Cómo vas a usar la app?</p>
      </header>

      <nav aria-label="Tipo de cuenta" className="flex flex-col gap-4">
        <OpcionRol href="/registro/pasajero" icono="🙋" titulo="Soy pasajero" detalle="Ver las unidades y apartar mi puesto" fondoIcono="bg-warning-muted" />
        <OpcionRol href="/registro/chofer" icono="🚐" titulo="Soy chofer" detalle="Publicar mi salida y ordenar mis puestos" fondoIcono="bg-secondary" />
      </nav>

      <p className="text-center text-lg">
        ¿Ya tienes cuenta?{" "}
        <Link href="/" className="font-bold text-primary underline underline-offset-4 dark:text-foreground">
          Entrar
        </Link>
      </p>
    </div>
  )
}

function OpcionRol({ href, icono, titulo, detalle, fondoIcono }: { href: string; icono: string; titulo: string; detalle: string; fondoIcono: string }) {
  return (
    <Link
      href={href}
      className="flex min-h-26 items-center gap-4 rounded-[20px] border-2 bg-card p-4 shadow-sm outline-none active:scale-[0.99] focus-visible:ring-[3px] focus-visible:ring-ring"
    >
      <span aria-hidden className={`grid size-16 shrink-0 place-items-center rounded-2xl text-[34px] ${fondoIcono}`}>
        {icono}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[22px] leading-tight font-bold">{titulo}</span>
        <span className="mt-1 block text-base text-muted-foreground">{detalle}</span>
      </span>
      <ChevronRightIcon aria-hidden className="size-8 shrink-0 text-primary dark:text-foreground" />
    </Link>
  )
}
