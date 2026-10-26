import { redirect } from "next/navigation"

// Entrar ahora es la portada (docs/especificacion.md §8). Se mantiene para enlaces viejos y marcadores.
export default function PaginaEntrar() {
  redirect("/")
}
