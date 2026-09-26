# BarnaTransit 3D — Barcelona (TMB)

Mapa en vivo del Metro y los autobuses de TMB con datos **reales**:

- **Red oficial**: las 11 líneas de metro/funicular y las 104 líneas de bus de TMB, con sus 2.700+ estaciones y paradas, recorridos reales (shapes) y colores oficiales, generados desde el GTFS de TMB.
- **Posiciones en vivo según el horario oficial**: cada segundo se calcula dónde está cada tren y bus en circulación a partir de la hora de Barcelona (Europe/Madrid) y del horario GTFS, igual que el prototipo «Último tren».
- **Próximas salidas por estación** con hora exacta, aviso de «último» servicio de la noche y horarios de primer/último servicio por línea.
- **Tiempo real TMB (opcional)**: con claves de [developer.tmb.cat](https://developer.tmb.cat) (`VITE_TMB_APP_ID` / `VITE_TMB_APP_KEY` en `.env`), el panel de la estación usa las predicciones de iTransit; sin claves se usa el horario oficial y la app lo indica («Horario oficial TMB»).
- **Sin conexión**: el service worker (`public/sw.js`) y el gestor offline guardan la red y el horario completo.

## Desarrollo

```bash
bun install        # o npm install
npm run dev        # http://localhost:3000
npm run lint       # tsc --noEmit
npm run build
```

## Actualizar los horarios (nuevo GTFS de TMB)

Los datos incluidos son válidos del **21/09/2026 al 31/12/2026**.

1. Sustituye `data/sources/tmb-gtfs.zip` por el GTFS nuevo (y opcionalmente `data/sources/accessos_estacio_linia.json` de los datos abiertos de TMB, usado para los ascensores).
2. Ejecuta `npm run gtfs` → regenera `public/data/tmb-network.json` (~1,7 MB, ~280 KB gzip).
3. Cambia `VERSION` en `public/sw.js` para que los móviles descarguen la versión nueva.

## Estructura

| Ruta | Qué hace |
| --- | --- |
| `scripts/build-gtfs.mjs` | Convierte el GTFS en el JSON compacto (patrones, servicios por fecha, shapes simplificados, horas interpoladas en paradas sin hora). |
| `src/services/network/engine.ts` | Motor: posiciones de vehículos, salidas por estación, último servicio, avisos derivados del horario. |
| `src/services/network/clock.ts` | Reloj de Barcelona (independiente de la zona horaria del dispositivo). |
| `src/services/network/realtime.ts` | Integración opcional con TMB iTransit. |
| `src/hooks/useTmbNetwork.ts` | Carga la red (red → caché offline) y el reloj de la UI. |

Fuente de datos: TMB, datos abiertos (licencia de reutilización de developer.tmb.cat). App no afiliada a TMB.
