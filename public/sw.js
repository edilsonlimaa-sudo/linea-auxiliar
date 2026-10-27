// Service worker de los avisos en el celular (docs/especificacion.md §5.23, R90). Solo recibe el aviso y lo muestra;
// no guarda páginas ni intercepta pedidos (la app funciona igual con o sin él).

self.addEventListener("push", (evento) => {
  let datos = {}
  try {
    datos = evento.data ? evento.data.json() : {}
  } catch {
    datos = { texto: evento.data ? evento.data.text() : "" }
  }
  evento.waitUntil(
    self.registration.showNotification(datos.titulo || "Línea Auxiliar", {
      body: datos.texto || "",
      icon: "/icono-192.png",
      badge: "/insignia-96.png",
      tag: datos.id, // la misma notificación no se repite
      lang: "es-VE",
      data: { url: datos.url || "/n/notificaciones" },
    })
  )
})

// Tocar el aviso abre la pestaña Notificaciones: en la app si ya está abierta, si no, una nueva
self.addEventListener("notificationclick", (evento) => {
  evento.notification.close()
  const url = (evento.notification.data && evento.notification.data.url) || "/n/notificaciones"
  evento.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
      for (const ventana of ventanas) {
        if ("focus" in ventana) {
          ventana.focus()
          if ("navigate" in ventana) return ventana.navigate(url)
          return
        }
      }
      return self.clients.openWindow(url)
    })
  )
})
