import "server-only"

import type { Database } from "@/lib/database.types"
import { firmarFotos } from "@/lib/fotos"
import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"
import type { ChoferEnServicio } from "@/lib/datos/inicio-pasajero"
import { ACTIVOS, actividadDeChofer, nombreCorto, puestosEnOrden, type Sentido, type Viaje } from "@/lib/viajes"

type Reserva = Database["public"]["Tables"]["reservas"]["Row"]

/** Una persona en la lista del carro, como la ve el chofer (con lugar, GPS y teléfono, §6) */
export type FilaChofer = {
  id: string
  posicion: number // 1 = primero (R17)
  personas: number // quien reservó y sus acompañantes (R57)
  desde: number // primer puesto que ocupa
  hasta: number // último puesto que ocupa
  confirmado: boolean // tiene puesto (hasta ≤ puestos)
  nombre: string // nombre corto ("Carmen R.") o el que puso el chofer
  conApp: boolean // false: anotado a mano (R36)
  estado: Reserva["estado"] // activa | subio
  lugar: string | null
  lat: number | null
  lng: number | null
  listo: boolean // "✋ Ya está en el sitio" (R23)
  pendiente: boolean // pedido en el camino sin responder (R29)
  aceptada: boolean
  telefono: string | null
  fotoUrl: string | null // foto de perfil del pasajero (R54): ayuda a reconocerlo
}

/**
 * Una persona de la Lista de Gina en el plan del carro (docs/especificacion.md R64–R67). rol: "llamar" (está en Gina
 * y entra), "guardar" (está en el camino: se le guarda puesto), "despues" (no entra o su grupo no cabe).
 * cabe: si se la puede subir ya (a quien no aparece se lo salta, R65).
 */
export type EntradaGina = {
  id: string
  posicion: number
  nombre: string
  fotoUrl: string | null
  personas: number
  enGina: boolean
  lugar: string | null
  rol: "llamar" | "guardar" | "despues"
  cabe: boolean
  telefono: string | null
  lat: number | null
  lng: number | null
}

/** La lista hacia Valle Grande tal como la ven todos los choferes (R63): dónde espera cada uno, teléfono y GPS */
export type EntradaTramo = {
  id: string
  posicion: number
  nombre: string
  fotoUrl: string | null
  personas: number
  enGina: boolean
  lugar: string | null
  creadaEn: string
  telefono: string | null // solo si el chofer está conectado (§6)
  lat: number | null
  lng: number | null
  diceQueSubio: boolean // avisó "Me monté en un carro de la línea" (R62): falta marcarlo Subió
}

// gina: el plan de la lista hacia Valle Grande (solo Centro → Valle Grande, recogiendo o en ruta); null en los demás
export type ViajeChofer = Viaje & { lista: FilaChofer[]; gina: EntradaGina[] | null }

/** Un compañero en la ruta: lo de "¿Cómo está la línea?" más su teléfono (§6: los choferes se ven entre ellos) */
export type Companero = ChoferEnServicio & { telefono: string | null }

export type DatosInicioChofer = {
  conectado: boolean
  enRuta: ViajeChofer | null // va hacia el destino con gente a bordo
  recogida: ViajeChofer | null // recogida actual: en camino, llegando o recogiendo
  proximos: ViajeChofer[] // encadenados (programado)
  ultimo: { sentido: Sentido; puestos: number } | null // último viaje no cancelado, para sugerir al publicar
  vehiculo: { unidad: string | null; placa: string } | null
  companeros: Companero[] // quién más trabaja y qué hace (R7)
  listaTramo: EntradaTramo[] // la lista hacia Valle Grande, para todos los choferes (§5.17)
  viajesCompaneros: Viaje[] // sus viajes abiertos: para ver qué hace cada uno y qué viene después (§8)
}

