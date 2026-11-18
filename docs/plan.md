# Plan de desarrollo — Trueque Comunitario

Prototipo funcional del trabajo de grado _"Diseño de una aplicación móvil de trueque comunitario para fomentar la economía colaborativa en Bogotá"_ (UMB, 2026).
Fuente de requisitos: Tabla 8 del documento (28 RF y 17 RNF), diagramas UML (Figuras 1–6) y el prompt de desarrollo.

Estado: **aprobado** (2026-11-17), con los cambios de §3 y §7.

---

## 1. Arquitectura

```
┌─────────────────────────── Dispositivo (Android 8+ / iOS) ───────────────────────────┐
│  App Expo (React Native + TypeScript, Expo Router)                                    │
│  Módulos: auth · publicaciones · búsqueda/geo · trueques · mensajería · reputación ·  │
│           administración                                                             │
│  TanStack Query (datos del servidor) · Zustand (sesión, UI) · AsyncStorage (borradores)       │
│  SecureStore (tokens) · expo-location · react-native-maps        │
└───────────────┬──────────────────────────────┬────────────────────────────────────────┘
                │ HTTPS (REST /api/v1)         │ WSS (Socket.IO, /chat)
┌───────────────▼──────────────────────────────▼────────────────────────────────────────┐
│  API NestJS (TypeScript)                                                              │
│  auth · usuarios · categorias · publicaciones · busqueda · trueques (máquina de       │
│  estados) · mensajeria (gateway WS) · notificaciones · reputacion · reportes ·        │
│  admin/indicadores · auditoria · almacenamiento · correo · salud                      │
│  Capas por módulo: controller → service (dominio) → repository (Prisma)               │
└──────┬──────────────────┬───────────────────┬───────────────────┬─────────────────────┘
       │                  │                   │                   │
 PostgreSQL+PostGIS   S3 (SeaweedFS local) SMTP (Mailpit local)   Push (opcional, fuera
 (Prisma)             imágenes+miniaturas                       de Expo Go)
```

**Monorepo** (npm workspaces):

```
/apps/mobile      app Expo
/apps/api         backend NestJS
/packages/shared  esquemas Zod, enums (estados, localidades), tipos DTO compartidos
/docs             plan, arquitectura, trazabilidad, manual de usuario, base de datos, ADRs
docker-compose.yml  postgres+postgis · seaweedfs (S3) · mailpit
```

Decisiones técnicas clave:

| Tema                    | Decisión                                                                                                                                                        | Motivo                                                     |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Validación              | Zod en `packages/shared`, usado por la app (React Hook Form) y por la API (`nestjs-zod`)                                                                        | Una sola fuente de verdad para reglas de formularios y DTO |
| Auth                    | Access JWT 15 min + refresh token rotativo 7 días (hash guardado en BD, revocable). argon2id. Rate limit en login, registro y recuperación                      | RNF08, RNF09                                               |
| Sesión inactiva         | Refresh expira a los 7 días sin uso; logout revoca el refresh                                                                                                   | RNF09 "expiración automática"                              |
| 2FA                     | TOTP (`otplib`), opcional desde Ajustes → Seguridad                                                                                                             | RF-02                                                      |
| Imágenes                | Subida multipart al API, compresión en el cliente (máx. 1280 px), el API genera miniatura 320 px con `sharp` y guarda en S3                                     | RNF04, RNF05                                               |
| Búsqueda                | `tsvector` en español con índice GIN + `unaccent`; distancia con `ST_DWithin` sobre `geography` e índice GiST                                                   | RF-10, RF-11, RF-12, RNF04                                 |
| Privacidad de ubicación | La ubicación de cada publicación se guarda **ofuscada** (desplazamiento aleatorio ≤ 300 m) y la API solo devuelve distancia redondeada ("a 1,2 km") y localidad | RF-12, Ley 1581                                            |
| Paginación              | Por cursor en todos los listados                                                                                                                                | RNF04                                                      |
| Chat                    | Socket.IO con JWT en el handshake; solo pueden entrar las dos partes de una propuesta activa; historial por REST                                                | RF-20                                                      |
| Auditoría               | Interceptor + llamadas explícitas desde servicios de dominio a `AuditoriaService`                                                                               | RNF10                                                      |
| Eliminación de cuenta   | Borrado lógico + anonimización de datos personales; se conservan intercambios y calificaciones anonimizados para las estadísticas                               | RNF11                                                      |

