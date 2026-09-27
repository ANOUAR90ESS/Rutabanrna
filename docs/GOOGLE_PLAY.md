# Publicar BarnaTransit en Google Play

Guía paso a paso. Lo que ya está preparado en el repo:

| Qué | Dónde |
| --- | --- |
| AAB firmado para subir a Play (se genera solo) | GitHub Actions → «Android APK» → artifact `barnatransit-release-N` (cuando existan los secretos de firma, paso 3) |
| Icono 512×512 | `store/icon-512.png` |
| Gráfico destacado 1024×500 | `store/feature-graphic-1024x500.png` |
| Capturas de teléfono 1080×1920 (7) | `store/screenshots/es/` |
| Política de privacidad (página pública) | `public/privacy.html` → `https://TU-PROYECTO.vercel.app/privacy.html` |
| Textos de la ficha (es / ca / en / ar) | sección 6 de este documento |

---

## 0. Decisiones antes de empezar (no se pueden cambiar después)
- **ID de la app**: `com.barnatransit.app` (en `android/app/build.gradle` y `capacitor.config.ts`). Una vez publicada no se puede cambiar.
- **Tipo de cuenta de desarrollador**: *personal* o *organización*.
  - Las cuentas **personales nuevas** deben hacer una **prueba cerrada con al menos 12 testers durante 14 días seguidos** antes de poder publicar en producción. Consigue ya esos 12 correos de Gmail (amigos, familia).
  - Las cuentas de organización necesitan un número D-U-N-S.

## 1. Cuenta de Google Play Console
1. Entra en https://play.google.com/console y paga la cuota única (25 USD).
2. Verifica tu identidad (documento) y tu teléfono. Google pide además verificar un dispositivo Android con la app Play Console.
3. Correo de contacto de desarrollador: será público en la ficha.

## 2. Web pública (necesaria para la política de privacidad)
1. En `public/privacy.html` sustituye **`CONTACT_EMAIL`** (2 veces) por tu correo de contacto real.
2. Despliega en Vercel (ya tienes `vercel.json`). Comprueba que abre `https://TU-PROYECTO.vercel.app/privacy.html`.
3. En GitHub → Settings → Secrets and variables → Actions → **Variables**:
   - `PUBLIC_URL` = `https://TU-PROYECTO.vercel.app` (enlace a la política dentro de la app)
   - `TMB_PROXY_URL` = `https://TU-PROYECTO.vercel.app/api/tmb` (tiempo real, si ya tienes claves de TMB)

## 3. Clave de subida (firma)
Google Play firma la app con su propia clave (**Play App Signing**); tú solo necesitas una **clave de subida**. Si algún día la pierdes, se puede restablecer desde Play Console (no se pierde la app).
1. Crea la clave (en un ordenador con Java):
   ```bash
   keytool -genkeypair -v -keystore barnatransit-upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
   base64 -w0 barnatransit-upload.jks > barnatransit-upload.jks.b64
   ```
   Guarda el `.jks` y las contraseñas en un lugar seguro (gestor de contraseñas). **No lo subas al repo.**
2. En GitHub → Settings → Secrets and variables → Actions → **Secrets**:
   `ANDROID_KEYSTORE_BASE64` (contenido del `.b64`), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` (= `upload`), `ANDROID_KEY_PASSWORD`.
3. GitHub → Actions → «Android APK» → **Run workflow** (rama `main`). Al terminar descarga `barnatransit-release-N`: dentro está `app-release.aab`.

## 4. Crear la app en Play Console
Play Console → **Crear aplicación**:
- Nombre: **BarnaTransit — Metro y Bus BCN** (máx. 30 caracteres)
- Idioma predeterminado: **Español (España) – es-ES**
- App o juego: **App** · Gratis o de pago: **Gratis**
- Acepta las declaraciones (políticas del programa para desarrolladores y leyes de exportación de EE. UU.).

## 5. Contenido de la app (Política → Contenido de la app)
| Apartado | Respuesta |
| --- | --- |
| Política de privacidad | `https://TU-PROYECTO.vercel.app/privacy.html` |
| Acceso a la app | Toda la funcionalidad está disponible sin credenciales ni acceso especial |
| Anuncios | **No** contiene anuncios |
| Clasificación de contenido | Cuestionario IARC. Categoría: **Todas las demás categorías de apps**. Respuestas: sin violencia, sexo, lenguaje, drogas, juegos de azar. Interacción entre usuarios: **No**. Comparte ubicación con otros usuarios: **No**. Compras digitales: **No**. Resultado esperado: PEGI 3 / Para todos |
| Público objetivo | **13 años o más** (13–15, 16–17, 18+). La app no está dirigida a niños |
| App de noticias | No |
| Apps de salud / financieras / gubernamentales | No / No / **No** (la app **no** es oficial de TMB ni de ninguna administración) |
| Seguridad de los datos | Ver tabla siguiente |

