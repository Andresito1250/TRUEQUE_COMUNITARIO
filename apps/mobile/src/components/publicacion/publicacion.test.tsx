import { fireEvent, render, screen } from '@testing-library/react-native';
import type { PublicacionResumen } from '@trueque/shared';
import { router } from 'expo-router';

import { EditorFotos, type Foto } from './editor-fotos';
import { InsigniaEstado } from './insignia-estado';
import { TarjetaPublicacion } from './tarjeta-publicacion';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const resumen: PublicacionResumen = {
  id: 'p1',
  titulo: 'Bicicleta rin 16',
  tipo: 'BIEN',
  estado: 'RESERVADA',
  estadoConservacion: 'BUENO',
  localidad: 'SUBA',
  categoria: { id: 5, nombre: 'Juguetes', icono: 'happy-outline' },
  miniaturaUrl: null,
  fechaPublicacion: '2026-11-20T10:00:00.000Z',
};

describe('publicaciones en la app', () => {
  it('la tarjeta muestra título, tipo, categoría y estado, y abre el detalle', async () => {
    await render(<TarjetaPublicacion publicacion={resumen} />);
    expect(screen.getByText('Bicicleta rin 16')).toBeTruthy();
    expect(screen.getByText('Objeto · Juguetes')).toBeTruthy();
    expect(screen.getByText('Reservada')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: /Bicicleta rin 16/ }));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/publicacion/[id]',
      params: { id: 'p1' },
    });
  });

  it('la insignia traduce el estado (RF-08)', async () => {
    await render(<InsigniaEstado estado="INTERCAMBIADA" />);
    expect(screen.getByText('Intercambiada')).toBeTruthy();
  });

  it('el editor permite agregar fotos hasta llegar a 5 (RF-06)', async () => {
    const tres: Foto[] = ['a', 'b', 'c'].map((u) => ({ tipo: 'local', uri: `file:///${u}.jpg` }));
    const { rerender } = await render(
      <EditorFotos fotos={tres} onAgregar={jest.fn()} onQuitar={jest.fn()} />,
    );
    expect(screen.getByText('Fotos (3 de 5)')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Agregar fotos' })).toBeTruthy();

    const cinco: Foto[] = [
      ...tres,
      { tipo: 'local', uri: 'file:///d.jpg' },
      { tipo: 'local', uri: 'file:///e.jpg' },
    ];
    await rerender(<EditorFotos fotos={cinco} onAgregar={jest.fn()} onQuitar={jest.fn()} />);
    expect(screen.getByText('Fotos (5 de 5)')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Agregar fotos' })).toBeNull();
  });

  it('el editor avisa qué foto se quita', async () => {
    const onQuitar = jest.fn();
    const fotos: Foto[] = [
      { tipo: 'remota', id: 'i1', url: 'http://x/1.jpg' },
      { tipo: 'local', uri: 'file:///2.jpg' },
    ];
    await render(<EditorFotos fotos={fotos} onAgregar={jest.fn()} onQuitar={onQuitar} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Quitar foto 2' }));
    expect(onQuitar).toHaveBeenCalledWith(fotos[1]);
  });
});
