"use server"

import { revalidatePath } from "next/cache"

import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"

export type Resultado = { ok?: boolean; error?: string }

/**
 * Guarda la foto que el teléfono ya subió al bucket (R54): la de perfil o la del carro. La ruta tiene que estar
 * en la carpeta de quien llama (lo exige también Storage); la foto anterior se borra para no acumular.
 */
export async function guardarFoto(tipo: "perfil" | "carro", ruta: string): Promise<Resultado> {
  const supabase = await crearClienteServidor()
  const { data } = await supabase.auth.getClaims()
  const yo = data?.claims?.sub
  if (!yo) return { error: "Tu sesión terminó. Vuelve a entrar." }
  if (!new RegExp(`^${yo}/${tipo}-\\d+\\.jpg$`).test(ruta)) return { error: "Foto inválida" }

  // Perfil: perfiles.id; carro: vehiculos.chofer_id (RLS: solo lo propio)
  let anterior: string | null | undefined
  if (tipo === "perfil") {
    const { data: antes } = await supabase.from("perfiles").select("foto_path").eq("id", yo).maybeSingle()
    anterior = antes?.foto_path
    const { error } = await supabase.from("perfiles").update({ foto_path: ruta }).eq("id", yo)
    if (error) return { error: "No se pudo guardar la foto. Intenta de nuevo." }
  } else {
    const { data: antes } = await supabase.from("vehiculos").select("foto_path").eq("chofer_id", yo).maybeSingle()
    anterior = antes?.foto_path
    const { error } = await supabase.from("vehiculos").update({ foto_path: ruta }).eq("chofer_id", yo)
    if (error) return { error: "No se pudo guardar la foto. Intenta de nuevo." }
  }

  if (anterior && anterior !== ruta && anterior.startsWith(`${yo}/`)) {
    await supabase.storage.from("fotos").remove([anterior])
  }
  // La foto aparece en el menú, el carnet y las pantallas de los demás
  revalidatePath("/", "layout")
  return { ok: true }
}

/** "Mi carro tiene aire acondicionado" (R55). RLS deja cambiar solo el carro propio. */
export async function cambiarAire(tiene: boolean): Promise<Resultado> {
  const supabase = await crearClienteServidor()
  const { data } = await supabase.auth.getClaims()
  const yo = data?.claims?.sub
  if (!yo) return { error: "Tu sesión terminó. Vuelve a entrar." }
  const { error } = await supabase.from("vehiculos").update({ aire_acondicionado: tiene }).eq("chofer_id", yo)
  if (error) return { error: "No se pudo guardar. Intenta de nuevo." }
  revalidatePath("/", "layout")
  return { ok: true }
}
