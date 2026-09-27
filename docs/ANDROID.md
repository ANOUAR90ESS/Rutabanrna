# App Android (Capacitor)

La app Android es la misma app web empaquetada con [Capacitor](https://capacitorjs.com): los horarios de TMB van **dentro del APK** (funciona sin conexión) y los avisos «Sal ahora» son **notificaciones nativas** que llegan también con la app cerrada (se programan para los próximos 7 días y se renuevan cada vez que se abre la app).

- Identificador: `com.barnatransit.app` (en `capacitor.config.ts` y `android/app/build.gradle`; cámbialo antes de publicar si quieres otro).
- Permisos: ubicación (estaciones cercanas y rutas desde tu posición), notificaciones y alarmas exactas (avisos puntuales).

## Conseguir el APK (sin instalar nada)
Cada push a `main` (y cada PR) ejecuta **GitHub Actions → «Android APK»**, que compila el APK.
1. GitHub → pestaña **Actions** → última ejecución de «Android APK» → sección **Artifacts** → `barnatransit-debug-N`.
2. Descomprime el zip y copia el `.apk` al móvil.
3. Ábrelo y permite «Instalar apps desconocidas» para el navegador/gestor de archivos.

## Tiempo real TMB en la app
La app llama al proxy de Vercel (las claves TMB nunca van en el APK):
1. Despliega en Vercel y pon `TMB_APP_ID` / `TMB_APP_KEY` en Vercel → Settings → Environment Variables.
2. En GitHub → Settings → Secrets and variables → Actions → **Variables**, crea `TMB_PROXY_URL` = `https://TU-PROYECTO.vercel.app/api/tmb`.
3. Vuelve a ejecutar el workflow. Sin esta variable la app usa el horario oficial (igual que sin claves).

## Versión firmada para Google Play
> Guía completa de publicación (ficha, capturas, privacidad, seguridad de datos, pruebas): [`GOOGLE_PLAY.md`](GOOGLE_PLAY.md).

1. Crea una clave (una sola vez, guárdala bien: sin ella no podrás actualizar la app en Play):
   ```bash
   keytool -genkeypair -v -keystore barnatransit.jks -alias barnatransit -keyalg RSA -keysize 2048 -validity 10000
   base64 -w0 barnatransit.jks > barnatransit.jks.b64
   ```
2. En GitHub → Settings → Secrets and variables → Actions → **Secrets**:
   `ANDROID_KEYSTORE_BASE64` (contenido de `.b64`), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` (`barnatransit`), `ANDROID_KEY_PASSWORD`.
3. El workflow generará además `barnatransit-release-N` con el APK firmado y el **AAB** que se sube a Google Play Console.
4. En Play Console: ficha de la app, política de privacidad (puede basarse en «Fuentes y aviso legal»), declaración de permisos de ubicación y alarmas exactas, y capturas.

## Desarrollo local (opcional)
Requiere Android Studio (SDK) y Java 21.
```bash
npm run build && npx cap sync android   # copia dist/ al proyecto Android
npx cap open android                    # abre Android Studio → Run
```
Tras regenerar los horarios (`npm run gtfs`) basta con volver a compilar: el APK nuevo lleva los datos nuevos.
