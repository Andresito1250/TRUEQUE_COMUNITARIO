# Trazabilidad de requerimientos

Relaciona cada requerimiento de la Tabla 8 con el código, los endpoints y las pruebas que lo implementan. Se actualiza al cerrar cada sprint y sirve como evidencia para el informe (Anexo I).

Estados: ⬜ pendiente · 🟨 en progreso · ✅ implementado y probado

## Requerimientos funcionales

| Código | Requerimiento                                              | Sprint | Estado | Implementación                                           | Pruebas |
| ------ | ---------------------------------------------------------- | ------ | ------ | -------------------------------------------------------- | ------- |
| RF-01  | Registro de usuario                                        | 1      | ⬜     |                                                          |         |
| RF-02  | Verificación de la cuenta                                  | 1      | ⬜     |                                                          |         |
| RF-03  | Inicio y cierre de sesión                                  | 1      | ⬜     |                                                          |         |
| RF-04  | Recuperación de contraseña                                 | 1      | ⬜     |                                                          |         |
| RF-05  | Gestión del perfil                                         | 1      | ⬜     |                                                          |         |
| RF-06  | Registrar publicación                                      | 2      | ⬜     |                                                          |         |
| RF-07  | Editar o eliminar publicación                              | 2      | ⬜     |                                                          |         |
| RF-08  | Actualizar estado de la publicación                        | 2      | ⬜     |                                                          |         |
| RF-09  | Consultar publicaciones propias                            | 2      | ⬜     |                                                          |         |
| RF-10  | Búsqueda por palabra clave                                 | 3      | ⬜     | Base lista: función `f_unaccent` en la migración inicial |         |
| RF-11  | Filtrado de resultados                                     | 3      | ⬜     |                                                          |         |
| RF-12  | Publicaciones cercanas                                     | 3      | ⬜     | Base lista: columnas `geography` e índices GiST          |         |
| RF-13  | Detalle de la publicación                                  | 3      | ⬜     |                                                          |         |
| RF-14  | Enviar propuesta de trueque                                | 4      | ⬜     | Modelo `PropuestaTrueque`, `PropuestaArticulo`           |         |
| RF-15  | Responder la propuesta                                     | 4      | ⬜     |                                                          |         |
| RF-16  | Acordar el encuentro                                       | 4      | ⬜     | Modelo `PuntoEncuentro`                                  |         |
| RF-17  | Confirmar el intercambio (una parte marca "hecho", ver D4) | 4      | ⬜     | Modelo `Intercambio.confirmadoPorId`                     |         |
| RF-18  | Cancelar la propuesta                                      | 4      | ⬜     |                                                          |         |
| RF-19  | Historial de intercambios                                  | 4      | ⬜     |                                                          |         |
| RF-20  | Mensajería interna                                         | 5      | ⬜     |                                                          |         |
| RF-21  | Notificaciones (bandeja interna + tiempo real, ver D2)     | 5      | ⬜     | Modelo `Notificacion`                                    |         |
| RF-22  | Calificar a la contraparte                                 | 6      | ⬜     |                                                          |         |
| RF-23  | Visualizar la reputación                                   | 6      | ⬜     |                                                          |         |
| RF-24  | Reportar contenido o usuarios                              | 6      | ⬜     |                                                          |         |
| RF-25  | Moderar publicaciones reportadas                           | 7      | ⬜     |                                                          |         |
| RF-26  | Gestionar usuarios                                         | 7      | ⬜     |                                                          |         |
| RF-27  | Panel de indicadores                                       | 7      | ⬜     |                                                          |         |
| RF-28  | Administrar categorías                                     | 7      | ⬜     |                                                          |         |

## Requerimientos no funcionales

| Código | Requerimiento                  | Estado | Implementación                                                                                                                                                | Verificación                                         |
| ------ | ------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| RNF01  | Capacidad de aprendizaje       | ⬜     |                                                                                                                                                               | Prueba de usabilidad (tiempo ≤ 5 min)                |
| RNF02  | Satisfacción del usuario       | ⬜     |                                                                                                                                                               | Escala SUS ≥ 70                                      |
| RNF03  | Accesibilidad                  | 🟨     | `apps/mobile/src/constants/theme.ts` (contraste AA, fuente base 16 y mínima 14 sp, `MIN_TOUCH` 48 dp), `components/ui/boton.tsx` (etiquetas de accesibilidad) | `estado-vacio.test.tsx`                              |
| RNF04  | Tiempo de respuesta            | ⬜     |                                                                                                                                                               |                                                      |
| RNF05  | Uso de recursos                | ⬜     |                                                                                                                                                               |                                                      |
| RNF06  | Disponibilidad                 | 🟨     | `GET /health` en `apps/api/src/salud/salud.controller.ts`                                                                                                     | `salud.controller.spec.ts`, `test/salud.e2e-spec.ts` |
| RNF07  | Tolerancia a fallos            | 🟨     | Mensajes de error comprensibles en `apps/mobile/src/lib/api.ts`                                                                                               | `api.test.ts`                                        |
| RNF08  | Confidencialidad               | 🟨     | `helmet` en `apps/api/src/configurar-app.ts`                                                                                                                  |                                                      |
| RNF09  | Autenticidad                   | 🟨     | Límite de peticiones global (`ThrottlerModule`, `app.module.ts`)                                                                                              |                                                      |
| RNF10  | Trazabilidad                   | 🟨     | Modelo `RegistroAuditoria`                                                                                                                                    |                                                      |
| RNF11  | Protección de datos personales | 🟨     | Campos de consentimiento con versión y fecha en `Usuario`                                                                                                     |                                                      |
| RNF12  | Uso lícito de la plataforma    | 🟨     | Campos de aceptación de términos en `Usuario`                                                                                                                 |                                                      |
| RNF13  | Compatibilidad de dispositivos | 🟨     | Expo SDK 58 (Android e iOS desde un solo código)                                                                                                              | `expo-doctor` 20/20                                  |
| RNF14  | Idioma e identidad local       | 🟨     | Interfaz en español                                                                                                                                           |                                                      |
| RNF15  | Modularidad                    | 🟨     | Monorepo con capas separadas; un módulo NestJS por dominio; Git                                                                                               |                                                      |
| RNF16  | Capacidad de prueba            | 🟨     | Vitest (API, shared), Jest + RNTL (app), CI en `.github/workflows/ci.yml`                                                                                     |                                                      |
| RNF17  | Escalabilidad                  | ⬜     |                                                                                                                                                               | Script de carga (Sprint 8)                           |
