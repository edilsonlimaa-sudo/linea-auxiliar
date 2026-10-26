import { ArrowRight, Building2, Home } from "lucide-react"
import Link from "next/link"

/**
 * "¿Hacia dónde vas?" (§8): nunca viene un sentido escogido; cada uno es su pantalla. Con cuántas unidades van al Centro
 * y cuántos esperan en Gina.
 */
export function DirectionPicker({ alCentro, enGina }: { alCentro: number; enGina: number }) {
  const opciones = [
    {
      href: "/n/al-centro",
      titulo: "Al Centro",
      detalle: alCentro === 0 ? "Desde Valle Grande · ningún carro ahora" : `Desde Valle Grande · ${alCentro === 1 ? "1 carro" : `${alCentro} carros`}`,
      icon: Building2,
    },
    {
      href: "/n/a-valle-grande",
      titulo: "A Valle Grande",
      detalle: enGina === 0 ? "Desde Gina, en el Centro" : `Desde Gina · ${enGina === 1 ? "1 persona" : `${enGina} personas`} en la lista`,
      icon: Home,
    },
  ] as const

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-2xl font-semibold">¿Hacia dónde vas?</h2>
      {opciones.map(({ href, titulo, detalle, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          transitionTypes={["nav-forward"]}
          className="flex items-center gap-4 rounded-3xl border bg-card p-4 text-card-foreground transition-colors active:bg-muted"
        >
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-heading text-lg font-semibold">{titulo}</p>
            <p className="text-sm text-muted-foreground">{detalle}</p>
          </div>
          <ArrowRight className="size-5 text-muted-foreground" />
        </Link>
      ))}
    </section>
  )
}
