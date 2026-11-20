/**
 * RNF17 (escalabilidad) y RNF04 (tiempo de respuesta): prueba de carga con k6.
 *
 * Simula hasta 100 personas usando la app al mismo tiempo: abren Inicio (cercanas), buscan,
 * filtran, abren el detalle de una publicación y revisan sus trueques y avisos.
 *
 * Uso (ver carga/README.md):
 *   k6 run carga/k6-uso-tipico.js
 *   k6 run -e API=https://mi-api.onrender.com carga/k6-uso-tipico.js
 *
 * Requiere los datos de ejemplo del seed (cuentas <nombre>@demo.trueque.local).
 */
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const API = (__ENV.API || 'http://localhost:3000').replace(/\/+$/, '');
const CONTRASENA = __ENV.CONTRASENA || 'Vecino2026';
const CUENTAS = ['laura', 'andres', 'diana', 'felipe', 'patricia'];
const PALABRAS = ['bici', 'libro', 'clases', 'ropa', 'teclado', 'olla', 'guitarra', 'lego'];
const CENTROS = [
  { lat: 4.741, lng: -74.0838 }, // Suba
  { lat: 4.6297, lng: -74.151 }, // Kennedy
  { lat: 4.645, lng: -74.094 }, // Teusaquillo
];

const busqueda = new Trend('tiempo_busqueda', true);
const detalle = new Trend('tiempo_detalle', true);

export const options = {
  scenarios: {
    uso_tipico: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },
        { duration: '30s', target: 100 },
        { duration: '2m', target: 100 },
        { duration: '20s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    // RNF04: el 95 % de las respuestas en menos de 2 s; casi sin errores.
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.01'],
    tiempo_busqueda: ['p(95)<2000'],
    tiempo_detalle: ['p(95)<1500'],
    checks: ['rate>0.99'],
  },
};

/** Inicia sesión una vez con cada cuenta de ejemplo y reparte los tokens entre los usuarios virtuales. */
export function setup() {
  const tokens = CUENTAS.map((u) => {
    const r = http.post(
      `${API}/api/v1/auth/login`,
      JSON.stringify({ correo: `${u}@demo.trueque.local`, contrasena: CONTRASENA }),
      { headers: { 'Content-Type': 'application/json' } },
    );
    if (r.status !== 200)
      throw new Error(`No se pudo iniciar sesión con ${u}: ${r.status} ${r.body}`);
    return r.json('accessToken');
  });
  return { tokens };
}

const elegir = (lista) => lista[Math.floor(Math.random() * lista.length)];

export default function ({ tokens }) {
  const params = { headers: { Authorization: `Bearer ${tokens[(__VU - 1) % tokens.length]}` } };
  const centro = elegir(CENTROS);
  let ids = [];

  group('Inicio: cerca de mí', () => {
    const r = http.get(
      `${API}/api/v1/publicaciones?orden=cercania&lat=${centro.lat}&lng=${centro.lng}`,
      params,
    );
    busqueda.add(r.timings.duration);
    check(r, { 'cercanas 200': (x) => x.status === 200 });
    if (r.status === 200) ids = r.json('items').map((p) => p.id);
    http.get(`${API}/api/v1/actividad`, params);
  });
  sleep(1);

  group('Buscar con filtros', () => {
    const r = http.get(
      `${API}/api/v1/publicaciones?q=${elegir(PALABRAS)}&radioKm=${elegir([3, 5, 10])}&lat=${centro.lat}&lng=${centro.lng}`,
      params,
    );
    busqueda.add(r.timings.duration);
    check(r, { 'búsqueda 200': (x) => x.status === 200 });
  });
  sleep(1);

  if (ids.length) {
    group('Detalle', () => {
      const r = http.get(
        `${API}/api/v1/publicaciones/${elegir(ids)}?lat=${centro.lat}&lng=${centro.lng}`,
        params,
      );
      detalle.add(r.timings.duration);
      check(r, { 'detalle 200': (x) => x.status === 200 });
    });
    sleep(1);
  }

  group('Trueques y avisos', () => {
    const r = http.get(`${API}/api/v1/propuestas?bandeja=recibidas`, params);
    check(r, { 'bandeja 200': (x) => x.status === 200 });
    http.get(`${API}/api/v1/notificaciones`, params);
  });
  sleep(2);
}
