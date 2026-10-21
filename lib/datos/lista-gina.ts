import "server-only"

import { firmarFotos } from "@/lib/fotos"
import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"
import { nombreCorto } from "@/lib/viajes"

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

// ---------- Historial para el panel: quién pasó por la lista y por qué salió ----------

/** Motivo de salida, agrupado para el resumen */
export type MotivoSalida = "subio" | "se_fue" | "vencida" | "no_estaba" | "cancelo"

export type SalidaLista = {
  id: string
  nombre: string
  fotoUrl: string | null
  personas: number
  enGina: boolean
  lugar: string | null
  creadaEn: string
  cerradaEn: string | null
  motivo: MotivoSalida
  detalle: string // "Subió en Gina con José R.", "Se fue (tocó «Me fui»)"…
}

// Como en el resto del app ("José Rey" → "José R.")
const corto = (nombre: string | null | undefined) => (nombre ? nombreCorto(nombre) : "el chofer")

/**
 * Las salidas de la lista desde `desde` (hasta `hasta`), la más reciente primero. Quien estaba en el camino queda
 * "en_carro" al ligarse a un carro: su motivo final sale de su reserva (subió, no estaba, canceló…).
 */
export async function cargarHistorialListaAdmin(desde: Date, hasta?: Date): Promise<SalidaLista[]> {
  const supabase = await crearClienteServidor()
  let consulta = supabase
    .from("lista_gina")
    .select(
      "id, personas, en_gina, lugar, estado, creada_en, cerrada_en, pasajero:perfiles!lista_gina_pasajero_id_fkey(nombre, foto_path), viaje:viajes!lista_gina_viaje_id_fkey(chofer:perfiles!viajes_chofer_id_fkey(nombre)), reserva:reservas!lista_gina_reserva_id_fkey(estado)"
    )
    .neq("estado", "esperando")
    .gte("creada_en", desde.toISOString())
    .order("cerrada_en", { ascending: false, nullsFirst: false })
    .limit(300)
  if (hasta) consulta = consulta.lt("creada_en", hasta.toISOString())
  const { data } = await consulta
  const fotos = await firmarFotos((data ?? []).map((e) => e.pasajero?.foto_path))

  return (data ?? []).map((e) => {
    const chofer = corto(e.viaje?.chofer?.nombre)
    const donde = e.en_gina ? "en Gina" : "en el camino"
    let motivo: MotivoSalida
    let detalle: string
    if (e.estado === "subio") {
      motivo = "subio"
      detalle = `Subió ${donde} con ${chofer}`
    } else if (e.estado === "en_carro") {
      // Se ligó a un carro al salir de Gina: lo que pasó después está en su reserva
      const r = e.reserva?.estado
      if (r === "subio" || r === "bajo") {
        motivo = "subio"
        detalle = `Subió en el camino con ${chofer}`
      } else if (r === "no_llego") {
        motivo = "no_estaba"
        detalle = `No estaba cuando pasó ${chofer}`
      } else if (r === "cancelada") {
        motivo = "cancelo"
        detalle = `Tocó «Ya no voy» (iba con ${chofer})`
      } else if (r === "sin_puesto") {
        motivo = "cancelo"
        detalle = `${chofer} canceló el viaje`
      } else {
        motivo = "subio"
        detalle = `${chofer} va por él en el camino`
      }
    } else if (e.estado === "se_fue") {
      motivo = "se_fue"
      detalle = "Se fue (tocó «Me fui»)"
    } else if (e.estado === "vencida") {
      motivo = "vencida"
      detalle = "No respondió «¿Sigues ahí?»: venció"
    } else {
      motivo = "no_estaba"
      detalle = "El chofer marcó «No estaba»"
    }
    return {
      id: e.id,
      nombre: e.pasajero?.nombre ?? "Pasajero",
      fotoUrl: e.pasajero?.foto_path ? (fotos.get(e.pasajero.foto_path) ?? null) : null,
      personas: e.personas,
      enGina: e.en_gina,
      lugar: e.lugar,
      creadaEn: e.creada_en,
      cerradaEn: e.cerrada_en,
      motivo,
      detalle,
    }
  })
}