---

## 2. Esquema de base de datos (Prisma)

Diagrama ER completo irá en `docs/base-de-datos.md` (Mermaid). Resumen:

| Modelo                    | Campos principales                                                                                                                                                                                                                                                                                         | Notas                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `Usuario`                 | id, nombre, correo (único), contrasenaHash, localidad (enum), fotoUrl, descripcion, telefonoContacto (privado), rol `CIUDADANO\|ADMIN`, estado `ACTIVO\|SUSPENDIDO\|ELIMINADO`, correoVerificado, totpSecret?, totpActivo, politicaDatosVersion+fecha, terminosVersion+fecha, ubicacion `geography(Point)` | Administrador = mismo modelo con `rol=ADMIN` (herencia de la Figura 1) |
| `UsuarioCategoriaInteres` | usuarioId, categoriaId                                                                                                                                                                                                                                                                                     | N:M "categorías de interés" (RF-05)                                    |
| `CodigoVerificacion`      | usuarioId, tipo `VERIFICAR_CORREO\|RECUPERAR`, codigoHash, expira, intentos                                                                                                                                                                                                                                | RF-02, RF-04                                                           |
| `RefreshToken`            | usuarioId, tokenHash, expira, revocado, dispositivo                                                                                                                                                                                                                                                        | RNF09                                                                  |
| `Categoria`               | id, nombre (único), icono, activa                                                                                                                                                                                                                                                                          | RF-28                                                                  |
| `Publicacion`             | id, titulo, descripcion, tipo `BIEN\|SERVICIO`, estadoConservacion `NUEVO\|COMO_NUEVO\|BUENO\|ACEPTABLE\|NO_APLICA`, estado `DISPONIBLE\|RESERVADA\|INTERCAMBIADA\|OCULTA\|ELIMINADA`, localidad, ubicacion `geography(Point)`, busqueda `tsvector`, usuarioId, categoriaId, fechas                        | Índices GIN y GiST                                                     |
| `ImagenPublicacion`       | id, publicacionId, url, miniaturaUrl, orden (0–4)                                                                                                                                                                                                                                                          | Máx. 5 (validado en API)                                               |
| `PropuestaTrueque`        | id, estado (ver §3), mensaje, publicacionObjetivoId, proponenteId, receptorId, propuestaPadreId?, fechas                                                                                                                                                                                                   | `propuestaPadreId` encadena contrapropuestas                           |
| `PropuestaArticulo`       | propuestaId, publicacionId, lado `OFRECIDO\|SOLICITADO`                                                                                                                                                                                                                                                    | N:M; permite que una contrapropuesta pida otros artículos              |
| `Intercambio`             | id, propuestaId (único), fechaHoraEncuentro, puntoEncuentroId?, puntoTexto, puntoUbicacion, confirmaProponente, confirmaReceptor, fechaConfirmacion                                                                                                                                                        | 1:1 con la propuesta aceptada                                          |
| `PuntoEncuentro`          | id, nombre, tipo (centro comercial, biblioteca, estación, parque), localidad, ubicacion                                                                                                                                                                                                                    | Seed de lugares públicos (RF-16)                                       |
| `Mensaje`                 | id, propuestaId, emisorId, contenido, estado `ENVIADO\|LEIDO`, fecha                                                                                                                                                                                                                                       | RF-20                                                                  |
| `Notificacion`            | id, usuarioId, tipo, titulo, mensaje, datos (JSON: ruta destino), leida, fecha                                                                                                                                                                                                                             | Bandeja RF-21                                                          |
| `DispositivoPush`         | id, usuarioId, token (único), plataforma `ANDROID\|IOS`                                                                                                                                                                                                                                                    | RF-21                                                                  |
| `Calificacion`            | id, intercambioId, calificadorId, calificadoId, puntuacion 1–5, comentario, fecha                                                                                                                                                                                                                          | Único (intercambioId, calificadorId)                                   |
| `Reporte`                 | id, reportanteId, publicacionId?, usuarioReportadoId?, motivo (enum) + detalle, estado `PENDIENTE\|REVISADO\|RESUELTO`, decision `APROBAR\|OCULTAR\|ELIMINAR\|SUSPENDER_USUARIO`?, adminId?, fechas                                                                                                        | RF-24, RF-25                                                           |
| `RegistroAuditoria`       | id, accion, actorId, entidad, entidadId, detalle (JSON), fecha                                                                                                                                                                                                                                             | RNF10                                                                  |

