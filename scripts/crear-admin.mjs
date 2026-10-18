// Crea la cuenta de administración (usuario + contraseña). Uso:
//   npm run admin:crear
// Variables (en .env.local o en el entorno):
//   NEXT_PUBLIC_SUPABASE_URL   URL del proyecto
//   SUPABASE_SECRET_KEY        clave secreta del proyecto (nunca en el navegador ni en el repositorio)
//   ADMIN_USUARIO              por defecto "admin"
//   ADMIN_CLAVE                obligatoria fuera del entorno local; en local, por defecto "admin123"
// La cuenta queda marcada para cambiar la contraseña la primera vez que entra al panel.
import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const secreta = process.env.SUPABASE_SECRET_KEY
const usuario = (process.env.ADMIN_USUARIO ?? "admin").trim().toLowerCase()
const local = /127\.0\.0\.1|localhost/.test(url ?? "")
// Una contraseña por defecto conocida solo se acepta en local: en producción alguien podría entrar antes que tú
const clave = process.env.ADMIN_CLAVE ?? (local ? "admin123" : undefined)

function salirConError(mensaje) {
  console.error(`\n✖ ${mensaje}\n`)
  process.exit(1)
}

if (!url || !secreta) salirConError("Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SECRET_KEY.")
if (!/^[a-z0-9._-]{3,30}$/.test(usuario)) salirConError("ADMIN_USUARIO: 3 a 30 letras minúsculas, números, punto, guion o guion bajo.")
if (!clave) salirConError("Fuera del entorno local define ADMIN_CLAVE con una contraseña segura (al menos 8 caracteres).")
if (clave.length < 8) salirConError("ADMIN_CLAVE debe tener al menos 8 caracteres.")

const supabase = createClient(url, secreta, { auth: { persistSession: false, autoRefreshToken: false } })

// crear_admin (migración 20261016130000_admin.sql) solo la puede ejecutar la clave secreta
const { error } = await supabase.rpc("crear_admin", { p_usuario: usuario, p_clave: clave })
if (error) salirConError(`No se pudo crear: ${error.message}`)

console.log(`\n✔ Cuenta de administración creada.\n  Usuario: ${usuario}\n  Entra en /admin/entrar; el panel pedirá cambiar la contraseña.\n`)