**Seguridad de los datos** (Data safety), coherente con `privacy.html`:
- ¿Recoge o comparte datos? **Sí** (solo el texto de búsqueda de direcciones).
- ¿Todos los datos se cifran en tránsito? **Sí** (HTTPS).
- ¿Pueden los usuarios pedir que se eliminen? Los datos no se guardan en ningún servidor; se borran al borrar los datos de la app → indica que no se almacenan.
- Tipos de datos:
  | Tipo | Recogido | Compartido | Detalles |
  | --- | --- | --- | --- |
  | Ubicación aproximada / precisa | **No** | No | Se usa solo en el dispositivo (Google no lo considera «recogido» si no sale del dispositivo) |
  | Actividad en la app → Historial de búsqueda en la app | **Sí** | **Sí** (servicios de búsqueda de OpenStreetMap: Photon/Nominatim) | Procesado de forma efímera · Opcional · Finalidad: funcionalidad de la app |
  | Resto (datos personales, financieros, contactos, fotos, identificadores…) | No | No | — |

**Permisos**: la app usa ubicación **solo en primer plano** y `SCHEDULE_EXACT_ALARM` (no `USE_EXACT_ALARM`), así que no hace falta formulario especial. Si Play pregunta por las alarmas exactas: *«La función principal “Sal ahora” avisa a la hora exacta de salir de casa para coger un tren o autobús concreto; un retraso de minutos hace perder el transporte.»*

## 6. Ficha de Play Store (Crecer → Presencia en Play Store → Ficha principal)
Categoría: **Mapas y navegación** · Etiquetas: transporte público, metro, autobús.
Correo de contacto y sitio web: tu correo y `https://TU-PROYECTO.vercel.app`.
Gráficos: `store/icon-512.png`, `store/feature-graphic-1024x500.png` y las 7 capturas de `store/screenshots/es/` (orden de los nombres).

> Importante (política de suplantación y metadatos): no uses el logotipo de TMB ni digas que es la app oficial. Los textos ya incluyen «no oficial».

### Español (es-ES) — predeterminado
**Título (≤30):** `BarnaTransit — Metro y Bus BCN`

**Descripción breve (≤80):** `Metro y bus TMB: salidas cerca de ti, rutas sin escaleras y último tren a casa`

**Descripción completa:**
```
BarnaTransit te dice en segundos cuándo sale tu metro o tu bus en Barcelona, cómo llegar a cualquier sitio y cuál es el último tren para volver a casa. Con el horario oficial de TMB y funciona sin conexión.

AHORA
• Estaciones y paradas cercanas con las próximas salidas de cada línea y dirección.
• Casa y Trabajo en un toque, y tus estaciones favoritas.
• «Último tren a casa»: te dice hasta qué hora puedes salir y cuánto te queda.

RUTAS
• Planificador de metro y bus: salir ahora, salir a una hora o llegar antes de una hora.
• Opción «Sin escaleras» con los accesos accesibles y ascensores de cada estación.
• Tiempos de transbordo oficiales y ruta dibujada en el mapa.
• Modo aeropuerto: indica la hora de tu vuelo y te dice cuándo salir hacia T1 o T2.
• Busca estaciones, direcciones y lugares.

AVISOS «SAL AHORA»
• Elige estación, línea, dirección y franja horaria: te avisamos del momento exacto de salir para coger el tren, también con la app cerrada.

ESTACIÓN EN 3D
• Accesos reales (con ascensor o solo escaleras), andenes de cada línea, transbordos y los trenes llegando.

MAPA Y LÍNEAS
• Posición estimada de cada metro y bus según el horario, primer y último servicio y frecuencia de cada línea.

Idiomas: español, català, English, العربية.

App no oficial, no afiliada a TMB. Datos: TMB, datos abiertos (developer.tmb.cat), con la fecha de actualización visible en la app. Mapa © OpenStreetMap © CARTO. Confirma la información oficial en tmb.cat.
```

