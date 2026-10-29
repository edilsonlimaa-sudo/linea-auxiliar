import { BotonVolver } from "@/components/nueva/app/volver"
import { cn } from "@/lib/utils"

export function AppHeader({
  title,
  backHref,
  action,
  className,
}: {
  title: React.ReactNode
  /** Quando presente, mostra o botão de voltar: volta no histórico como o do Android; sem tela anterior no app, vai aqui. */
  backHref?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-14 items-center gap-1 border-b bg-background/70 px-2 pt-[env(safe-area-inset-top)] backdrop-blur",
        className
      )}
    >
      {backHref ? (
        <BotonVolver href={backHref} />
      ) : (
        <span className="w-2" />
      )}
      <h1 className="min-w-0 flex-1 truncate font-heading text-lg font-semibold">
        {title}
      </h1>
      {action ? <div className="flex items-center">{action}</div> : null}
    </header>
  )
}
