import { MegaphoneIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

/** Si la línea está trabajando (R48, opcional) y el aviso del día (R47) */
export function EstadoLinea({ unidadesEnServicio, aviso }: { unidadesEnServicio?: number; aviso: { texto: string } | null }) {
  return (
    <div className="flex flex-col gap-3">
      {unidadesEnServicio !== undefined && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <span aria-hidden className={cn("size-2.5 rounded-full", unidadesEnServicio > 0 ? "bg-success" : "bg-muted-foreground")} />
          {unidadesEnServicio === 0
            ? "Ningún chofer trabajando ahora"
            : unidadesEnServicio === 1
              ? "1 chofer trabajando ahora"
              : `${unidadesEnServicio} choferes trabajando ahora`}
        </p>
      )}
      {aviso && (
        <Alert variant="warning">
          <MegaphoneIcon aria-hidden />
          <AlertTitle>Aviso de hoy</AlertTitle>
          <AlertDescription>{aviso.texto}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
