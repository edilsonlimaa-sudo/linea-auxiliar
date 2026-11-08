"use client"

import { CarFront, CheckCircle2, Loader2, MessageCircle, UserRound } from "lucide-react"
import { useActionState, useState } from "react"

import { useEnfocarError } from "@/components/formulario/campos"
import { AvisoError, CampoTexto, Grupo } from "@/components/nueva/acceso/campos"
import { Button } from "@/components/nueva/ui/button"
import { type EstadoInteres, registrarInteres } from "@/lib/acciones/interes"
import { FRECUENCIAS, HORARIOS, RUTAS_NUEVAS, type RutaNueva } from "@/lib/rutas-nuevas"
import { cn } from "@/lib/utils"

const inicial: EstadoInteres = {}

/** Opción que se marca como una tarjeta o una pastilla (radio o checkbox nativo, escondido) */
function Opcion({ tipo, name, value, marcada, onChange, children, className }: {
  tipo: "radio" | "checkbox"; name: string; value: string; marcada?: boolean; onChange?: () => void; children: React.ReactNode; className?: string
}) {
  return (
    <label
      className={cn(
        "cursor-pointer rounded-2xl border bg-card transition-colors has-checked:border-primary has-checked:bg-primary/10 has-checked:text-primary has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
        className
      )}
    >
      <input type={tipo} name={name} value={value} defaultChecked={onChange ? undefined : marcada} checked={onChange ? marcada : undefined} onChange={onChange} className="sr-only" />
      {children}
    </label>
  )
}

/** R96: "Me interesa la ruta" (sin cuenta) */
export function FormularioInteres({ ruta }: { ruta: RutaNueva }) {
  const [estado, accion, enviando] = useActionState(registrarInteres, inicial)
  const formulario = useEnfocarError(estado.intento)
  const v = estado.valores ?? {}
  const e = estado.errores ?? {}
  const [rol, setRol] = useState<string>((v.rol as string) ?? "")
  const r = RUTAS_NUEVAS[ruta]
  const chofer = rol === "chofer"

  if (estado.ok) {
    const compartir = () => {
      const texto = `¡Mira! La Línea Auxiliar quiere abrir la ruta ${r.lugar} ⇄ ${r.destino}. Si te interesa, anótate aquí: ${window.location.href.split("?")[0]}`
      window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank", "noreferrer")
    }
    return (
      <section role="status" className="flex flex-col items-center gap-3 rounded-3xl border bg-card p-6 text-center shadow-(--sombra-card)">
        <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CheckCircle2 className="size-8" />
        </div>
        <h2 className="font-heading text-2xl font-semibold">¡Listo, ya te anotamos!</h2>
        <p className="text-muted-foreground">
          Te escribimos por WhatsApp cuando arranque la ruta {r.lugar} ⇄ {r.destino}. Mientras más vecinos se anoten, más rápido
          arrancamos.
        </p>
        <Button size="lg" className="mt-2 h-12 w-full bg-success text-base text-success-foreground hover:bg-success/90" onClick={compartir}>
          <MessageCircle /> Compartir con mis vecinos
        </Button>
      </section>
    )
  }

  return (
    <form ref={formulario} key={estado.intento ?? 0} action={accion} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="ruta" value={ruta} />
      {/* Campo trampa para robots: las personas no lo ven */}
      <input type="text" name="sitio_web" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />
      <AvisoError texto={estado.error} />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-heading text-lg font-semibold">¿Cómo usarías la ruta?</legend>
        <div className="grid grid-cols-2 gap-3">
          <Opcion tipo="radio" name="rol" value="pasajero" marcada={rol === "pasajero"} onChange={() => setRol("pasajero")} className="p-4">
            <UserRound className="mb-2 size-6" />
            <span className="block font-heading font-semibold">Pasajero</span>
            <span className="block text-sm text-muted-foreground">Quiero viajar</span>
          </Opcion>
          <Opcion tipo="radio" name="rol" value="chofer" marcada={rol === "chofer"} onChange={() => setRol("chofer")} className="p-4">
            <CarFront className="mb-2 size-6" />
            <span className="block font-heading font-semibold">Chofer</span>
            <span className="block text-sm text-muted-foreground">Tengo carro y quiero trabajar</span>
          </Opcion>
        </div>
        {e.rol ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {e.rol}
          </p>
        ) : null}
      </fieldset>

      <Grupo titulo="Tus datos">
        <CampoTexto etiqueta="Nombre y apellido" name="nombre" autoComplete="name" placeholder="Ej. María González" defaultValue={v.nombre as string} error={e.nombre} required />
        <CampoTexto
          etiqueta="WhatsApp"
          name="telefono"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0414-1234567"
          defaultValue={v.telefono as string}
          error={e.telefono}
          ayuda="Por aquí te avisamos cuando arranque la ruta."
          required
        />
        <CampoTexto
          etiqueta="¿En qué microcondominio vives?"
          name="sector"
          maxLength={60}
          autoComplete="off"
          placeholder={r.ejemploSector}
          defaultValue={v.sector as string}
          error={e.sector}
          required
        />
      </Grupo>

      <Grupo titulo={chofer ? "¿Cuándo podrías trabajar?" : "¿A qué hora viajarías?"} detalle="Marca todas las que sirvan.">
        <div className="grid grid-cols-2 gap-2">
          {HORARIOS.map((h) => (
            <Opcion key={h.id} tipo="checkbox" name="horarios" value={h.id} marcada={(v.horarios as string[] | undefined)?.includes(h.id)} className="px-3 py-2.5">
              <span className="block font-medium">{h.nombre}</span>
              <span className="block text-sm text-muted-foreground">{h.detalle}</span>
            </Opcion>
          ))}
        </div>
        {e.horarios ? <p role="alert" className="text-sm font-medium text-destructive">{e.horarios}</p> : null}
      </Grupo>

      {chofer ? (
        <Grupo titulo="Tu carro (opcional)">
          <CampoTexto etiqueta="Modelo y color" name="carro" maxLength={60} placeholder="Ej.: Chevrolet Aveo gris" defaultValue={v.carro as string} error={e.carro} />
        </Grupo>
      ) : (
        <Grupo titulo="¿Cuántos días a la semana viajarías?">
          <div className="grid grid-cols-3 gap-2">
            {FRECUENCIAS.map((f) => (
              <Opcion key={f.id} tipo="radio" name="frecuencia" value={f.id} marcada={v.frecuencia === f.id} className="px-2 py-3 text-center font-medium">
                {f.nombre}
              </Opcion>
            ))}
          </div>
        </Grupo>
      )}

      <Grupo titulo="¿Algo más? (opcional)">
        <CampoTexto
          etiqueta="Comentario"
          name="comentario"
          maxLength={280}
          placeholder={chofer ? "Ej.: tengo carro de 5 puestos" : "Ej.: salgo a las 6:30 para el trabajo"}
          defaultValue={v.comentario as string}
          error={e.comentario}
        />
      </Grupo>

      <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={enviando}>
        {enviando ? <Loader2 className="animate-spin" /> : null}
        {enviando ? "Enviando…" : "Me interesa"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">No creas una cuenta: solo nos dices que te interesa. Tus datos los ve solo el administrador de la línea.</p>
    </form>
  )
}
