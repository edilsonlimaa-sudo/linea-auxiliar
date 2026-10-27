import "server-only"

import { textoVuelta } from "@/lib/fechas"
import { firmarFotos } from "@/lib/fotos"
import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"

/** Un compañero que no está trabajando ahora (pestaña Compañeros, R84): su carro, ★ y cuándo vuelve si lo avisó (R60) */
export type CompaneroFuera = {
  id: string
  nombre: string
  fotoUrl: string | null
  placa: string | null
  unidad: string | null
  estrellas: number | null
  vuelta: string | null // "Vuelve como a las 3:00 p. m." · "Terminó por hoy"; null si no dijo nada
}

/** Los choferes aprobados que no están conectados (sin él mismo); primero los que avisaron que vuelven */
export async function cargarFueraDeServicio(choferId: string, ahora: number): Promise<CompaneroFuera[]> {
  const supabase = await crearClienteServidor()
  const [choferesRes, pausasRes] = await Promise.all([
    supabase
      .from("perfiles")
      .select("id, nombre, foto_path, vehiculo:vehiculos(unidad, placa)")
      .eq("rol", "chofer")
      .eq("estado", "aprobado")
      .is("conectado_en", null)
      .neq("id", choferId),
    supabase.rpc("choferes_en_pausa"),
  ])
  const choferes = choferesRes.data ?? []
  const ids = choferes.map((c) => c.id)
  const [fotos, califsRes] = await Promise.all([
    firmarFotos(choferes.map((c) => c.foto_path)),
    ids.length
      ? supabase.from("calificaciones").select("chofer_id, estrellas").in("chofer_id", ids)
      : Promise.resolve({ data: [] as { chofer_id: string; estrellas: number }[] }),
  ])
  const pausaDe = new Map((pausasRes.data ?? []).map((p) => [p.chofer_id, p]))

  const lista = choferes.map((c) => {
    const carro = Array.isArray(c.vehiculo) ? (c.vehiculo[0] ?? null) : c.vehiculo
    const suyas = (califsRes.data ?? []).filter((k) => k.chofer_id === c.id)
    const pausa = pausaDe.get(c.id)
    const vuelta = pausa ? textoVuelta(pausa.vuelve_en, new Date(ahora), pausa.sin_hora) : null
    return {
      id: c.id,
      nombre: c.nombre,
      fotoUrl: c.foto_path ? (fotos.get(c.foto_path) ?? null) : null,
      placa: carro?.placa ?? null,
      unidad: carro?.unidad ?? null,
      estrellas: suyas.length ? suyas.reduce((s, k) => s + k.estrellas, 0) / suyas.length : null,
      vuelta: vuelta ? vuelta[0].toUpperCase() + vuelta.slice(1) : null,
    }
  })
  // Primero quien vuelve hoy, luego quien terminó, luego el resto
  const orden = (c: CompaneroFuera) => {
    const p = pausaDe.get(c.id)
    return !p ? 2 : p.vuelve_en || p.sin_hora ? 0 : 1
  }
  return lista.sort((a, b) => orden(a) - orden(b) || a.nombre.localeCompare(b.nombre, "es"))
}
