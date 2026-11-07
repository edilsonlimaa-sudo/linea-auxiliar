import { EnlaceInicio } from "@/components/enlace-inicio"

/** Logo y nombre arriba de la portada. En la portada esconde la entrada del admin: 5 toques al logo (§8) */
export function Marca() {
  return (
    <EnlaceInicio className="flex w-fit items-center gap-3 rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
      {/* eslint-disable-next-line @next/next/no-img-element -- ícono local de la app (app/icon.svg → scripts/iconos.mjs) */}
      <img src="/icono-192.png" alt="" width={56} height={56} className="size-14 rounded-2xl shadow-(--sombra-card)" />
      <span>
        <span className="block font-heading text-xl leading-tight font-semibold">Línea Auxiliar</span>
        <span className="block text-sm text-muted-foreground">Valle Grande ⇄ Centro de Maturín</span>
      </span>
    </EnlaceInicio>
  )
}
