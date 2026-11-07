import { CheckCircle2, Clock, MessageCircle, RotateCw, XCircle } from "lucide-react"
import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { BotonSalir } from "@/components/nueva/acceso/formularios"
import { AppHeader } from "@/components/nueva/app/app-header"
import { Screen } from "@/components/nueva/app/screen"
import { CambiarFoto } from "@/components/nueva/pasajero/cambiar-foto"
import { ChoferAvatar } from "@/components/nueva/pasajero/comunes"
import { Button, buttonVariants } from "@/components/nueva/ui/button"
import { enlaceWhatsappAdmin, WHATSAPP_ADMIN_VISIBLE } from "@/lib/contacto"
import { firmarFotos } from "@/lib/fotos"
import { inicioDe, obtenerPerfil } from "@/lib/sesion"
import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"
import { cn } from "@/lib/utils"
import { iniciales } from "@/lib/viajes"

export const metadata: Metadata = { title: "Cuenta en revisión · Línea Auxiliar" }

// Cuenta pendiente o rechazada (R2): puede entrar, pero aún no usar la app
export default async function PaginaEnRevision() {
  const perfil = await obtenerPerfil()
  if (!perfil) redirect("/")
  if (perfil.debe_cambiar_clave && perfil.rol !== "admin") redirect("/nuevo-pin")
  if (perfil.estado === "aprobado") redirect(inicioDe(perfil))

  const nombre = perfil.nombre.split(" ")[0]
  const rechazada = perfil.estado === "rechazado"
  const esChofer = perfil.rol === "chofer"

  // Fotos (R54): mientras espera, ponerlas ayuda a que el admin lo verifique
  const supabase = await crearClienteServidor()
  const { data: carro } = esChofer
    ? await supabase.from("vehiculos").select("foto_path").eq("chofer_id", perfil.id).maybeSingle()
    : { data: null }
  const fotos = await firmarFotos([perfil.foto_path, carro?.foto_path])
  const fotoUrl = perfil.foto_path ? (fotos.get(perfil.foto_path) ?? null) : null
  const fotoCarroUrl = carro?.foto_path ? (fotos.get(carro.foto_path) ?? null) : null
  const faltan = !fotoUrl || (esChofer && !fotoCarroUrl)

  // Nadie vigila la lista de pendientes todo el día: el aviso por WhatsApp acelera la aprobación (R2)
  const comoQue = esChofer ? "chofer" : "pasajero"
  const mensaje = rechazada
    ? `Hola, soy ${perfil.nombre}. Mi cuenta de ${comoQue} en la app Línea Auxiliar no fue aprobada. ¿Qué me falta?`
    : `Hola, soy ${perfil.nombre}. Me acabo de registrar como ${comoQue} en la app Línea Auxiliar. ¿Me puedes aprobar la cuenta?`

  return (
    <Screen>
      <AppHeader title="Tu cuenta" />
      <div className="flex flex-col gap-4 p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <p className="font-heading text-2xl font-semibold">Hola, {nombre}</p>

        <div
          className={cn(
            "flex items-start gap-3 rounded-3xl p-4",
            rechazada ? "border border-destructive/30 bg-destructive/10" : "bg-secondary text-secondary-foreground"
          )}
        >
          {rechazada ? (
            <XCircle aria-hidden className="mt-0.5 size-5 shrink-0 text-destructive" />
          ) : (
            <Clock aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
          )}
          <div>
            <p className={cn("font-medium", rechazada && "text-destructive")}>
              {rechazada ? "Tu cuenta no fue aprobada" : "Tu cuenta está en revisión"}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {rechazada
                ? "Pregúntale al administrador qué falta."
                : `El administrador de la línea va a revisar tus datos. Cuando te apruebe podrás ${
                    esChofer ? "publicar tus viajes" : "apartar puesto en los carros"
                  }. Avísale por WhatsApp para que lo vea antes.`}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <a
            href={enlaceWhatsappAdmin(mensaje)}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ size: "lg", className: "h-12 w-full bg-success text-base text-success-foreground hover:bg-success/90" })}
          >
            <MessageCircle />
            {rechazada ? "Preguntar al administrador" : "Avisar al administrador"}
          </a>
          <p className="text-center text-sm text-muted-foreground">Por WhatsApp, al {WHATSAPP_ADMIN_VISIBLE}</p>
        </div>

        {!rechazada ? (
          <section aria-labelledby="titulo-fotos" className="flex flex-col gap-4 rounded-3xl border bg-card p-4 shadow-(--sombra-card)">
            <div className="flex items-center gap-4">
              <ChoferAvatar chofer={{ nombre: perfil.nombre, iniciales: iniciales(perfil.nombre), fotoUrl }} className="size-16 text-lg" />
              <div className="min-w-0 flex-1">
                <h2 id="titulo-fotos" className="flex items-center gap-1.5 font-heading font-semibold">
                  {faltan ? null : <CheckCircle2 aria-hidden className="size-4 text-success" />}
                  {faltan ? (esChofer ? "Agrega tu foto y la de tu carro" : "Agrega tu foto") : "¡Listo! Tus fotos ya están"}
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Ayudan a que el administrador te verifique más rápido y a que {esChofer ? "los pasajeros te reconozcan" : "el chofer te reconozca"}.
                </p>
              </div>
            </div>
            <CambiarFoto tieneFoto={Boolean(fotoUrl)} />
            {esChofer ? (
              <>
                {fotoCarroUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- foto del bucket privado servida por /foto (R54)
                  <img src={fotoCarroUrl} alt="Foto de tu carro" className="aspect-video w-full rounded-2xl object-cover" />
                ) : null}
                <CambiarFoto tipo="carro" tieneFoto={Boolean(fotoCarroUrl)} />
              </>
            ) : null}
          </section>
        ) : null}

        {!rechazada ? (
          <p className="rounded-3xl border bg-card p-4 text-sm shadow-(--sombra-card)">
            <span className="font-medium">Mientras tanto:</span> guarda bien tu PIN, lo necesitas para entrar.
          </p>
        ) : null}

        {/* Volver a cargar esta página revisa de nuevo el estado de la cuenta */}
        <Button render={<a href="/en-revision" />} nativeButton={false} size="lg" variant="outline" className="h-12 w-full text-base">
          <RotateCw /> Revisar de nuevo
        </Button>
        <BotonSalir />
      </div>
    </Screen>
  )
}
