"use client"

import { CheckIcon, ChevronDownIcon, CopyIcon, SmartphoneIcon } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { type DatosPagoMovil, nombreBanco, textoPagoMovil } from "@/lib/bancos"
import { type Tarifa, textoTarifa } from "@/lib/tarifas"
import { cn } from "@/lib/utils"

// Copiar al portapapeles; si el navegador no deja (sin HTTPS o viejo), con un campo escondido
async function copiar(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    const campo = document.createElement("textarea")
    campo.value = texto
    campo.setAttribute("readonly", "")
    campo.style.position = "fixed"
    campo.style.opacity = "0"
    document.body.appendChild(campo)
    campo.select()
    const ok = document.execCommand("copy")
    campo.remove()
    return ok
  }
}

/**
 * El Pago Móvil del chofer para el pasajero (R74): Copiar todo, grande y arriba (las apps de los bancos lo pegan de una
 * vez), y debajo cada dato con su Copiar chico. A bordo va abierto; esperando el carro, plegado.
 */
export function PagoMovilChofer({
  datos,
  chofer,
  plegado = false,
  titulo: tituloFijo,
  pasaje,
}: {
  datos: DatosPagoMovil
  chofer: string
  plegado?: boolean
  titulo?: string // otro título (la cuota del día lleva el Pago Móvil de la línea, R77)
  pasaje?: Tarifa // cuánto pagar (R80): se dice aquí, al pagar
}) {
  const [copiado, setCopiado] = useState<string | null>(null)
  const tocar = async (clave: string, texto: string) => {
    if (await copiar(texto)) {
      setCopiado(clave)
      setTimeout(() => setCopiado((c) => (c === clave ? null : c)), 2000)
    }
  }

  const filas = [
    { clave: "banco", etiqueta: "Banco", valor: nombreBanco(datos.banco), copia: datos.banco },
    { clave: "telefono", etiqueta: "Teléfono", valor: datos.telefono, copia: datos.telefono },
    { clave: "cedula", etiqueta: "Cédula", valor: datos.cedula, copia: datos.cedula },
  ]
  const titulo = tituloFijo ?? `Pago Móvil de ${chofer.split(" ")[0]}`

  // Copiar todo primero: las apps de los bancos lo pegan en todos los campos de una vez (R74)
  const contenido = (
    <div className="flex flex-col gap-3">
      {pasaje && (
        <p className="text-base">
          Pasaje: <strong>{textoTarifa(pasaje)}</strong>
        </p>
      )}
      <Button size="lg" onClick={() => tocar("todo", textoPagoMovil(datos))} className={cn("w-full", copiado === "todo" && "bg-success text-success-foreground hover:bg-success")}>
        {copiado === "todo" ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
        {copiado === "todo" ? "Copiado: pégalo en tu banco" : "Copiar todo"}
      </Button>
      <ul className="flex flex-col divide-y rounded-xl bg-muted">
        {filas.map((f) => (
          <li key={f.clave} className="flex items-center gap-3 px-3 py-1.5">
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-muted-foreground">{f.etiqueta}</span>
              <span className="block truncate font-mono text-base font-bold">{f.valor}</span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => tocar(f.clave, f.copia)}
              aria-label={`Copiar ${f.etiqueta.toLowerCase()}`}
              className={cn("text-primary", copiado === f.clave && "text-success")}
            >
              {copiado === f.clave ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
              {copiado === f.clave ? "Copiado" : "Copiar"}
            </Button>
          </li>
        ))}
      </ul>
      {/* Para lectores de pantalla: avisa al copiar */}
      <p aria-live="polite" className="sr-only">
        {copiado ? "Copiado" : ""}
      </p>
    </div>
  )

  if (plegado) {
    return (
      <details className="group rounded-2xl border-2 bg-card">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-2xl px-4 py-2 font-bold focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
          <SmartphoneIcon aria-hidden className="size-5 text-primary" />
          <span className="flex-1">{titulo}</span>
          <ChevronDownIcon aria-hidden className="size-5 transition-transform group-open:rotate-180" />
        </summary>
        <div className="px-4 pb-4">{contenido}</div>
      </details>
    )
  }
  return (
    <section aria-label={titulo} className="flex flex-col gap-3 rounded-2xl border-2 bg-card p-4">
      <h2 className="flex items-center gap-2 text-base font-bold">
        <SmartphoneIcon aria-hidden className="size-5 text-primary" />
        {titulo}
      </h2>
      {contenido}
    </section>
  )
}
