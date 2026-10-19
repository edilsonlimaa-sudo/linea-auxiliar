import "server-only"

import { redirect } from "next/navigation"

import type { Database } from "@/lib/database.types"
import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"

export type Perfil = Database["public"]["Tables"]["perfiles"]["Row"]

/** Perfil de quien tiene la sesión, o null si no entró. */
export async function obtenerPerfil(): Promise<Perfil | null> {
  return (await obtenerSesion()).perfil
}

async function obtenerSesion(): Promise<{ conSesion: boolean; perfil: Perfil | null }> {
  const supabase = await crearClienteServidor()
  const { data } = await supabase.auth.getClaims()
  const id = data?.claims?.sub
  if (!id) return { conSesion: false, perfil: null }
  const { data: perfil } = await supabase.from("perfiles").select("*").eq("id", id).maybeSingle()
  return { conSesion: true, perfil }
}

/** Sin sesión va a la entrada; con sesión pero sin cuenta, se cierra esa sesión (si no, proxy.ts la devuelve aquí) */
function sacar(conSesion: boolean, admin = false): never {
  if (conSesion) redirect(admin ? "/salir?a=admin" : "/salir")
  redirect(admin ? "/admin/entrar" : "/")
}

/** Para las pantallas de pasajeros y choferes: exige sesión y cuenta aprobada (R2). El admin va a su panel. */
export async function exigirCuentaAprobada(): Promise<Perfil> {
  const { conSesion, perfil } = await obtenerSesion()
  if (!perfil) sacar(conSesion)
  if (perfil.rol === "admin") redirect("/admin")
  if (perfil.estado !== "aprobado") redirect("/en-revision")
  return perfil
}

/**
 * Para el panel de administración: solo cuentas admin. Pasajeros y choferes vuelven a su inicio.
 * Mientras tenga la contraseña por defecto, solo puede estar en /admin/clave.
 */
export async function exigirAdmin({ permitirClaveTemporal = false } = {}): Promise<Perfil> {
  const { conSesion, perfil } = await obtenerSesion()
  if (!perfil) sacar(conSesion, true)
  if (perfil.rol !== "admin") redirect("/inicio")
  if (perfil.debe_cambiar_clave && !permitirClaveTemporal) redirect("/admin/clave")
  return perfil
}
