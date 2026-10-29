import { redirect } from "next/navigation"

// La lista en Gina ya no es una página: se abre en una hoja desde A Valle Grande (§5.17). Los enlaces viejos llegan ahí
export default function Fila() {
  redirect("/n/a-valle-grande")
}
