import { cn } from "@/lib/utils"

/**
 * Moldura de celular. No mobile ocupa a tela toda e usa o scroll da janela.
 * No desktop vira uma coluna centralizada de 430px com scroll próprio,
 * para o protótipo ser apresentável em telas grandes.
 */
export function AppShell({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className="min-h-dvh bg-muted/60 sm:flex sm:items-center sm:justify-center sm:py-6">
      <div
        id="app-shell"
        className={cn(
          "relative isolate mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-background",
          "sm:h-[calc(100dvh-3rem)] sm:min-h-0 sm:overflow-y-auto sm:rounded-[2.5rem] sm:border sm:shadow-2xl",
          className
        )}
      >
        {/* Aurora arriba (§5.21): detrás de todo, solo decorativa */}
        <div aria-hidden className="aurora">
          <span />
          <span />
          <span />
        </div>
        {children}
      </div>
    </div>
  )
}
