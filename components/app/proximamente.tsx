import { HammerIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

/** Página aún sin construir: título y qué va a tener */
export function Proximamente({ titulo, contenido }: { titulo: string; contenido: string }) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-[26px] leading-tight font-bold">{titulo}</h1>
      <Alert>
        <HammerIcon aria-hidden />
        <AlertTitle>En construcción</AlertTitle>
        <AlertDescription>{contenido}</AlertDescription>
      </Alert>
    </div>
  )
}