Reputación (promedio e intercambios completados) se calcula con una consulta agregada; si hace falta por rendimiento se cachea en columnas de `Usuario`.

---

## 3. Máquina de estados del trueque

Servicio de dominio `TruequeStateMachine` en el backend: tabla de transiciones permitidas, validación de actor (quién puede ejecutar cada acción) y error **409** ante cualquier transición no permitida. Cada transición se ejecuta en una transacción que además: notifica a la contraparte, escribe auditoría y actualiza el estado de las publicaciones.

| Desde                                 | Acción (actor)                                  | Hacia                                                                                      | Efectos                                                                                                                                                                                                                                                                                             |
| ------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| —                                     | enviar (proponente)                             | `PROPUESTA_CREADA` → `PENDIENTE_RESPUESTA` (automático)                                    | Notifica al receptor                                                                                                                                                                                                                                                                                |
| `PENDIENTE_RESPUESTA`                 | contraproponer (receptor)                       | padre: `CONTRAPROPUESTA` (cerrada); hija nueva: `PENDIENTE_RESPUESTA` con roles invertidos |                                                                                                                                                                                                                                                                                                     |
| `PENDIENTE_RESPUESTA`                 | rechazar (receptor)                             | `RECHAZADA` (fin)                                                                          |                                                                                                                                                                                                                                                                                                     |
| `PENDIENTE_RESPUESTA`                 | cancelar (proponente)                           | `CANCELADA` (fin)                                                                          |                                                                                                                                                                                                                                                                                                     |
| `PENDIENTE_RESPUESTA`                 | aceptar (receptor)                              | `ACEPTADA`                                                                                 | Publicaciones involucradas → `RESERVADA`; las demás propuestas sobre ellas quedan **bloqueadas** (no se pueden aceptar)                                                                                                                                                                             |
| `ACEPTADA`                            | acordar encuentro (cualquiera)                  | `ENCUENTRO_ACORDADO` → `ESPERANDO_CONFIRMACION` (automático)                               | Crea `Intercambio`, muestra consejos de seguridad                                                                                                                                                                                                                                                   |
| `ACEPTADA` / `ESPERANDO_CONFIRMACION` | cancelar (cualquiera)                           | `CANCELADA` (fin)                                                                          | Publicaciones → `DISPONIBLE`; se desbloquean las otras propuestas                                                                                                                                                                                                                                   |
| `ESPERANDO_CONFIRMACION`              | marcar **hecho** (cualquiera de las dos partes) | `INTERCAMBIO_CONFIRMADO` → `CALIFICACION_HABILITADA` (automático)                          | Queda realizado **para ambas partes**; se notifica a la otra; publicaciones → `INTERCAMBIADA`; las otras propuestas bloqueadas se cierran solas (`RECHAZADA`, motivo "el artículo ya fue intercambiado") avisando a sus autores; aparece en el historial de los dos con el nombre de la contraparte |
| `CALIFICACION_HABILITADA`             | calificar (cada parte, opcional)                | `FINALIZADO` cuando califican ambas, o automáticamente a los 7 días                        |                                                                                                                                                                                                                                                                                                     |

Al rechazar o cancelar, las publicaciones vuelven a `DISPONIBLE`. Una publicación puede recibir varias propuestas a la vez; solo una puede estar aceptada. Esta máquina tendrá la mayor cobertura de pruebas del proyecto (RNF16).

> **Cambio respecto al documento (decisión D4):** RF-17 y la Figura 2 piden la confirmación de **ambas** partes. Por decisión del equipo basta con que una marque "hecho". Hay que actualizar la Tabla 8 y la Figura 2.

---

## 4. Endpoints (REST `/api/v1`, documentados en Swagger `/docs`)

**Salud:** `GET /health`

