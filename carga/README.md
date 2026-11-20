# Prueba de carga (RNF17 y RNF04)

El script [`k6-uso-tipico.js`](k6-uso-tipico.js) simula hasta **100 personas a la vez**. Cada una abre Inicio, busca, abre el detalle de una publicación y revisa sus trueques y avisos. Dura unos 3 minutos y 20 segundos.

La prueba se aprueba si cumple todo esto:

- El 95 % de las respuestas tarda **menos de 2 s** (`http_req_duration p(95) < 2000`). Es la meta de RNF04.
- Falla **menos del 1 %** de las peticiones.
- El detalle de una publicación responde en menos de 1,5 s en el 95 % de los casos.

## Cómo correrla

1. Instala k6. Es gratis: `winget install k6 --source winget`.
2. Arranca la infraestructura y carga los datos de ejemplo: `npm run infra:up` y `npm run db:seed`.
3. Sube el límite de peticiones. El API acepta 120 peticiones por minuto por IP (RNF09), y en esta prueba todas salen del mismo PC. Arranca el API así, en otra terminal:

   ```powershell
   $env:LIMITE_PETICIONES_MINUTO=100000; npm run dev:api
   ```

4. Ejecuta la prueba:

   ```powershell
   k6 run carga/k6-uso-tipico.js
   ```

   Para probar el servidor desplegado: `k6 run -e API=https://tu-api.onrender.com carga/k6-uso-tipico.js`.

5. Al terminar, vuelve a arrancar el API sin la variable para restaurar el límite normal.

## Qué reportar en el informe

Copia del resumen de k6 estos datos:

- `http_req_duration`: promedio, p(90) y p(95).
- `http_req_failed`.
- `iterations`.
- Las métricas `tiempo_busqueda` y `tiempo_detalle`.

Anota también el equipo donde corrió el API (procesador y RAM), porque los tiempos dependen de él.
