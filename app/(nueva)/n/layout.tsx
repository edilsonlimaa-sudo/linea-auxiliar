import { MarcaTemporada } from "@/components/nueva/pasajero/navidad"
import { obtenerPerfil } from "@/lib/sesion"
import { temporadaNavidad } from "@/lib/temporada"

// Todo /n (pasajero y chofer). Solo pone la marca de la temporada navideña (§5.25, R98) cuando quien mira es pasajero:
// el CSS del tema (globals.css) se enciende con ella. Cada página sigue exigiendo su cuenta como siempre
export default async function LayoutN({ children }: Readonly<{ children: React.ReactNode }>) {
  const perfil = temporadaNavidad() ? await obtenerPerfil() : null
  return (
    <>
      {perfil?.rol === "pasajero" ? <MarcaTemporada /> : null}
      {children}
    </>
  )
}
