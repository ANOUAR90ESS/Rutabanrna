# Cumplimiento de la licencia de reutilización de TMB

Resumen de las «Condiciones generales de contratación online… licencia no exclusiva para la reutilización de contenidos de bases de datos de TMB» (developer.tmb.cat) y cómo las cumple BarnaTransit.

## Lo que concede la licencia
- Licencia **no exclusiva, gratuita, mundial e indefinida** para reproducir, distribuir, comunicar públicamente y **crear obras derivadas** de: datos estáticos **GTFS** y datos en **tiempo real** de la API de TMB.
- Se obtiene registrándose en developer.tmb.cat, **dando de alta cada aplicación** y aceptando las condiciones; cada aplicación tiene sus propias claves (`app_id` / `app_key`).

## Obligaciones y cómo se cumplen

| Obligación | Implementación |
| --- | --- |
| **Citar la fuente y la fecha de la última actualización** en la app | Pie visible en «Ahora», «Ruta» y «Estación 3D»: «Datos: TMB · horarios actualizados el DD/MM/AAAA · válidos hasta…» (`components/legal/DataAttribution.tsx`). Atribución del mapa: «Datos TMB · fecha». Página **Más → Fuentes y aviso legal** con cada fuente y su fecha (`components/legal/AboutView.tsx`). En tiempo real se muestra la hora de la última respuesta. Las fechas las genera `npm run gtfs` (`sources` en `tmb-network.json`). |
| **No alterar ni desnaturalizar los contenidos** | Las horas, líneas, nombres y colores se muestran tal como los publica TMB. Todo lo que es cálculo propio (obra derivada) se identifica como tal: posiciones «estimadas según el horario (no es GPS)», horas de bus en paradas sin hora publicada marcadas «≈», avisos «según horario» con la nota «no es un aviso de TMB», y la página de fuentes explica qué es dato de TMB y qué se calcula. Si los horarios incluidos caducan, la app lo avisa en lugar de mostrar horas como válidas (`DataStatusBanner`). |
| **Reutilizar solo para la aplicación indicada en la solicitud** | Acción del titular: registrar **esta** app (BarnaTransit, web/PWA) en developer.tmb.cat y usar sus claves solo aquí. Las claves no se incluyen en el JavaScript público: el servidor `server/index.mjs` (`npm start`) añade `app_id`/`app_key` y solo permite los dos endpoints que usa la app (`itransit/bus/parades/{código}` y `itransit/metro/estacions`), con caché de 15 s para no sobrecargar la API. |
| **Sin garantía de TMB / TMB puede cambiar o retirar datos y API** | Aviso en «Fuentes y aviso legal». Si la API falla o no está configurada, la app vuelve al horario GTFS. Si cambia el GTFS, se regenera con `npm run gtfs`. |
| **El cliente responde de los daños derivados de la reutilización** | La app se presenta como **no oficial y no afiliada a TMB**, invita a confirmar la información oficial en tmb.cat y en estaciones, y no usa el logotipo de TMB. |
| **Revisar periódicamente las condiciones** | Tarea del titular (ver lista abajo). |

## Otras fuentes con atribución obligatoria
- Mapa base: © OpenStreetMap contributors (ODbL) y © CARTO — mostrado en el control de atribución del mapa.
- Búsqueda de direcciones: Photon (komoot) y Nominatim, datos © OpenStreetMap contributors. Nominatim prohíbe el uso intensivo/autocompletado: aquí solo es respaldo cuando Photon falla; para mucho tráfico, usar instancias propias (`VITE_PHOTON_URL`, `VITE_NOMINATIM_URL`).

## Lista para el titular de la app
1. Crear usuario en https://developer.tmb.cat y **dar de alta la aplicación «BarnaTransit»** (describir: app web/PWA de información de metro y bus TMB), aceptando las condiciones.
2. Copiar `app_id` y `app_key` en el servidor como `TMB_APP_ID` / `TMB_APP_KEY` (nunca como `VITE_…` en producción) y construir con `VITE_TMB_PROXY_URL=/api/tmb`.
3. Actualizar el GTFS antes de que caduque (31/12/2026): sustituir `data/sources/tmb-gtfs.zip`, `npm run gtfs`, cambiar `VERSION` en `public/sw.js`.
4. Revisar periódicamente las condiciones de developer.tmb.cat por si cambian.
