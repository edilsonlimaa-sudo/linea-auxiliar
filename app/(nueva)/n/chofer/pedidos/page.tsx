import { CirclePlus } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { EnVivo } from "@/components/en-vivo"
import { AppHeader } from "@/components/nueva/app/app-header"
import { Screen } from "@/components/nueva/app/screen"
import { ListaPedidos } from "@/components/nueva/chofer/pedidos"
import { Button } from "@/components/nueva/ui/button"
import { cargarInicioChofer } from "@/lib/datos/inicio-chofer"
import { exigirCuentaAprobada } from "@/lib/sesion"

export const metadata: Metadata = { title: "Esperando en Valle Grande · Línea Auxiliar" }

const personas = (n: number) => (n === 1 ? "1 persona" : `${n} personas`)

/**
 * R117: quienes pidieron "Avísame cuando salga un carro" al Centro y siguen esperando, en orden, con Llamar y WhatsApp.
 * El teléfono, solo con el chofer conectado (§6). Desde aquí, publicar un viaje al Centro (que además les avisa, R94).
 */
export default async function PedidosAlCentro() {
  const perfil = await exigirCuentaAprobada({ interfaz: "nueva-chofer" })
  const conectado = perfil.conectado_en !== null
  const { pedidosCentro } = await cargarInicioChofer(perfil.id, conectado)
  const total = pedidosCentro.reduce((n, p) => n + p.personas, 0)

  return (
    <Screen>
      <EnVivo />
      <AppHeader title="Esperando en Valle Grande" backHref="/n/chofer" />
      <div className="flex flex-col gap-4 p-4">
        <p className="text-sm text-muted-foreground">
          {pedidosCentro.length === 0
            ? "Ahora nadie está esperando aviso."
            : `${personas(total)} ${total === 1 ? "pidió" : "pidieron"} que les avisemos cuando salga un carro al Centro. Al publicar uno, les llega el aviso.`}
        </p>
        {!conectado && pedidosCentro.length > 0 ? (
          <p className="rounded-2xl bg-muted p-3 text-sm">Conéctate para ver sus teléfonos y escribirles.</p>
        ) : null}
        <ListaPedidos pedidos={pedidosCentro} />
        <Button size="lg" render={<Link href="/n/chofer/publicar?modo=primero" transitionTypes={["nav-forward"]} />} nativeButton={false}>
          <CirclePlus className="size-5" />
          Publicar un viaje
        </Button>
      </div>
    </Screen>
  )
}
