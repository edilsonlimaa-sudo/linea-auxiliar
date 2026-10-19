"use client"

import { CameraIcon, Loader2Icon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useId, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { guardarFoto } from "@/lib/acciones/perfil"
import { crearClienteNavegador } from "@/lib/supabase/cliente-navegador"

const LADO_MAX = 1080 // px (R54: livianas para los datos móviles)
const CALIDAD = 0.82

/** Achica la foto en el teléfono: máx. 1080 px de lado, JPEG. Respeta la orientación de la cámara. */
async function achicar(archivo: File): Promise<Blob> {
  const imagen = await createImageBitmap(archivo, { imageOrientation: "from-image" })
  const escala = Math.min(1, LADO_MAX / Math.max(imagen.width, imagen.height))
  const lienzo = document.createElement("canvas")
  lienzo.width = Math.round(imagen.width * escala)
  lienzo.height = Math.round(imagen.height * escala)
  lienzo.getContext("2d")?.drawImage(imagen, 0, 0, lienzo.width, lienzo.height)
  imagen.close()
  return new Promise((resolver, rechazar) =>
    lienzo.toBlob((b) => (b ? resolver(b) : rechazar(new Error("No se pudo procesar la foto"))), "image/jpeg", CALIDAD)
  )
}

/**
 * Botón para poner o cambiar una foto (R54). El celular ofrece cámara o galería. La foto se achica aquí, se sube
 * directo a la carpeta propia del bucket (Storage solo deja esa) y el servidor la guarda en el perfil o el carro.
 */
export function SubirFoto({ tipo, tieneFoto, className }: { tipo: "perfil" | "carro"; tieneFoto: boolean; className?: string }) {
  const id = useId()
  const entrada = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState<string>()

  async function alElegir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    e.target.value = "" // poder elegir la misma foto otra vez
    if (!archivo) return
    if (!archivo.type.startsWith("image/")) return setError("Escoge una foto.")
    setError(undefined)
    setSubiendo(true)
    try {
      const foto = await achicar(archivo)
      const supabase = crearClienteNavegador()
      const { data } = await supabase.auth.getSession()
      const yo = data.session?.user.id
      if (!yo) throw new Error("Tu sesión terminó. Vuelve a entrar.")
      const ruta = `${yo}/${tipo}-${Date.now()}.jpg`
      const { error: errorSubida } = await supabase.storage.from("fotos").upload(ruta, foto, { contentType: "image/jpeg" })
      if (errorSubida) throw new Error("No se pudo subir la foto. Revisa tu conexión e intenta de nuevo.")
      const r = await guardarFoto(tipo, ruta)
      if (r.error) throw new Error(r.error)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la foto.")
    } finally {
      setSubiendo(false)
    }
  }

  const texto = tipo === "perfil" ? (tieneFoto ? "Cambiar mi foto" : "Poner mi foto") : tieneFoto ? "Cambiar foto del carro" : "Poner foto del carro"
  return (
    <div className={className}>
      <input ref={entrada} id={id} type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={alElegir} />
      <Button type="button" variant="outline" className="w-full" disabled={subiendo} onClick={() => entrada.current?.click()}>
        {subiendo ? <Loader2Icon aria-hidden className="animate-spin" /> : <CameraIcon aria-hidden />}
        {subiendo ? "Subiendo…" : texto}
      </Button>
      {error && (
        <p role="alert" className="mt-2 font-bold text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
