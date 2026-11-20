# Despliegue para las pruebas con usuarios

Hay dos formas de que otras personas prueben la app con **Expo Go**. Las dos son gratuitas.

| Opción                     | Cuándo usarla                                                             | Qué necesitas                                 |
| -------------------------- | ------------------------------------------------------------------------- | --------------------------------------------- |
| **A. Túnel desde tu PC**   | Sesiones de prueba guiadas: la gente prueba mientras tu PC está encendido | Nada adicional                                |
| **B. Servidor en la nube** | El piloto de varios días: la app funciona aunque tu PC esté apagado       | Cuentas gratuitas en Supabase, Render y Brevo |

En las dos opciones cada participante instala **Expo Go** desde Play Store o App Store y abre el proyecto con un código QR o un enlace.

---

## Opción A: túnel desde tu PC

Sirve para las pruebas de usabilidad (RNF01, RNF02): las personas usan la app desde su propia red mientras tú observas.

1. Arranca la infraestructura y el API como siempre:

   ```powershell
   npm run infra:up
   npm run dev:api
   ```

2. Expón el API con un túnel gratuito de Cloudflare. No necesita cuenta. Instálalo una vez con `winget install Cloudflare.cloudflared` y luego ejecuta:

   ```powershell
   cloudflared tunnel --url http://localhost:3000
   ```

   Copia la dirección que aparece, del tipo `https://algo-al-azar.trycloudflare.com`.

3. Crea `apps/mobile/.env` con esa dirección:

   ```
   EXPO_PUBLIC_API_URL=https://algo-al-azar.trycloudflare.com
   ```

4. Arranca Metro también por túnel, para que funcione desde cualquier red:

   ```powershell
   cd apps/mobile
   npx expo start --tunnel
   ```

5. Comparte el código QR. La dirección del túnel cambia cada vez que lo arrancas: repite los pasos 2 a 4 en cada sesión.

> El chat en tiempo real también funciona por el túnel de Cloudflare: admite WebSocket.

---

## Opción B: servidor en la nube

| Pieza                    | Servicio gratuito                     | Notas                                                                |
| ------------------------ | ------------------------------------- | -------------------------------------------------------------------- |
| Base de datos            | **Supabase** (PostgreSQL con PostGIS) | 500 MB; ya incluye `postgis` y `unaccent`                            |
| Fotos                    | **Supabase Storage** (compatible S3)  | 1 GB; el API las sirve en `/api/v1/archivos`                         |
| API (NestJS + Socket.IO) | **Render** (Web Service gratuito)     | Se «duerme» tras 15 min sin uso; la primera petición tarda unos 30 s |
| Correo (códigos)         | **Brevo** (SMTP gratuito)             | 300 correos al día                                                   |
| App                      | **Expo Go** + **EAS Update** (gratis) | Las personas abren la app con un enlace, sin tu PC encendido         |

### 1. Base de datos y fotos en Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com), en la región más cercana (São Paulo o Virginia).
2. En **Database → Extensions** activa `postgis` y `unaccent`.
3. En **Connect**, copia la cadena del **Session pooler** (puerto 5432). Esa es tu `DATABASE_URL`. Agrégale `?sslmode=require` si no lo trae.
4. En **Storage**, crea un bucket privado llamado `trueque`.
5. En **Storage → S3 Connection**, crea unas llaves de acceso y anota el endpoint, la región, el _access key_ y el _secret_.
6. Desde tu PC, aplica las migraciones y los datos iniciales sobre la base de Supabase:

   ```powershell
   cd apps/api
   $env:DATABASE_URL="postgresql://...supabase..."
   npx prisma migrate deploy
   $env:SEED_ADMIN_CONTRASENA="UnaClaveSegura2026"; npm run db:seed
   ```

   Para el piloto con personas reales usa `$env:SEED_DEMO="false"`, así no se crean los vecinos de ejemplo (D22). Cambia también la contraseña del administrador.

### 2. Correo con Brevo

1. Crea una cuenta en [brevo.com](https://www.brevo.com) y verifica un remitente (tu correo).
2. En **SMTP y API**, copia el usuario y la clave SMTP.
3. La variable queda así: `SMTP_URL=smtp://USUARIO:CLAVE@smtp-relay.brevo.com:587`.
4. Define `MAIL_FROM` con ese remitente, por ejemplo `Trueque Comunitario <tu-correo@gmail.com>`.

### 3. API en Render

1. Sube el repositorio a GitHub. Puede ser privado.
2. En [render.com](https://render.com) crea un **Web Service** desde el repositorio y configúralo así:

   | Campo             | Valor                                                                                  |
   | ----------------- | -------------------------------------------------------------------------------------- |
   | Runtime           | Node                                                                                   |
   | Build command     | `npm ci && npm run build:shared && npm run db:generate -w api && npm run build -w api` |
   | Start command     | `cd apps/api && npx prisma migrate deploy && node dist/main.js`                        |
   | Health check path | `/health`                                                                              |
   | Plan              | Free                                                                                   |

3. Define estas variables de entorno (**Environment**):

   | Variable                | Valor                                                                                                                |
   | ----------------------- | -------------------------------------------------------------------------------------------------------------------- |
   | `NODE_VERSION`          | `24`                                                                                                                 |
   | `NODE_ENV`              | `production`                                                                                                         |
   | `DATABASE_URL`          | La del Session pooler de Supabase                                                                                    |
   | `JWT_ACCESS_SECRET`     | Texto aleatorio largo; genéralo con `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
   | `JWT_REFRESH_SECRET`    | Otro texto aleatorio distinto                                                                                        |
   | `S3_ENDPOINT`           | El endpoint S3 de Supabase                                                                                           |
   | `S3_REGION`             | La región que muestra Supabase                                                                                       |
   | `S3_BUCKET`             | `trueque`                                                                                                            |
   | `AWS_ACCESS_KEY_ID`     | Access key de Supabase Storage                                                                                       |
   | `AWS_SECRET_ACCESS_KEY` | Secret de Supabase Storage                                                                                           |
   | `SMTP_URL`, `MAIL_FROM` | Los de Brevo                                                                                                         |

   **Nunca** subas estos valores al repositorio.

4. Al terminar, abre `https://tu-servicio.onrender.com/health`. Debe responder `"estado":"ok"`.

### 4. La app con EAS Update

1. En `apps/mobile`, inicia sesión y enlaza el proyecto a tu cuenta gratuita de Expo:

   ```powershell
   npx eas-cli@latest login
   npx eas-cli@latest update:configure
   ```

2. Publica la app apuntando al API de Render:

   ```powershell
   $env:EXPO_PUBLIC_API_URL="https://tu-servicio.onrender.com"
   npx eas-cli@latest update --branch piloto --message "Piloto"
   ```

3. Comparte el enlace o el QR que muestra la página del _update_ en [expo.dev](https://expo.dev). Las personas lo abren con Expo Go.
4. Cada vez que cambies la app, repite el paso 2.

### Antes del piloto, revisa esto

- [ ] `SEED_DEMO=false` y la contraseña del administrador cambiada.
- [ ] El correo de contacto de la política de datos está completo. Hoy hay un TODO en `apps/mobile/src/contenido/legal.ts`.
- [ ] Las coordenadas de los puntos de encuentro están verificadas (D23).
- [ ] La prueba de carga se corrió contra Render (`carga/README.md`) y los resultados están anotados.
- [ ] Hiciste una prueba completa con dos celulares: registro, publicar, proponer, aceptar, acordar el encuentro, chatear, marcar hecho y calificar.
