import { Cabecera } from "@/components/cabecera"

// Pantallas sin menú lateral (portada, registro, entrar, en revisión, panel de administración)
export function LayoutSimple({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Cabecera />
      <main className="mx-auto w-full max-w-md px-4 pt-5 pb-10">{children}</main>
    </>
  )
}
