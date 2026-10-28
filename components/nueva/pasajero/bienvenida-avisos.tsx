"use client"

import { BellRing, Car, Loader2, Megaphone, Smartphone } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/nueva/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/nueva/ui/drawer"
import { activarAvisos, bienvenidaVista, type EstadoAvisos, marcarBienvenidaVista, revisarAvisos } from "@/lib/avisos-celular"

/**
 * Bienvenida a los avisos (R90): la primera vez que se abre la interfaz nueva en este aparato, una hoja explica para qué
 * sirven y ofrece activarlos. El permiso del navegador se pide solo al tocar "Activar avisos" (si se niega, el navegador
 * no deja volver a preguntar). En un iPhone sin la app instalada explica cómo instalarla. Se muestra una sola vez;
 * "Ahora no" deja el recordatorio de Inicio para el día siguiente.
 */
export function BienvenidaAvisos() {
  const [estado, setEstado] = React.useState<EstadoAvisos | null>(null)
  const [abierta, setAbierta] = React.useState(false)
  const [pendiente, iniciar] = React.useTransition()

  React.useEffect(() => {
    if (bienvenidaVista()) return
    let vigente = true
    revisarAvisos()
      .then((e) => {
        if (!vigente) return
        // Ya activados, bloqueados o sin soporte: no hay nada que ofrecer aquí
        if (e === "inactivo" || e === "iphone") {
          setEstado(e)
          setAbierta(true)
        } else marcarBienvenidaVista(false)
      })
      .catch(() => {})
    return () => {
      vigente = false
    }
  }, [])

  const cerrar = (ahoraNo: boolean) => {
    marcarBienvenidaVista(ahoraNo)
    setAbierta(false)
  }
  const activar = () =>
    iniciar(async () => {
      const r = await activarAvisos()
      cerrar(r.estado !== "activo")
    })

  if (!estado) return null
  const iphone = estado === "iphone"

  return (
    <Drawer open={abierta} onOpenChange={(v) => !v && cerrar(true)} showSwipeHandle>
      <DrawerContent className="sm:mx-auto sm:max-w-[430px]">
        <DrawerHeader>
          <div className="mx-auto mb-2 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {iphone ? <Smartphone className="size-7" /> : <BellRing className="size-7" />}
          </div>
          <DrawerTitle className="text-center font-heading text-xl">
            {iphone ? "Instala la app para recibir avisos" : "¿Te avisamos en el celular?"}
          </DrawerTitle>
          <DrawerDescription className="text-center">
            {iphone
              ? "En el iPhone los avisos solo llegan con la app en tu pantalla de inicio: toca Compartir → Agregar a inicio y ábrela desde ese ícono."
              : "Te llegan aunque tengas la app cerrada. Solo lo importante:"}
          </DrawerDescription>
        </DrawerHeader>
        {iphone ? null : (
          <ul className="flex flex-col gap-3 px-6 pb-2">
            <li className="flex items-start gap-3">
              <Car className="mt-0.5 size-5 shrink-0 text-primary" />
              <span className="text-sm">Cuando sale un carro al Centro y pediste que te avisemos.</span>
            </li>
            <li className="flex items-start gap-3">
              <Megaphone className="mt-0.5 size-5 shrink-0 text-primary" />
              <span className="text-sm">Las novedades de la línea: cambios, días sin servicio, avisos importantes.</span>
            </li>
          </ul>
        )}
        <DrawerFooter>
          {iphone ? (
            <Button size="lg" onClick={() => cerrar(true)}>
              Entendido
            </Button>
          ) : (
            <>
              <Button size="lg" disabled={pendiente} onClick={activar}>
                {pendiente ? <Loader2 className="animate-spin" /> : <BellRing />}
                Activar avisos
              </Button>
              <Button variant="ghost" size="lg" disabled={pendiente} onClick={() => cerrar(true)}>
                Ahora no
              </Button>
            </>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
