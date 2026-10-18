import { LogOutIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { salir } from "@/lib/acciones/cuenta"

// Formulario con Server Action: funciona aunque el JavaScript aún no haya cargado
export function BotonSalir() {
  return (
    <form action={salir}>
      <Button type="submit" variant="outline" className="w-full">
        <LogOutIcon aria-hidden /> Salir
      </Button>
    </form>
  )
}
