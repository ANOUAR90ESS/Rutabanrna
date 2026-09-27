# BarnaTransit 3D — Barcelona (TMB)

App de Metro y autobuses de TMB con datos **reales** (GTFS oficial). Cada pantalla responde a una pregunta del usuario:

| Pestaña | Pregunta que responde |
| --- | --- |
| **Ahora** | ¿Cuándo sale el próximo metro/bus cerca de mí? Estaciones cercanas por GPS con salidas en directo, favoritos (Casa, Trabajo, ★) y **«Último tren a casa»**. |
| **Ruta** | ¿Cómo voy de A a B? Planificador (salir ahora / salir a las / llegar antes de), opción **sin escaleras**, con o sin bus, transbordos con los tiempos oficiales, ruta dibujada en el mapa, **modo aeropuerto** (hora del vuelo + margen). |
| **Mapa** | ¿Dónde están los trenes? Posiciones calculadas cada segundo desde el horario oficial; panel de salidas y accesos por estación. |
| **Líneas** | Horarios de primer/último servicio y frecuencia real de cada línea. |
| **Más → Estación 3D** | ¿Por dónde entro y dónde está el andén? Accesos reales (accesibles con ascensor / solo escaleras), andenes por línea, tiempos de transbordo oficiales y trenes llegando. |
| **Más → Mis avisos** | «Sal ahora para coger el L1 de las 08:47»: avisos ligados a salidas reales, con tiempo a pie y margen (funcionan con la app abierta). |

Tiempo real TMB opcional: con claves de [developer.tmb.cat](https://developer.tmb.cat) (`VITE_TMB_APP_ID` / `VITE_TMB_APP_KEY` en `.env`) el panel de la estación usa las predicciones de iTransit; sin claves se usa el horario oficial y la app lo indica. Funciona sin conexión (service worker + paquete offline).

Plan y estado del trabajo: [`docs/ROADMAP.md`](docs/ROADMAP.md).

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
| `src/services/network/router.ts` | Planificador (Connection Scan Algorithm): salir a / llegar antes de, sin escaleras. |
| `src/services/departureAlerts.ts` | Avisos «sal ahora» sobre salidas reales. |
| `src/components/now/`, `trip/`, `alerts/`, `station3d/` | Pantallas Ahora, Ruta, Avisos y Estación 3D. |
| `src/hooks/useTmbNetwork.ts` | Carga la red (red → caché offline) y el reloj de la UI. |

Fuente de datos: TMB, datos abiertos (licencia de reutilización de developer.tmb.cat). App no afiliada a TMB.
