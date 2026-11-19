// Contacto de la administración de la línea (docs/especificacion.md R2)

/** WhatsApp del administrador, en formato internacional sin "+" (+55 92 3190-1860, WhatsApp Business) */
export const WHATSAPP_ADMIN = "559231901860"
export const WHATSAPP_ADMIN_VISIBLE = "+55 92 3190-1860"

/** Enlace que abre el chat del admin con el mensaje ya escrito */
export const enlaceWhatsappAdmin = (mensaje: string) => `https://wa.me/${WHATSAPP_ADMIN}?text=${encodeURIComponent(mensaje)}`

/** R117: el chofer le escribe a quien pidió el aviso de un carro al Centro: el chat con el saludo listo */
export const whatsappDePedido = (digitos: string) =>
  `https://wa.me/${digitos}?text=${encodeURIComponent("Hola, te escribo de la Línea Auxiliar: vi que esperas un carro al Centro.")}`

/** El chofer le escribe a alguien de la lista hacia Valle Grande (R65): el chat con el saludo listo */
export const whatsappDeLista = (digitos: string) =>
  `https://wa.me/${digitos}?text=${encodeURIComponent("Hola, te escribo de la Línea Auxiliar: estás en la lista hacia Valle Grande.")}`
