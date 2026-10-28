"use client"

import { useRecargarSiEsDeVersion } from "@/lib/error-de-version"

// Si falla un layout raíz (clásica o nueva), Next reemplaza todo por esto: trae su propio <html> y no tiene los estilos
// de la app, así que lleva los suyos (colores de la marca, claro u oscuro según el sistema). Un error de versión se
// recarga solo, como en las pantallas de error de cada interfaz.
export default function ErrorGlobal({ error, retry }: { error: unknown; retry: () => void }) {
  const recargando = useRecargarSiEsDeVersion(error)

  return (
    <html lang="es-VE">
      <body>
        <title>Algo salió mal · Línea Auxiliar</title>
        <style>{`
          :root { color-scheme: light dark; --fondo: #ffffff; --texto: #10202f; --suave: #55606b; --marca: #0b3b66; --senal: #f5b400; }
          @media (prefers-color-scheme: dark) { :root { --fondo: #0b0d0e; --texto: #eef2f5; --suave: #a3adb6; --marca: #8fc1ef; } }
          body { margin: 0; background: var(--fondo); color: var(--texto); font: 15px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; }
          main { min-height: 100dvh; max-width: 26rem; margin: 0 auto; padding: 2.5rem 1.5rem; box-sizing: border-box;
                 display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; text-align: center; }
          h1 { margin: 0; font-size: 1.25rem; }
          p { margin: 0; color: var(--suave); }
          .botones { display: flex; flex-direction: column; gap: .5rem; width: 100%; }
          button { min-height: 44px; border-radius: 12px; font: inherit; font-weight: 700; cursor: pointer; }
          button:focus-visible { outline: 3px solid var(--senal); outline-offset: 2px; }
          .principal { background: var(--senal); color: #1c1400; border: 0; }
          .otro { background: transparent; color: var(--marca); border: 2px solid currentColor; }
        `}</style>
        <main>
          {recargando ? (
            <p>Actualizando la app…</p>
          ) : (
            <>
              <h1>Algo salió mal</h1>
              <p>La app no cargó bien. Recárgala para seguir; no se pierde nada.</p>
              <div className="botones">
                <button type="button" className="principal" onClick={() => window.location.reload()}>
                  Recargar la app
                </button>
                <button type="button" className="otro" onClick={() => retry()}>
                  Volver a intentar
                </button>
              </div>
            </>
          )}
        </main>
      </body>
    </html>
  )
}
