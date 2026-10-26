import { LayoutSimple } from "@/components/layout-simple"

export default function LayoutPublico({ children }: { children: React.ReactNode }) {
  return <LayoutSimple>{children}</LayoutSimple>
}
