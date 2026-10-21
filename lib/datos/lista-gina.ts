import "server-only"

import { firmarFotos } from "@/lib/fotos"
import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"

// La Lista de Gina tal como la ven todos (docs/especificacion.md R63): en orden, con dónde espera cada uno
export type EnListaGina = {
  id: string
  posicion: number
  nombre: string // nombre corto
  fotoUrl: string | null
  personas: number
  enGina: boolean
  lugar: string | null // dónde espera, si no es Gina
  creadaEn: string
  venceEn: string
  esMio: boolean
}

export async function cargarListaGina(): Promise<EnListaGina[]> {
  const supabase = await crearClienteServidor()
  const { data } = await supabase.rpc("lista_de_gina")
  const fotos = await firmarFotos((data ?? []).map((e) => e.foto_path))
  return (data ?? []).map((e) => ({
    id: e.id,
    posicion: e.posicion,
    nombre: e.nombre,
    fotoUrl: e.foto_path ? (fotos.get(e.foto_path) ?? null) : null,
    personas: e.personas,
    enGina: e.en_gina,
    lugar: e.lugar,
    creadaEn: e.creada_en,
    venceEn: e.vence_en,
    esMio: e.es_mio,
  }))
}

export type EnListaAdmin = EnListaGina & { distanciaM: number | null }

/** Panel: la lista en vivo con la distancia al avisar (R62: solo el admin la ve). El admin lee todo por RLS */
export async function cargarListaGinaAdmin(): Promise<EnListaAdmin[]> {
  const supabase = await crearClienteServidor()
  const [lista, { data: privado }] = await Promise.all([cargarListaGina(), supabase.from("lista_gina_privado").select("id, distancia_m")])
  const distancia = new Map((privado ?? []).map((p) => [p.id, p.distancia_m]))
  return lista.map((e) => ({ ...e, distanciaM: distancia.get(e.id) ?? null }))
}
