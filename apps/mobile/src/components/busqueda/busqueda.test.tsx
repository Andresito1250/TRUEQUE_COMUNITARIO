import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { PublicacionResumen } from '@trueque/shared';

import { TarjetaPublicacion } from '@/components/publicacion/tarjeta-publicacion';
import { consulta } from '@/hooks/use-busqueda';
import { useFiltros } from '@/store/filtros';
import { BarraBusqueda } from './barra-busqueda';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('expo-location', () => ({}));

const resumen: PublicacionResumen = {
  id: 'p1',
  titulo: 'Clases de guitarra',
  tipo: 'SERVICIO',
  estado: 'DISPONIBLE',
  estadoConservacion: 'NO_APLICA',
  localidad: 'TEUSAQUILLO',
  categoria: { id: 7, nombre: 'Clases y tutorías', icono: 'school-outline' },
  miniaturaUrl: null,
  fechaPublicacion: '2026-11-20T10:00:00.000Z',
};

describe('búsqueda en la app (RF-10 a RF-12)', () => {
  it('arma la consulta sin los filtros vacíos', () => {
    expect(
      consulta({ q: 'bici roja', categoriaId: 3, tipo: undefined, lat: null, pagina: 1 }),
    ).toBe('?q=bici%20roja&categoriaId=3&pagina=1');
    expect(consulta({ q: '' })).toBe('');
  });

  it('en los resultados la tarjeta muestra distancia y zona en vez del estado', async () => {
    await render(<TarjetaPublicacion publicacion={{ ...resumen, distanciaM: 1200 }} />);
    expect(screen.getByText('a 1,2 km · Teusaquillo')).toBeTruthy();
    expect(screen.queryByText('Disponible')).toBeNull();
    expect(screen.getByRole('button', { name: /a 1,2 km/ })).toBeTruthy();
  });

  it('la barra busca 400 ms después de dejar de escribir y se puede borrar', async () => {
    jest.useFakeTimers();
    const onBuscar = jest.fn();
    await render(<BarraBusqueda valor="" onBuscar={onBuscar} />);
    await fireEvent.changeText(screen.getByLabelText('Buscar publicaciones'), 'bici');
    expect(onBuscar).not.toHaveBeenCalled();
    await act(() => jest.advanceTimersByTime(400));
    expect(onBuscar).toHaveBeenLastCalledWith('bici');

    await fireEvent.press(screen.getByRole('button', { name: 'Borrar búsqueda' }));
    expect(onBuscar).toHaveBeenLastCalledWith('');
    jest.useRealTimers();
  });

  it('los filtros conservan la palabra buscada y "limpiar" solo quita los filtros', () => {
    const f = useFiltros.getState();
    f.buscarTexto('  libros ');
    f.aplicar({ categoriaId: 2, radioKm: 3 });
    expect(useFiltros.getState().filtros).toEqual({ q: 'libros', categoriaId: 2, radioKm: 3 });
    useFiltros.getState().limpiar();
    expect(useFiltros.getState().filtros).toEqual({ q: 'libros' });
    useFiltros.getState().verCategoria(5);
    expect(useFiltros.getState().filtros).toEqual({ categoriaId: 5 });
  });
});
