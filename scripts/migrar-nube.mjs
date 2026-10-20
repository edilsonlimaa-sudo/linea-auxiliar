// Aplica supabase/migrations/*.sql al proyecto de Supabase en la nube por la API de gestión (HTTPS, puerto 443).
// Sirve donde la CLI no llega a Postgres (p. ej. detrás de una VPN, `supabase db push` se queda en
// "Initialising login role..."). Registra cada migración en supabase_migrations.schema_migrations, la misma
// tabla que usa la CLI, así que se pueden mezclar ambas sin repetir nada.
//
// Uso:  npm run db:nube           → aplica las pendientes
//       npm run db:nube -- --ver  → solo muestra cuáles faltan
// Necesita en .env.local (o en el entorno):
//   SUPABASE_ACCESS_TOKEN     (token personal: supabase.com/dashboard/account/tokens; nunca con NEXT_PUBLIC_)
// El proyecto de la nube sale, en este orden, de SUPABASE_PROJECT_REF, del proyecto vinculado por la CLI
// (supabase/.temp/project-ref) o de NEXT_PUBLIC_SUPABASE_URL si apunta a la nube. El app local usa el Supabase del
// Docker, así que NEXT_PUBLIC_SUPABASE_URL normalmente NO sirve aquí.
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"

const token = process.env.SUPABASE_ACCESS_TOKEN
const soloVer = process.argv.includes("--ver")

const vinculado = await readFile(path.join("supabase", ".temp", "project-ref"), "utf8").then((t) => t.trim(), () => "")
const desdeUrl = /^https:\/\/([a-z0-9]+)\.supabase\.co/.exec(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")?.[1] ?? ""
const ref = process.env.SUPABASE_PROJECT_REF || vinculado || desdeUrl

if (!/^[a-z0-9]{20}$/.test(ref)) {
  console.error("No sé cuál es el proyecto de la nube: pon SUPABASE_PROJECT_REF en .env.local (el <ref> de https://<ref>.supabase.co).")
  process.exit(1)
}
if (!token) {
  console.error("Falta SUPABASE_ACCESS_TOKEN (crea uno en https://supabase.com/dashboard/account/tokens y ponlo en .env.local).")
  process.exit(1)
}

async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  })
  const cuerpo = await r.text()
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${cuerpo.slice(0, 500)}`)
  return cuerpo ? JSON.parse(cuerpo) : []
}

const literal = (s) => `'${s.replaceAll("'", "''")}'`

// Historial compatible con la CLI
await sql(`create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);`)
const aplicadas = new Set((await sql("select version from supabase_migrations.schema_migrations")).map((f) => f.version))

const carpeta = path.join(process.cwd(), "supabase", "migrations")
const archivos = (await readdir(carpeta)).filter((a) => /^\d+_.+\.sql$/.test(a)).sort()
const pendientes = archivos.filter((a) => !aplicadas.has(a.split("_")[0]))

console.log(`Proyecto ${ref}: ${archivos.length} migraciones, ${aplicadas.size} ya aplicadas, ${pendientes.length} pendientes.`)
for (const a of pendientes) console.log(`  · ${a}`)
if (soloVer || pendientes.length === 0) process.exit(0)

for (const archivo of pendientes) {
  const version = archivo.split("_")[0]
  const nombre = archivo.slice(version.length + 1, -".sql".length)
  const contenido = await readFile(path.join(carpeta, archivo), "utf8")
  process.stdout.write(`Aplicando ${archivo}… `)
  try {
    // Todo o nada: si falla, la migración no queda a medias ni registrada
    await sql(`begin;
${contenido}
;
insert into supabase_migrations.schema_migrations (version, name) values (${literal(version)}, ${literal(nombre)});
commit;`)
    console.log("listo")
  } catch (e) {
    console.log("ERROR")
    console.error(e.message)
    process.exit(1)
  }
}
console.log("Migraciones aplicadas.")
