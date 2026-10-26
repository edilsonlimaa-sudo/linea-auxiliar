"use client"

import { Check, Copy } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/nueva/ui/button"
import { type DatosPagoMovil, nombreBanco, textoPagoMovil } from "@/lib/bancos"
import { type Tarifa, textoTarifa } from "@/lib/tarifas"

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

/** El Pago Móvil del chofer (R74) con el pasaje (R80): Copiar todo primero y cada dato con su toque */
export function PagoMovilCard({ datos, chofer, pasaje }: { datos: DatosPagoMovil; chofer: string; pasaje?: Tarifa }) {
  const [copiado, setCopiado] = React.useState<string | null>(null)
  const tocar = async (clave: string, texto: string) => {
    if (await copiar(texto)) {
      setCopiado(clave)
      window.setTimeout(() => setCopiado((c) => (c === clave ? null : c)), 1800)
    }
  }
  const filas = [
    { clave: "banco", etiqueta: "Banco", valor: nombreBanco(datos.banco), copia: datos.banco },
    { clave: "telefono", etiqueta: "Teléfono", valor: datos.telefono, copia: datos.telefono },
    { clave: "cedula", etiqueta: "Cédula", valor: datos.cedula, copia: datos.cedula },
  ]

  return (
    <section className="flex flex-col gap-3 rounded-3xl border bg-card p-4">
      <div>
        <h2 className="font-heading font-semibold">Pago Móvil de {chofer.split(" ")[0]}</h2>
        <p className="text-sm text-muted-foreground">
          {pasaje ? (
            <>
              Pasaje: <strong className="text-foreground">{textoTarifa(pasaje)}</strong>
            </>
          ) : (
            "Toca para copiar."
          )}
        </p>
      </div>
      <Button size="lg" onClick={() => tocar("todo", textoPagoMovil(datos))}>
        {copiado === "todo" ? <Check /> : <Copy />}
        {copiado === "todo" ? "Copiado: pégalo en tu banco" : "Copiar todo"}
      </Button>
      <ul className="divide-y">
        {filas.map((f) => (
          <li key={f.clave}>
            <button type="button" onClick={() => tocar(f.clave, f.copia)} className="flex w-full items-center gap-3 py-2.5 text-left">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{f.etiqueta}</p>
                <p className="truncate font-medium tabular-nums">{f.valor}</p>
              </div>
              {copiado === f.clave ? (
                <span className="flex items-center gap-1 text-xs text-primary">
                  <Check className="size-4" /> Copiado
                </span>
              ) : (
                <Copy className="size-4 text-muted-foreground" aria-label={`Copiar ${f.etiqueta.toLowerCase()}`} />
              )}
            </button>
          </li>
        ))}
      </ul>
      <p aria-live="polite" className="sr-only">
        {copiado ? "Copiado" : ""}
      </p>
    </section>
  )
}