### Català (ca)
**Títol:** `BarnaTransit — Metro i Bus BCN`
**Descripció breu:** `Metro i bus TMB: sortides a prop, rutes sense escales i últim tren a casa`
**Descripció completa:**
```
BarnaTransit et diu en segons quan surt el teu metro o bus a Barcelona, com arribar a qualsevol lloc i quin és l'últim tren per tornar a casa. Amb l'horari oficial de TMB i funciona sense connexió.

• Estacions i parades a prop amb les properes sortides.
• Casa i Feina amb un toc, i estacions preferides.
• «Últim tren a casa»: fins a quina hora pots sortir.
• Planificador de metro i bus, opció «Sense escales», transbords oficials i mode aeroport (T1/T2).
• Cerca d'estacions, adreces i llocs.
• Avisos «Surt ara» a l'hora exacta, també amb l'app tancada.
• Estació en 3D amb accessos, andanes i trens arribant.
• Mapa i línies amb primer i últim servei.

App no oficial, no afiliada a TMB. Dades: TMB, dades obertes (developer.tmb.cat). Mapa © OpenStreetMap © CARTO.
```

### English (en-US / en-GB)
**Title:** `BarnaTransit: Barcelona Metro`
**Short description:** `TMB metro & bus: nearby departures, step-free routes and last train home`
**Full description:**
```
BarnaTransit tells you in seconds when your metro or bus leaves in Barcelona, how to get anywhere and which is the last train home. Built on the official TMB timetable and works offline.

• Nearby stations and stops with the next departures for each line and direction.
• Home and Work in one tap, plus favourite stations.
• “Last train home”: how late you can leave and how much time you have left.
• Metro & bus trip planner: leave now, depart at or arrive by; step-free option; official interchange times; airport mode for T1/T2.
• Search stations, addresses and places.
• “Leave now” alerts at the exact moment to walk out, even with the app closed.
• 3D station view with real entrances (lift or stairs), platforms and arriving trains.
• Map and lines with first/last service and frequencies.

Unofficial app, not affiliated with TMB. Data: TMB open data (developer.tmb.cat). Map © OpenStreetMap © CARTO.
```

### العربية (ar)
**العنوان:** `BarnaTransit مترو برشلونة`
**الوصف القصير:** `مترو وحافلات TMB: الرحلات القريبة، طرق بدون درج وآخر قطار إلى البيت`
**الوصف الكامل:**
```
يخبرك BarnaTransit خلال ثوانٍ متى ينطلق المترو أو الحافلة في برشلونة، وكيف تصل إلى أي مكان، وما هو آخر قطار للعودة إلى البيت. مبني على الجدول الرسمي لـ TMB ويعمل بدون اتصال.

• المحطات والمواقف القريبة مع الرحلات القادمة لكل خط واتجاه.
• البيت والعمل بلمسة واحدة، والمحطات المفضلة.
• «آخر قطار إلى البيت»: حتى أي ساعة يمكنك الانطلاق.
• مخطط رحلات للمترو والحافلات، خيار «بدون درج»، أزمنة التبديل الرسمية، ووضع المطار (T1/T2).
• البحث عن المحطات والعناوين والأماكن.
• تنبيهات «انطلق الآن» في الوقت الدقيق، حتى والتطبيق مغلق.
• المحطة ثلاثية الأبعاد بمداخلها الحقيقية وأرصفتها والقطارات القادمة.

تطبيق غير رسمي وغير تابع لـ TMB. البيانات: البيانات المفتوحة لـ TMB (developer.tmb.cat). الخريطة © OpenStreetMap © CARTO.
```

## 7. Pruebas y publicación
1. **Prueba interna** (Probar y publicar → Pruebas → Prueba interna): crea una versión, sube `app-release.aab`, añade tu correo como tester y publica. Se instala desde Play en minutos, **sin el aviso de Play Protect**.
2. **Prueba cerrada** (obligatoria para cuentas personales nuevas): crea la pista, sube el mismo AAB, añade **≥12 testers** (lista de correos o Grupo de Google) y comparte el enlace de participación. Deben **aceptar y mantener la app instalada 14 días seguidos**.
3. Pasados los 14 días: Play Console → Panel → **Solicitar acceso a producción** (responde el breve cuestionario sobre la prueba).
4. **Producción**: crea la versión con el AAB más reciente, países (España o todos), y envía a revisión (de horas a varios días).

## 8. Actualizaciones
Cada push a `main` genera un AAB con un `versionCode` mayor (número de ejecución). Para publicar una actualización: descarga el último `barnatransit-release-N` y súbelo como nueva versión en la pista que quieras. Antes del **31/12/2026** actualiza los horarios de TMB (`docs/ANDROID.md` → horarios) o la app mostrará el aviso de datos caducados.
