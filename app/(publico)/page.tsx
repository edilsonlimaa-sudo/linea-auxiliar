import { ChevronRightIcon } from "lucide-react"
import Link from "next/link"

// Portada (sin sesión). Con sesión, el proxy manda directo a /inicio.
export default function Portada() {
  return (
    <div className="flex flex-col gap-6">
      <section className="-mx-4 -mt-5 rounded-b-[28px] bg-gradient-to-b from-header to-[#0e4a80] px-5 pt-7 pb-7 text-center text-header-foreground dark:to-[#0f3456]">
        {/* eslint-disable-next-line @next/next/no-img-element -- ícono SVG local */}
        <img src="/icon.svg" alt="" width={88} height={88} className="mx-auto size-22 rounded-3xl shadow-lg" />
        <p className="mt-4 text-sm font-bold tracking-[0.15em] text-signal uppercase">Transporte comunitario</p>
        <h1 className="mt-1 text-[32px] leading-tight font-bold">
          Línea Auxiliar
          <span className="mt-1 block text-2xl font-normal opacity-95">Valle Grande</span>
        </h1>
        <p className="mt-5 inline-flex items-center gap-2.5 rounded-full bg-header-foreground/12 px-4 py-2 font-bold">
          Valle Grande <span aria-label="ida y vuelta" className="text-xl text-signal">⇄</span> Centro de Maturín
        </p>
      </section>

      <h2 className="text-center text-[22px] font-bold">¿Cómo vas a usar la app?</h2>

      <nav aria-label="Crear cuenta" className="flex flex-col gap-4">
        <OpcionRol
          href="/registro/pasajero"
          icono="🙋"
          titulo="Soy pasajero"
          detalle="Ver las unidades y apartar mi puesto"
          fondoIcono="bg-warning-muted"
        />
        <OpcionRol
          href="/registro/chofer"
          icono="🚐"
          titulo="Soy chofer"
          detalle="Publicar mi salida y ordenar mis puestos"
          fondoIcono="bg-secondary"
        />
      </nav>

      <p className="text-center text-lg">
        ¿Ya tienes cuenta?{" "}
        <Link href="/entrar" className="font-bold text-primary underline underline-offset-4 dark:text-foreground">
          Entrar
        </Link>
      </p>
    </div>
  )
}

function OpcionRol({
  href,
  icono,
  titulo,
  detalle,
  fondoIcono,
}: {
  href: string
  icono: string
  titulo: string
  detalle: string
  fondoIcono: string
}) {
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
