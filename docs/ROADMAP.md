# Roadmap — de «demo» a app útil

Principio: cada pantalla responde a una pregunta real del usuario y cada número mostrado es real.
Si algo no cumple esto, se elimina.

Rama de trabajo: `claude/prototype-repo-compatibility-180bq8` (PR #1).
Datos: `public/data/tmb-network.json` (generado por `npm run gtfs` desde `data/sources/`).
Motor: `src/services/network/engine.ts` (horarios, posiciones, salidas).

| Paso | Qué | Estado |
| --- | --- | --- |
| 0 | Red TMB real (GTFS), posiciones según horario, salidas por estación, accesos | ✅ hecho |
| 1 | Pantalla «Ahora»: estaciones cercanas (GPS) + próximas salidas, favoritos (Casa/Trabajo/★), navegación móvil inferior | ⏳ |
| 2 | Planificador A→B (CSA portado del prototipo): salir a / llegar antes de, sin escaleras, alternativas | ⏳ |
| 3 | «Último tren a casa» y modo aeropuerto (T1/T2, hora de vuelo + margen) | ⏳ |
| 4 | Avisos ligados a salidas reales: «sal ahora para coger el L1 de las 08:47» | ⏳ |
| 5 | 3D de la estación: accesos reales (accesible/escaleras), andenes por línea, transbordos con tiempo a pie, trenes reales llegando | ⏳ |
| 6 | Limpieza: quitar valores inventados (velocidad/puertas/sonido/incidente de prueba), selector de ciudades vacío; pestañas Ahora / Ruta / Mapa | ⏳ |

## Notas técnicas
- Enrutado: Connection Scan Algorithm sobre conexiones del día (hoy + viajes de ayer que pasan de medianoche).
  Paseos: transbordos dentro de estación (pathways/transfers del GTFS) + a pie ≤ 400 m entre paradas.
- Sin escaleras: paradas con `wheelchair_boarding = 1` (los buses TMB se consideran accesibles).