**Auth (RF-01–04, RNF09)**
`POST /auth/registro` · `POST /auth/verificar-correo` · `POST /auth/reenviar-codigo` · `POST /auth/login` (si tiene 2FA devuelve `requiere2fa` + token temporal) · `POST /auth/login/2fa` · `POST /auth/refresh` · `POST /auth/logout` · `POST /auth/recuperar` · `POST /auth/restablecer` · `POST /auth/2fa/configurar` · `POST /auth/2fa/activar` · `POST /auth/2fa/desactivar`

**Usuarios (RF-05, RF-23, RNF11)**
`GET /usuarios/me` · `PATCH /usuarios/me` · `POST /usuarios/me/foto` · `PUT /usuarios/me/ubicacion` · `DELETE /usuarios/me` · `GET /usuarios/:id` (perfil público + reputación) · `GET /usuarios/:id/calificaciones`

**Categorías (RF-28)** — `GET /categorias`

**Publicaciones (RF-06–13)**
`GET /publicaciones?q=&categoriaId=&tipo=&estadoConservacion=&lat=&lng=&radioKm=&cursor=` · `GET /publicaciones/:id` · `POST /publicaciones` · `PATCH /publicaciones/:id` · `DELETE /publicaciones/:id` · `PATCH /publicaciones/:id/estado` · `POST /publicaciones/:id/imagenes` · `DELETE /publicaciones/:id/imagenes/:imagenId` · `GET /usuarios/me/publicaciones?historico=`

**Trueques (RF-14–19)**
`POST /propuestas` · `GET /propuestas?bandeja=recibidas|enviadas|activas|historial` · `GET /propuestas/:id` · `POST /propuestas/:id/aceptar` · `POST /propuestas/:id/rechazar` · `POST /propuestas/:id/contrapropuesta` · `POST /propuestas/:id/cancelar` · `POST /propuestas/:id/encuentro` · `POST /propuestas/:id/confirmar` · `GET /puntos-encuentro?localidad=`

**Mensajería (RF-20)** — `GET /propuestas/:id/mensajes?cursor=`; WebSocket `/chat`: `unirse`, `mensaje:enviar`, `mensaje:nuevo`, `mensaje:leido`, `escribiendo`

**Notificaciones (RF-21)** — `GET /notificaciones` · `PATCH /notificaciones/:id/leida` · `POST /notificaciones/leer-todas` · `POST /dispositivos` · `DELETE /dispositivos/:token`

**Reputación y reportes (RF-22, RF-24)** — `POST /propuestas/:id/calificacion` · `POST /reportes`

**Administración (RF-25–28, RNF10), solo `ADMIN`**
`GET /admin/reportes` · `PATCH /admin/reportes/:id` · `GET /admin/usuarios` · `PATCH /admin/usuarios/:id/estado` · `GET /admin/indicadores` · `GET /admin/indicadores/export.csv` · `GET /admin/auditoria` · `POST /admin/categorias` · `PATCH /admin/categorias/:id`

---

## 5. Mapa de pantallas (Expo Router)

```
(auth)
  bienvenida            onboarding de máx. 3 pantallas (RNF01)
  registro              nombre, correo, contraseña, localidad, checks de política y términos
  verificar-correo      código de 6 dígitos
  login · login-2fa
  recuperar · restablecer
  legal/politica-datos · legal/terminos

(tabs)
  inicio      "Cerca de mí": lista ↔ mapa, selector de radio 1–10 km
  buscar      barra de búsqueda + hoja de filtros
  publicar    formulario único con fotos; borrador guardado automáticamente (RNF07)
  trueques    pestañas: Recibidas · Enviadas · Activos · Historial
  perfil      mi perfil, reputación, mis publicaciones, ajustes

stack
  publicacion/[id] · publicacion/[id]/editar
  usuario/[id]                    perfil público + calificaciones + reportar
  proponer/[publicacionId]        elegir mis artículos + mensaje
  propuesta/[id]                  detalle, línea de tiempo del estado y acciones
  propuesta/[id]/contrapropuesta
  propuesta/[id]/encuentro        mapa de puntos seguros + consejos de seguridad
  propuesta/[id]/chat
  propuesta/[id]/calificar
  reportar
  notificaciones
  ajustes/perfil · ajustes/seguridad (2FA) · ajustes/privacidad (eliminar cuenta)
  admin/ (solo ADMIN) panel · reportes · reportes/[id] · usuarios · categorias · auditoria
```

