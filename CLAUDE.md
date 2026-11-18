# Trueque Comunitario — guía para agentes

Prototipo de trabajo de grado (UMB 2026). Monorepo npm workspaces: `apps/mobile` (Expo SDK 58, Expo Router), `apps/api` (NestJS 12 ESM, Prisma 7, PostGIS) y `packages/shared` (Zod, enums).

## Reglas del proyecto

- Toda la interfaz y los mensajes van en **español**, con tono cercano a Bogotá.
- Debe funcionar en **Expo Go** y ser **100 % gratuito**: no agregues librerías con código nativo fuera de Expo Go ni servicios de pago. Instala dependencias móviles con `npx expo install`.
- Commits pequeños con el código del requerimiento: `feat(RF-14): …`, `fix(RNF07): …`, `test: …`, `docs: …`.
- Actualiza `docs/trazabilidad.md` cada vez que implementes un RF/RNF.
- Las reglas del trueque viven en el backend (máquina de estados, docs/plan.md §3). Una transición no permitida responde 409.
- Lee `docs/decisiones.md` antes de cambiar algo de arquitectura.

## Notas técnicas

- API ESM: las importaciones relativas terminan en `.js`; las pruebas usan Vitest (`vi.fn()`).
- Validación con Zod mediante `StandardSchemaValidationPipe` (`@Body({ schema })`).
- Prisma 7: la URL está en `prisma.config.ts`; `migrate dev` ya no ejecuta `generate` ni el seed. Las columnas PostGIS son `Unsupported(...)` y se manejan con SQL crudo.
- `packages/shared` se consume compilado (`dist/`): ejecuta `npm run build:shared` tras modificarlo.
- La base de datos local escucha en el puerto 5433.
- Comprobaciones antes de terminar una tarea: `npm run lint`, `npm run typecheck`, `npm test` y `npm run test:e2e -w api`.
