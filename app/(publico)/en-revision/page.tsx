import { ClockIcon, MessageCircleIcon, XCircleIcon } from "lucide-react"
import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { BotonSalir } from "@/components/boton-salir"
import { Avatar } from "@/components/foto/avatar"
import { SubirFoto } from "@/components/foto/subir-foto"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button, buttonVariants } from "@/components/ui/button"
import { enlaceWhatsappAdmin, WHATSAPP_ADMIN_VISIBLE } from "@/lib/contacto"
import { firmarFotos } from "@/lib/fotos"
import { obtenerPerfil } from "@/lib/sesion"
import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"

export const metadata: Metadata = { title: "Cuenta en revisión · Línea Auxiliar" }

// Cuenta pendiente o rechazada (R2): puede entrar, pero aún no usar la app
export default async function PaginaEnRevision() {
  const perfil = await obtenerPerfil()
  if (!perfil) redirect("/")
  if (perfil.estado === "aprobado") redirect("/inicio")

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
    <div className="flex flex-col gap-6">
      <h1 className="text-xl leading-tight font-bold">Hola, {nombre}</h1>

      {rechazada ? (
        <Alert variant="destructive">
          <XCircleIcon aria-hidden />
          <AlertTitle>Tu cuenta no fue aprobada</AlertTitle>
          <AlertDescription>
            Pregúntale al administrador qué falta.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert variant="warning">
          <ClockIcon aria-hidden />
          <AlertTitle>Tu cuenta está en revisión</AlertTitle>
          <AlertDescription>
            El administrador de la línea va a revisar tus datos. Cuando te apruebe podrás{" "}
            {perfil.rol === "chofer" ? "publicar tus viajes" : "apartar puesto en las unidades"}. Avísale por
            WhatsApp para que lo vea antes.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-2">
        <a
          href={enlaceWhatsappAdmin(mensaje)}
          target="_blank"
          rel="noreferrer"
          className={buttonVariants({ variant: "whatsapp", size: "lg", className: "w-full" })}
        >
          <MessageCircleIcon aria-hidden />
          {rechazada ? "Preguntar al administrador" : "Avisar al administrador"}
        </a>
        <p className="text-center text-sm text-muted-foreground">
          Por WhatsApp, al {WHATSAPP_ADMIN_VISIBLE}
        </p>
      </div>

      {!rechazada && (
        <section aria-labelledby="titulo-fotos" className="flex flex-col gap-3 rounded-lg border-2 bg-card p-4">
          <h2 id="titulo-fotos" className="text-base font-bold">
            {faltan ? (esChofer ? "Agrega tu foto y la de tu carro" : "Agrega tu foto") : "¡Listo! Tus fotos ya están"}
          </h2>
          <p className="text-sm text-muted-foreground">
            Ayudan a que el administrador te verifique más rápido y a que {esChofer ? "los pasajeros te reconozcan" : "el chofer te reconozca"}.
          </p>
          <div className="flex items-center gap-4">
            <Avatar url={fotoUrl} nombre={perfil.nombre} className="size-16 text-lg" />
            <SubirFoto tipo="perfil" tieneFoto={Boolean(fotoUrl)} className="flex-1" />
          </div>
          {esChofer && (
            <>
              {fotoCarroUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- enlace firmado de Supabase Storage (R54)
                <img src={fotoCarroUrl} alt="Foto de tu carro" className="aspect-video w-full rounded-xl object-cover" />
              )}
              <SubirFoto tipo="carro" tieneFoto={Boolean(fotoCarroUrl)} />
            </>
          )}
        </section>
      )}

      {!rechazada && (
        <section className="rounded-lg border-2 bg-card p-4">
          <h2 className="text-base font-bold">Mientras tanto</h2>
          <p className="mt-2">Guarda bien tu PIN: lo necesitas para entrar.</p>
        </section>
      )}

      {/* Volver a cargar esta página revisa de nuevo el estado de la cuenta */}
      <Button render={<a href="/en-revision" />} nativeButton={false} size="lg" variant="secondary">
        Revisar de nuevo
      </Button>
      <BotonSalir />
    </div>
  )
}
