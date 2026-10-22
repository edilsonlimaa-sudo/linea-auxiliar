import { InicioV2 } from "@/components/v2/inicio/inicio"
import { exigirCuentaAprobada } from "@/lib/sesion"

// v2 · Inicio: propuesta con datos de ejemplo (components/v2/inicio/demo.ts). Solo el nombre es de la cuenta
export default async function InicioPagina() {
  const perfil = await exigirCuentaAprobada()
  return <InicioV2 nombre={perfil.nombre.split(" ")[0]} />
}
