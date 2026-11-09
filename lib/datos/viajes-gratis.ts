import "server-only"

import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"

/** R103: cuántos viajes gratis le quedan al pasajero con sesión (0 si falla: el viaje sigue igual, pagando) */
export async function misViajesGratis(): Promise<number> {
  const supabase = await crearClienteServidor()
  const { data } = await supabase.rpc("mis_viajes_gratis")
  return data ?? 0
}

export type RegaloGratis = { id: string; cantidad: number; motivo: string; creadoEn: string }
export type UsoGratis = { reservaId: string; cuando: string; sentido: "vg_a_centro" | "centro_a_vg"; chofer: string; estado: string }
export type ViajesGratisAdmin = { quedan: number; regalos: RegaloGratis[]; usos: UsoGratis[] }

/** R102: lo que ve el admin en el detalle del pasajero: cuántos le quedan, los regalos y en qué viajes los usó */
export async function cargarViajesGratisAdmin(pasajeroId: string): Promise<ViajesGratisAdmin> {
  const supabase = await crearClienteServidor()
  const [saldoRes, regalosRes, usosRes] = await Promise.all([
    supabase.rpc("admin_saldo_gratis", { p_pasajero: pasajeroId }),
    supabase.from("viajes_gratis").select("id, cantidad, motivo, creado_en").eq("pasajero_id", pasajeroId).order("creado_en", { ascending: false }),
    supabase
      .from("reservas")
      .select("id, creado_en, estado, viaje:viajes!inner(sentido, estado, chofer:perfiles!viajes_chofer_id_fkey(nombre))")
      .eq("pasajero_id", pasajeroId)
      .eq("gratis", true)
      .in("estado", ["activa", "subio", "bajo"])
      .neq("viaje.estado", "cancelado")
      .order("creado_en", { ascending: false }),
  ])
  return {
    quedan: saldoRes.data ?? 0,
    regalos: (regalosRes.data ?? []).map((g) => ({ id: g.id, cantidad: g.cantidad, motivo: g.motivo, creadoEn: g.creado_en })),
    usos: (usosRes.data ?? []).map((r) => ({
      reservaId: r.id,
      cuando: r.creado_en,
      sentido: r.viaje.sentido,
      chofer: r.viaje.chofer?.nombre ?? "",
      estado: r.estado,
    })),
  }
}
