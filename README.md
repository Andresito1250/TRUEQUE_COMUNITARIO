# Trueque Comunitario

Prototipo de aplicación móvil (Android e iOS) para intercambiar bienes y servicios **sin dinero** entre ciudadanos de Bogotá. Las localidades piloto son Suba, Kennedy y Teusaquillo.

Trabajo de grado de Ingeniería de Software, Universidad Manuela Beltrán (2026):
_"Diseño de una aplicación móvil de trueque comunitario para fomentar la economía colaborativa en Bogotá"_.
Autores: Galindo Quiñones Andrés Felipe, Franco Galindo Andrés David y Murillo Navarrete Juan Esteban.

Todo el stack es **gratuito** y la app se prueba con **Expo Go**, sin cuentas de pago.

## Estructura

```
apps/mobile       App Expo (React Native + TypeScript, Expo Router)
apps/api          API NestJS + Prisma + PostgreSQL/PostGIS
packages/shared   Enums, constantes y esquemas Zod compartidos
docs/             Plan, trazabilidad RF/RNF → código, decisiones
docker/           Archivos de apoyo para docker-compose
docker-compose.yml  Postgres+PostGIS, almacenamiento S3 (SeaweedFS) y correo (Mailpit)
```

## Requisitos

| Herramienta                | Versión                  | Cómo comprobarla                              |
| -------------------------- | ------------------------ | --------------------------------------------- |
| Node.js                    | 24.15 o superior         | `node -v`                                     |
| Docker Desktop (con WSL 2) | reciente                 | `docker --version` y `docker compose version` |
| Expo Go en el celular      | la de la tienda (SDK 58) | Play Store / App Store                        |

Docker Desktop debe estar **abierto** para que funcione `docker compose`.

## Puesta en marcha

```bash
# 1. Dependencias de todo el monorepo
npm install

# 2. Infraestructura local (base de datos, S3 y correo)
npm run infra:up

# 3. Variables de entorno del API
cp apps/api/.env.example apps/api/.env

# 4. Migraciones de la base de datos
npm run db:migrate

# 4b. Datos iniciales: categorías y cuenta de administrador
npm run db:seed

# 5. API (http://localhost:3000)
npm run dev:api

# 6. App móvil (en otra terminal)
npm run dev:mobile
```

| Servicio                     | URL local                                    |
| ---------------------------- | -------------------------------------------- |
| API                          | http://localhost:3000/api/v1                 |
| Estado del servicio          | http://localhost:3000/health                 |
| Documentación Swagger        | http://localhost:3000/docs                   |
| Bandeja de correos (Mailpit) | http://localhost:8025                        |
| Almacenamiento S3            | http://localhost:8333                        |
| PostgreSQL                   | `localhost:5433` (usuario y clave `trueque`) |

> La base de datos usa el puerto **5433** para no chocar con un PostgreSQL instalado en Windows.

## Probar en el celular con Expo Go

1. El celular y el PC deben estar en la **misma red Wi-Fi**.
2. Ejecuta `npm run dev:mobile` y escanea el código QR:
   - **Android:** desde la app Expo Go.
   - **iPhone:** con la cámara del teléfono.
3. La pestaña **Inicio** muestra la tarjeta "Conectado al servidor" si la app llega al API.
4. Si dice "Sin conexión al servidor":
   - Permite Node.js en el **Firewall de Windows** para redes privadas, o abre el puerto 3000:
     `netsh advfirewall firewall add rule name="Trueque API" dir=in action=allow protocol=TCP localport=3000` (PowerShell como administrador).
   - Verifica que la red Wi-Fi esté marcada como **privada** en Windows.
   - Si la red bloquea conexiones entre dispositivos (redes universitarias), usa `npx expo start --tunnel` y expone el API con un túnel gratuito (por ejemplo `cloudflared tunnel --url http://localhost:3000`) definiendo `EXPO_PUBLIC_API_URL` en `apps/mobile/.env`.

### Códigos de verificación en local

En tu PC **los correos no llegan a Gmail ni a ningún buzón real**: los recibe Mailpit. Para ver el código de verificación o de recuperación de contraseña, abre **http://localhost:8025** en el navegador del PC.

Cuenta de administrador creada por el seed (solo para desarrollo): `admin@trueque.local` / `Admin2026`.

El seed también crea **10 vecinos de ejemplo** con 30 publicaciones en Suba, Kennedy y Teusaquillo (las imágenes dicen «Imagen de ejemplo»). Puedes entrar con cualquiera de ellos para probar la búsqueda desde otra cuenta:

| Correo                      | Localidad   |
| --------------------------- | ----------- |
| `laura@demo.trueque.local`  | Suba        |
| `andres@demo.trueque.local` | Suba        |
| `diana@demo.trueque.local`  | Kennedy     |
| `felipe@demo.trueque.local` | Teusaquillo |

Contraseña de todos: `Vecino2026`. También existen `marcela`, `julian`, `carlos`, `sofia`, `patricia` y `mateo`. Para no crearlos: `SEED_DEMO=false npm run db:seed`.

### Limitaciones de Expo Go

- No hay **notificaciones push** con la app cerrada; Expo las retiró de Expo Go. La app usa una bandeja de notificaciones interna y avisos en tiempo real mientras está abierta (RF-21).
- Solo se usan librerías incluidas en Expo Go. Cualquier dependencia nueva se instala con `npx expo install`.

## Scripts útiles

| Comando                    | Qué hace                                        |
| -------------------------- | ----------------------------------------------- |
| `npm run lint`             | Lint de todos los paquetes                      |
| `npm run typecheck`        | Verificación de tipos                           |
| `npm test`                 | Pruebas unitarias (shared, API y app)           |
| `npm run test:e2e -w api`  | Pruebas e2e del API (requiere la base de datos) |
| `npm run db:studio -w api` | Explorador visual de la base de datos           |
| `npm run infra:down`       | Detiene los contenedores                        |

## Builds para tiendas (opcional, más adelante)

Con EAS Build (`npx eas-cli@latest build`) se genera un APK de Android **gratis** dentro del plan gratuito de Expo. Para iPhone fuera de Expo Go (TestFlight) se necesita la cuenta de Apple Developer, que es de pago y no está en el alcance actual.

## Documentación

- [docs/plan.md](docs/plan.md): arquitectura, modelo de datos, endpoints, pantallas y sprints.
- [docs/trazabilidad.md](docs/trazabilidad.md): RF/RNF → archivos, endpoints y pruebas.
- [docs/decisiones.md](docs/decisiones.md): decisiones técnicas y del equipo.
