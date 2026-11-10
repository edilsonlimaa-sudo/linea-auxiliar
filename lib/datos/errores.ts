import "server-only"

import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"

export type ErrorApp = {
  id: string
  cuando: string
  quien: string | null
  rol: string | null
  interfaz: string
  tipo: string
  pantalla: string
  mensaje: string
  digest: string | null
  version: string | null
  aparato: string | null
  enLinea: boolean | null
  volvioHace: number | null
}

export type GrupoError = {
  mensaje: string
  tipo: string
  veces: number
  personas: number
  ultima: string
  pantallas: string[]
}

const quienEs = (e: ErrorApp) => e.quien ?? `sin sesión · ${e.aparato ?? ""}`

/** R107: los errores de los últimos `dias` días (solo el admin: lo exige la política de la tabla) */
export async function cargarErrores(dias = 7): Promise<{ errores: ErrorApp[]; grupos: GrupoError[]; personas: number; error: string | null }> {
  const supabase = await crearClienteServidor()
  const desde = new Date(Date.now() - dias * 86_400_000).toISOString()
  const { data, error } = await supabase
    .from("errores_app")
    .select("*, perfil:perfiles(nombre, rol)")
    .gte("creado_en", desde)
    .order("creado_en", { ascending: false })
    .limit(1000)
  const errores: ErrorApp[] = (data ?? []).map((e) => ({
    id: e.id,
    cuando: e.ocurrio_en ?? e.creado_en,
    quien: e.perfil?.nombre ?? null,
    rol: e.perfil?.rol ?? null,
    interfaz: e.interfaz,
    tipo: e.tipo,
    pantalla: e.pantalla,
    mensaje: e.mensaje,
    digest: e.digest,
    version: e.version,
    aparato: e.aparato,
    enLinea: e.en_linea,
    volvioHace: e.volvio_hace,
  }))

  const porMensaje = new Map<string, { g: GrupoError; quienes: Set<string> }>()
  for (const e of errores) {
    const clave = `${e.tipo}|${e.mensaje}`
    const x = porMensaje.get(clave) ?? {
      g: { mensaje: e.mensaje, tipo: e.tipo, veces: 0, personas: 0, ultima: e.cuando, pantallas: [] },
      quienes: new Set<string>(),
    }
    x.g.veces++
    x.quienes.add(quienEs(e))
    if (!x.g.pantallas.includes(e.pantalla)) x.g.pantallas.push(e.pantalla)
    if (e.cuando > x.g.ultima) x.g.ultima = e.cuando
    porMensaje.set(clave, x)
  }
  const grupos = [...porMensaje.values()].map(({ g, quienes }) => ({ ...g, personas: quienes.size })).sort((a, b) => b.veces - a.veces)
  return { errores, grupos, personas: new Set(errores.map(quienEs)).size, error: error?.message ?? null }
}
