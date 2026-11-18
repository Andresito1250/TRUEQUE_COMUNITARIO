import { fireEvent, render, screen } from '@testing-library/react-native';

import { EstadoVacio } from './estado-vacio';

describe('EstadoVacio', () => {
  it('muestra título, descripción y ejecuta la acción', async () => {
    const onPress = jest.fn();
    await render(
      <EstadoVacio
        icono="leaf-outline"
        titulo="Sin publicaciones"
        descripcion="Publica lo primero"
        accion={{ titulo: 'Publicar', onPress }}
      />,
    );
    expect(screen.getByText('Sin publicaciones')).toBeTruthy();
    expect(screen.getByText('Publica lo primero')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Publicar' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
