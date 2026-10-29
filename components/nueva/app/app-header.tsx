import Link from "next/link"
import { ChevronLeft } from "lucide-react"

import { Button } from "@/components/nueva/ui/button"
import { cn } from "@/lib/utils"

export function AppHeader({
  title,
  backHref,
  action,
  className,
}: {
  title: React.ReactNode
  /** Quando presente, mostra o botão de voltar com transição nav-back. */
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
        <Button
          render={<Link href={backHref} transitionTypes={["nav-back"]} />}
          nativeButton={false}
          variant="ghost"
          size="icon"
          aria-label="Voltar"
        >
          <ChevronLeft className="size-5" />
        </Button>
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