export async function cargarInicioChofer(choferId: string, conectado: boolean): Promise<DatosInicioChofer> {
  const supabase = await crearClienteServidor()

  const [viajesRes, ultimoRes, vehiculoRes, lineaRes, conectadosRes] = await Promise.all([
    supabase.from("viajes").select("*").eq("chofer_id", choferId).in("estado", ACTIVOS).order("creado_en"),
    supabase.from("viajes").select("sentido, puestos").eq("chofer_id", choferId).neq("estado", "cancelado").order("creado_en", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("vehiculos").select("unidad, placa").eq("chofer_id", choferId).maybeSingle(),
    // Viajes abiertos de toda la línea (para saber qué hace cada compañero)
    supabase.from("viajes").select("*").in("estado", ACTIVOS),
    supabase
      .from("perfiles")
      .select("id, nombre, foto_path, vehiculo:vehiculos(unidad, placa, aire_acondicionado)")
      .eq("rol", "chofer")
      .eq("estado", "aprobado")
      .not("conectado_en", "is", null)
      .neq("id", choferId),
  ])
  const deLaLinea = (lineaRes.data ?? []).filter((v) => v.chofer_id !== choferId)
  const viajes = viajesRes.data ?? []

  // Listas de todos sus viajes abiertos. El chofer lee las reservas de sus viajes con lugar y GPS (RLS).
  const ids = viajes.map((v) => v.id)
  const { data: reservas } = ids.length
    ? await supabase
        .from("reservas")
        .select("*, pasajero:perfiles!reservas_pasajero_id_fkey(nombre, foto_path)")
        .in("viaje_id", ids)
        .in("estado", ["activa", "subio"])
        .order("creado_en")
        .order("id")
    : { data: [] }
  const filas = reservas ?? []

  const idsPasajeros = [...new Set(filas.map((r) => r.pasajero_id).filter((id): id is string => id !== null))]
  const { data: telefonos } = idsPasajeros.length
    ? await supabase.from("perfiles_privados").select("id, telefono").in("id", idsPasajeros)
    : { data: [] }
  const fotos = await firmarFotos(filas.map((r) => r.pasajero?.foto_path))
  const telefonoDe = new Map((telefonos ?? []).map((t) => [t.id, t.telefono]))

  const conLista = (v: Viaje): ViajeChofer => {
    const deEste = filas.filter((r) => r.viaje_id === v.id)
    return {
      ...v,
      gina: null,
      lista: puestosEnOrden(deEste).map((r, i) => ({
        id: r.id,
        posicion: i + 1,
        personas: r.personas,
        desde: r.desde,
        hasta: r.hasta,
        confirmado: r.hasta <= v.puestos,
        nombre: r.pasajero ? nombreCorto(r.pasajero.nombre) : (r.nombre ?? "Pasajero sin app"),
        conApp: r.pasajero_id !== null,
        estado: r.estado,
        lugar: r.lugar,
        lat: r.lat,
        lng: r.lng,
        listo: r.listo,
        pendiente: r.pendiente,
        aceptada: r.aceptada_en !== null,
        telefono: r.pasajero_id ? (telefonoDe.get(r.pasajero_id) ?? null) : null,
        fotoUrl: r.pasajero?.foto_path ? (fotos.get(r.pasajero.foto_path) ?? null) : null,
      })),
    }
  }

  const enRuta = viajes.find((v) => v.estado === "en_ruta")
  const recogida = viajes.find((v) => v.estado === "en_camino" || v.estado === "llegando" || v.estado === "en_parada")

  // Compañeros en la ruta (R7): foto, carro, ★ y qué hace cada uno
  const conectados = conectadosRes.data ?? []
  const idsCompaneros = conectados.map((c) => c.id)
  const [fotosCompaneros, califsRes, telefonosRes] = await Promise.all([
    firmarFotos(conectados.map((c) => c.foto_path)),
    conectados.length
      ? supabase.from("calificaciones").select("chofer_id, estrellas").in("chofer_id", idsCompaneros)
      : Promise.resolve({ data: [] as { chofer_id: string; estrellas: number }[] }),
    // Los choferes ven el teléfono de los otros choferes (§6)
    conectados.length
      ? supabase.from("perfiles_privados").select("id, telefono").in("id", idsCompaneros)
      : Promise.resolve({ data: [] as { id: string; telefono: string | null }[] }),
  ])
  const telefonoDeCompanero = new Map((telefonosRes.data ?? []).map((t) => [t.id, t.telefono]))
  const companeros: Companero[] = conectados
    .map((c) => {
      const carro = Array.isArray(c.vehiculo) ? (c.vehiculo[0] ?? null) : c.vehiculo
      const suyas = (califsRes.data ?? []).filter((k) => k.chofer_id === c.id)
      return {
        id: c.id,
        nombre: c.nombre,
        fotoUrl: c.foto_path ? (fotosCompaneros.get(c.foto_path) ?? null) : null,
        unidad: carro?.unidad ?? null,
        placa: carro?.placa ?? null,
        aire: carro?.aire_acondicionado ?? false,
        estrellas: suyas.length ? suyas.reduce((s, k) => s + k.estrellas, 0) / suyas.length : null,
        actividad: actividadDeChofer(deLaLinea.filter((v) => v.chofer_id === c.id)),
        telefono: telefonoDeCompanero.get(c.id) ?? null,
      }
    })
    .sort((a, b) => Number(a.actividad === "Disponible") - Number(b.actividad === "Disponible") || a.nombre.localeCompare(b.nombre, "es"))

  // Centro → Valle Grande: el plan de la Lista de Gina para la recogida y para el viaje en ruta (R64, R67)
  const conGina = async (v: ViajeChofer | null): Promise<ViajeChofer | null> => {
    if (!v || v.sentido !== "centro_a_vg") return v
    const { data } = await supabase.rpc("plan_de_gina", { p_viaje: v.id })
    const fotosLista = await firmarFotos((data ?? []).map((e) => e.foto_path))
    return {
      ...v,
      gina: (data ?? []).map((e) => ({
        id: e.id,
        posicion: e.posicion,
        nombre: e.nombre,
        fotoUrl: e.foto_path ? (fotosLista.get(e.foto_path) ?? null) : null,
        personas: e.personas,
        enGina: e.en_gina,
        lugar: e.lugar,
        rol: e.rol as EntradaGina["rol"],
        cabe: e.cabe,
        telefono: e.telefono,
        lat: e.lat,
        lng: e.lng,
      })),
    }
  }
  const [enRutaConGina, recogidaConGina, tramoRes] = await Promise.all([
    conGina(enRuta ? conLista(enRuta) : null),
    conGina(recogida ? conLista(recogida) : null),
    supabase.rpc("lista_para_choferes"),
  ])
  const fotosTramo = await firmarFotos((tramoRes.data ?? []).map((e) => e.foto_path))
  const listaTramo: EntradaTramo[] = (tramoRes.data ?? []).map((e) => ({
    id: e.id,
    posicion: e.posicion,
    nombre: e.nombre,
    fotoUrl: e.foto_path ? (fotosTramo.get(e.foto_path) ?? null) : null,
    personas: e.personas,
    enGina: e.en_gina,
    lugar: e.lugar,
    creadaEn: e.creada_en,
    telefono: e.telefono,
    lat: e.lat,
    lng: e.lng,
    diceQueSubio: e.dice_que_subio,
  }))

  return {
    conectado,
    companeros,
    viajesCompaneros: deLaLinea,
    listaTramo,
    enRuta: enRutaConGina,
    recogida: recogidaConGina,
    proximos: viajes.filter((v) => v.estado === "programado").map(conLista),
    ultimo: ultimoRes.data ?? null,
    vehiculo: vehiculoRes.data ?? null,
  }
}
