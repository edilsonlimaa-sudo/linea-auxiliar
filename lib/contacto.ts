// Contacto de la administración de la línea (docs/especificacion.md R2)

/** WhatsApp del administrador, en formato internacional sin "+" (0412-9801484) */
export const WHATSAPP_ADMIN = "584129801484"
export const WHATSAPP_ADMIN_VISIBLE = "0412-9801484"

/** Enlace que abre el chat del admin con el mensaje ya escrito */
export const enlaceWhatsappAdmin = (mensaje: string) => `https://wa.me/${WHATSAPP_ADMIN}?text=${encodeURIComponent(mensaje)}`
