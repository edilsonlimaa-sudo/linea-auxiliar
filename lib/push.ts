// Avisos en el celular (docs/especificacion.md §5.23, R90): mandar un aviso a varios aparatos con Web Push
import "server-only"

import webpush from "web-push"

export type Suscripcion = { endpoint: string; p256dh: string; auth: string }
export type AvisoPush = { id: string; titulo: string; texto: string; url: string }

const publica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const privada = process.env.VAPID_PRIVATE_KEY
const configurado = Boolean(publica && privada)
if (configurado) webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@lineaauxiliar.app", publica!, privada!)

/**
 * Manda el aviso a cada aparato. Devuelve cuántos lo aceptaron y cuáles caducaron (el servicio respondió 404/410: el
 * aparato ya no existe o quitó el permiso), para borrarlos. Sin las claves VAPID no manda nada.
 */
export async function mandarPush(suscripciones: Suscripcion[], aviso: AvisoPush): Promise<{ enviados: number; caducados: string[] }> {
  if (!configurado) {
    if (suscripciones.length > 0) console.warn("Avisos en el celular: faltan las claves VAPID; no se mandó nada")
    return { enviados: 0, caducados: [] }
  }
  const carga = JSON.stringify(aviso)
  const resultados = await Promise.allSettled(
    suscripciones.map((s) =>
      webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, carga, { TTL: 60 * 60 * 24, urgency: "high" })
    )
  )
  let enviados = 0
  const caducados: string[] = []
  resultados.forEach((r, i) => {
    if (r.status === "fulfilled") enviados += 1
    else if ([404, 410].includes((r.reason as { statusCode?: number })?.statusCode ?? 0)) caducados.push(suscripciones[i].endpoint)
    else console.warn("Avisos en el celular: no se pudo mandar a un aparato", (r.reason as Error)?.message)
  })
  return { enviados, caducados }
}
