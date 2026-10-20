import { LayoutSimple } from "@/components/layout-simple"

// Entrar y cambiar la contraseña: formularios angostos, sin menú (§8)
export default function LayoutAccesoAdmin({ children }: { children: React.ReactNode }) {
  return <LayoutSimple>{children}</LayoutSimple>
}