UI: paleta verde/tierra, modo claro y oscuro, áreas táctiles ≥ 48 dp, fuente base 14 sp con escalado del sistema, _skeletons_, estados vacíos y de error en todas las pantallas, textos en español con tono cercano.

---

## 6. Backlog por sprints

Cada sprint termina con la app y la API arrancando y la funcionalidad probada de punta a punta. Los commits siguen `tipo(RF-xx): descripción`.

| Sprint | Objetivo          | Historias / requisitos                                                                                                                                                                                                                                                    | Entregable verificable                                                                             |
| ------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **0**  | Base técnica      | Monorepo, docker-compose, NestJS con `/health` y Swagger, Prisma + PostGIS + primera migración, Expo con Expo Router, tabs vacías y tema, `packages/shared`, ESLint/Prettier, Jest, CI de GitHub Actions (lint + pruebas), README, `.env.example`, `docs/trazabilidad.md` | `docker compose up`, la API responde `/health`, la app abre en Expo                                |
| **1**  | Cuenta y perfil   | RF-01, RF-02, RF-03, RF-04, RF-05, RNF08, RNF09, RNF11 (consentimiento, eliminación de cuenta), RNF12 (términos), onboarding (RNF01)                                                                                                                                      | Registro → código en Mailpit → login → editar perfil → activar 2FA → eliminar cuenta               |
| **2**  | Publicaciones     | RF-06, RF-07, RF-08, RF-09, seed de categorías, subida de imágenes con miniaturas, borradores offline (RNF07)                                                                                                                                                             | Publicar con 5 fotos, editar, cambiar estado, ver mis publicaciones                                |
| **3**  | Búsqueda y mapa   | RF-10, RF-11, RF-12, RF-13, seed de 10 usuarios y 30 publicaciones en las 3 localidades                                                                                                                                                                                   | Buscar "bicicleta", filtrar por categoría y 3 km, ver mapa y detalle                               |
| **4**  | Trueque           | RF-14, RF-15, RF-16 (seed de puntos seguros), RF-17, RF-18, RF-19, máquina de estados, notificaciones dentro de la app                                                                                                                                                    | Flujo completo entre dos cuentas hasta "Intercambio confirmado"; pruebas de todas las transiciones |
| **5**  | Comunicación      | RF-20 (chat en tiempo real), RF-21 (bandeja interna + avisos en tiempo real)                                                                                                                                                                                              | Chat entre dos teléfonos; aviso en la bandeja al recibir propuesta                                 |
| **6**  | Confianza         | RF-22, RF-23 (insignia verificada, promedio), RF-24                                                                                                                                                                                                                       | Calificar tras el trueque, ver reputación, reportar publicación                                    |
| **7**  | Administración    | RF-25, RF-26, RF-27 (indicadores + CSV), RF-28, RNF10 (auditoría consultable)                                                                                                                                                                                             | Admin oculta una publicación reportada, suspende un usuario y exporta CSV                          |
| **8**  | Calidad y entrega | RNF03 (auditoría de accesibilidad), RNF04/RNF05 (medición), RNF16 (cobertura ≥ 60 %), RNF17 (script k6 con 100 VUs), despliegue para pruebas con usuarios, `docs/manual-usuario.md`, `docs/base-de-datos.md`, builds EAS                                                  | Informe de cobertura, resultado de k6, APK/TestFlight listos para las pruebas SUS/TAM              |

---

## 7. Decisiones tomadas

Ver [decisiones.md](decisiones.md). Resumen:

1. Docker Desktop instalado. La base de datos local usa el puerto 5433 porque hay un PostgreSQL nativo en el 5432.
2. El proyecto vive en `C:\dev\trueque-comunitario`, fuera de OneDrive.
3. Todo gratis y con Expo Go: RF-21 queda como bandeja interna + avisos en tiempo real; sin push con la app cerrada.
4. Sin cuenta de Apple: en iPhone se prueba con Expo Go; los builds instalables serán APK de Android.
5. Mapas: Expo Go ya incluye Google Maps en Android, sin API key.
6. Despliegue para las pruebas con usuarios: opciones gratuitas (Render/Railway + Neon, o túnel), se define en el Sprint 8.
7. Varias propuestas por publicación; al aceptar una, las demás se bloquean (D3).
8. Una sola parte marca el trueque como hecho y queda cerrado para ambas (D4).
