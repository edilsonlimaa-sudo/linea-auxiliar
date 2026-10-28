"use server"

import { redirect } from "next/navigation"
import { after } from "next/server"
import { z } from "zod"

import { leerPagoMovil } from "@/lib/bancos"
import { mandarPush } from "@/lib/push"
import { inicioDe } from "@/lib/sesion"
import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"
import { correoDeTelefono, normalizarTelefono, telefonoValido } from "@/lib/telefono"

export type EstadoFormulario = {
  error?: string
  errores?: Record<string, string>
  valores?: Record<string, string>
  intento?: number
}

const telefono = z
  .string()
  .trim()
  .refine(telefonoValido, "Escribe tu número de celular, por ejemplo 0414-1234567")
const pin = z.string().regex(/^\d{6}$/, "El PIN debe tener 6 números")

// Registro (R1): nombre, teléfono, PIN y rol; el chofer además la placa (obligatoria) y datos del carro
const registroBase = z.object({
  nombre: z.string().trim().min(2, "Escribe tu nombre y apellido").max(60, "El nombre es muy largo"),
  telefono,
  pin,
  pinConfirmado: z.string(),
  cedula: z.string().trim().max(20, "La cédula es muy larga").optional(),
})

const registroPasajero = registroBase.extend({
  rol: z.literal("pasajero"),
  // Escrito a mano y opcional (R1): todavía no hay lista de urbanismos con los nombres reales
  urbanismo: z.string().trim().max(60, "Escríbelo más corto (máximo 60 letras)").optional(),
})

const registroChofer = registroBase.extend({
  rol: z.literal("chofer"),
  placa: z
    .string()
    .transform((p) => p.toUpperCase().replace(/[^A-Z0-9]/g, ""))
    .refine((p) => /^[A-Z0-9]{5,8}$/.test(p), "Escribe la placa, por ejemplo AB123CD"),
  unidad: z.string().trim().max(10, "Número de unidad muy largo").optional(),
  modelo: z.string().trim().max(40, "Modelo muy largo").optional(),
  color: z.string().trim().max(30, "Color muy largo").optional(),
  // Casilla "Mi carro tiene aire acondicionado" (R55): marcada envía "si"
  aire: z.preprocess((v) => v === "si", z.boolean()),
})

const registro = z
  .discriminatedUnion("rol", [registroPasajero, registroChofer])
  .refine((d) => d.pin === d.pinConfirmado, { path: ["pinConfirmado"], message: "Los dos PIN no coinciden" })

const entrada = z.object({ telefono, pin })

// Campos que se devuelven para volver a llenar el formulario si hay error (nunca el PIN)
const camposVisibles = ["nombre", "telefono", "cedula", "urbanismo", "placa", "unidad", "modelo", "color", "aire", "pmBanco", "pmTelefono", "pmCedula"]

function valoresVisibles(formData: FormData) {
  return Object.fromEntries(camposVisibles.map((c) => [c, String(formData.get(c) ?? "")]))
}

function erroresDe(error: z.ZodError) {
  const errores: Record<string, string> = {}
  for (const issue of error.issues) {
    const campo = String(issue.path[0] ?? "general")
    errores[campo] ??= issue.message
  }
  return errores
}

