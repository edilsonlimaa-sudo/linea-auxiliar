import { ViewTransition } from "react"

import { cn } from "@/lib/utils"

const directional = {
  "nav-forward": "nav-forward",
  "nav-back": "nav-back",
  default: "none",
} as const

/**
 * Envolve o conteúdo de cada page.tsx. Aplica o push/pop direcional
 * conforme o transitionType do Link que disparou a navegação.
 * Deve ficar na página, não no layout: layouts persistem e não animam.
 */
export function Screen({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <ViewTransition enter={directional} exit={directional} default="none">
      <main className={cn("flex flex-1 flex-col", className)}>{children}</main>
    </ViewTransition>
  )
}
