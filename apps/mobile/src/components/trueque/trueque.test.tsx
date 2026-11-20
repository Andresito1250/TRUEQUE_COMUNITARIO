import { render, screen } from '@testing-library/react-native';
import type { PropuestaResumen, PublicacionResumen } from '@trueque/shared';

import { haceCuanto } from '@/lib/fechas';
import { InsigniaPropuesta, TarjetaPropuesta } from './tarjeta-propuesta';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const pub = (id: string, titulo: string): PublicacionResumen => ({
  id,
  titulo,
  tipo: 'BIEN',
  estado: 'DISPONIBLE',
  estadoConservacion: 'BUENO',
  localidad: 'SUBA',
  categoria: { id: 1, nombre: 'Juguetes', icono: null },
  miniaturaUrl: null,
  fechaPublicacion: '2026-11-20T10:00:00.000Z',
});

const base: PropuestaResumen = {
  id: 'p1',
  estado: 'PENDIENTE_RESPUESTA',
  soyProponente: true,
  contraparte: {
    id: 'u2',
    nombre: 'Laura Rodríguez',
    fotoUrl: null,
    verificado: true,
    localidad: 'SUBA',
  },
  solicitadas: [pub('a', 'Bicicleta de Laura')],
  ofrecidas: [pub('b', 'Libro mío'), pub('c', 'Casco mío')],
  bloqueada: false,
  motivoCierre: null,
  actualizadoEn: '2026-11-20T10:00:00.000Z',
};

describe('trueques en la app (RF-14 a RF-19)', () => {
  it('quien propone ve lo que recibe arriba y lo que da abajo', async () => {
    await render(<TarjetaPropuesta propuesta={base} />);
    expect(screen.getByText('Bicicleta de Laura')).toBeTruthy();
    expect(screen.getByText('por Libro mío y 1 más')).toBeTruthy();
    expect(screen.getByText('Esperando respuesta')).toBeTruthy();
  });

  it('quien recibe la propuesta lo ve al revés', async () => {
    await render(<TarjetaPropuesta propuesta={{ ...base, soyProponente: false }} />);
    expect(screen.getByText('Libro mío y 1 más')).toBeTruthy();
    expect(screen.getByText('por Bicicleta de Laura')).toBeTruthy();
  });

  it('D3: una propuesta bloqueada se muestra en pausa', async () => {
    await render(<InsigniaPropuesta estado="PENDIENTE_RESPUESTA" bloqueada />);
    expect(screen.getByText('En pausa')).toBeTruthy();
  });

  it('D4: cualquier estado realizado se ve como "Trueque hecho"', async () => {
    await render(<InsigniaPropuesta estado="CALIFICACION_HABILITADA" />);
    expect(screen.getByText('Trueque hecho')).toBeTruthy();
  });

  it('muestra hace cuánto pasó algo', () => {
    const ahora = Date.parse('2026-11-20T12:00:00.000Z');
    expect(haceCuanto('2026-11-20T11:58:00.000Z', ahora)).toBe('hace 2 min');
    expect(haceCuanto('2026-11-20T09:00:00.000Z', ahora)).toBe('hace 3 h');
    expect(haceCuanto('2026-11-19T06:00:00.000Z', ahora)).toBe('ayer');
  });
});