export async function registrarse(anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const intento = (anterior.intento ?? 0) + 1
  const valores = valoresVisibles(formData)
  const datos = Object.fromEntries(formData)
  const resultado = registro.safeParse(datos)
  // Pago Móvil del chofer (R74): opcional; si escribió algo, los tres datos
  const pm = datos.rol === "chofer" ? leerPagoMovil(datos, true) : { datos: null, errores: {} }
  if (!resultado.success || Object.keys(pm.errores).length) {
    return { errores: { ...(resultado.success ? {} : erroresDe(resultado.error)), ...pm.errores }, valores, intento }
  }

  const d = resultado.data
  const supabase = await crearClienteServidor()
  const { data: creada, error } = await supabase.auth.signUp({
    email: correoDeTelefono(d.telefono),
    password: d.pin,
    options: {
      // El trigger crear_perfil_nuevo crea perfil, datos privados y vehículo con estos datos
      data: {
        rol: d.rol,
        nombre: d.nombre,
        telefono: normalizarTelefono(d.telefono),
        cedula: d.cedula || undefined,
        ...(d.rol === "pasajero"
          ? { urbanismo: d.urbanismo || undefined }
          : {
              placa: d.placa,
              unidad: d.unidad || undefined,
              modelo: d.modelo || undefined,
              color: d.color || undefined,
              aire: d.aire ? "true" : "false",
              ...(pm.datos ? { pm_banco: pm.datos.banco, pm_telefono: pm.datos.telefono, pm_cedula: pm.datos.cedula } : {}),
            }),
      },
    },
  })

  if (error) {
    if (error.code === "user_already_exists") {
      return { errores: { telefono: "Ese teléfono ya tiene cuenta. Entra con tu PIN." }, valores, intento }
    }
    if (/duplicate key.*placa|vehiculos_placa_key/i.test(error.message)) {
      return { errores: { placa: "Esa placa ya está registrada" }, valores, intento }
    }
    return { error: "No pudimos crear tu cuenta. Revisa tu conexión e intenta de nuevo.", valores, intento }
  }

  // R93: aviso a los aparatos del admin (con la sesión de la cuenta nueva, una sola vez). Si falla, el registro sigue igual
  const { data: aparatos } = await supabase.rpc("aviso_de_cuenta_nueva")
  if (aparatos?.length && creada.user) {
    const aviso = {
      id: `cuenta-${creada.user.id}`,
      titulo: "Nueva cuenta por aprobar",
      texto: `${d.rol === "chofer" ? "Chofer" : "Pasajero"}: ${d.nombre}`,
      url: "/admin/aprobar",
    }
    after(() => mandarPush(aparatos, aviso).catch(() => {}))
  }

  // La cuenta nueva queda pendiente (R2): /inicio la lleva a "En revisión"
  redirect("/inicio")
}

export async function entrar(anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const intento = (anterior.intento ?? 0) + 1
  const valores = { telefono: String(formData.get("telefono") ?? "") }
  const resultado = entrada.safeParse(Object.fromEntries(formData))
  if (!resultado.success) return { errores: erroresDe(resultado.error), valores, intento }

  const supabase = await crearClienteServidor()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: correoDeTelefono(resultado.data.telefono),
    password: resultado.data.pin,
  })

  if (error) {
    if (error.code === "invalid_credentials") {
      return { error: "El teléfono o el PIN no son correctos.", valores, intento }
    }
    return { error: "No pudimos entrar. Revisa tu conexión e intenta de nuevo.", valores, intento }
  }
  // Directo a su interfaz (§5.21): quien está en la nueva no pasa por la clásica
  const { data: perfil } = await supabase.from("perfiles").select("rol, interfaz, debe_cambiar_clave").eq("id", data.user.id).maybeSingle()
  // R4: entró con el PIN temporal: primero escoge el suyo
  if (perfil?.debe_cambiar_clave) redirect("/nuevo-pin")
  redirect(perfil ? inicioDe(perfil) : "/inicio")
}

const nuevoPin = z
  .object({ pin, pinConfirmado: z.string() })
  .refine((d) => d.pin === d.pinConfirmado, { path: ["pinConfirmado"], message: "Los dos PIN no coinciden" })

/** R4: después del PIN temporal, la persona escoge el suyo y sigue a su inicio */
export async function escogerMiPin(anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const intento = (anterior.intento ?? 0) + 1
  const resultado = nuevoPin.safeParse(Object.fromEntries(formData))
  if (!resultado.success) return { errores: erroresDe(resultado.error), intento }

  const supabase = await crearClienteServidor()
  const { error } = await supabase.rpc("cambiar_mi_pin", { p_nuevo: resultado.data.pin })
  if (error) {
    if (error.message.includes("distinto")) return { errores: { pin: error.message }, intento }
    return { error: "No pudimos guardar tu PIN. Intenta de nuevo.", intento }
  }
  const { data: claims } = await supabase.auth.getClaims()
  const { data: perfil } = await supabase.from("perfiles").select("rol, interfaz").eq("id", claims?.claims?.sub ?? "").maybeSingle()
  redirect(perfil ? inicioDe(perfil) : "/inicio")
}

export async function salir() {
  const supabase = await crearClienteServidor()
  await supabase.auth.signOut()
  redirect("/")
}
