import { redirect } from "next/navigation"

// La pestaña Calificaciones ahora es parte de Mis números (R118): quien llega a la dirección vieja va ahí
export default function CalificacionesAntes() {
  redirect("/n/chofer/numeros#calificaciones")
}
