// Contacto de la administración de la línea (docs/especificacion.md R2)

/** WhatsApp del administrador, en formato internacional sin "+" (0412-9801484) */
export const WHATSAPP_ADMIN = "584129801484"
export const WHATSAPP_ADMIN_VISIBLE = "0412-9801484"

/** Enlace que abre el chat del admin con el mensaje ya escrito */
export const enlaceWhatsappAdmin = (mensaje: string) => `https://wa.me/${WHATSAPP_ADMIN}?text=${encodeURIComponent(mensaje)}`

/** El chofer le escribe a alguien de la lista hacia Valle Grande (R65): el chat con el saludo listo */
export const whatsappDeLista = (digitos: string) =>
  `https://wa.me/${digitos}?text=${encodeURIComponent("Hola, te escribo de la Línea Auxiliar: estás en la lista hacia Valle Grande.")}`
