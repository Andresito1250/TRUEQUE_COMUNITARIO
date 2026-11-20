import { fireEvent, render, screen } from '@testing-library/react-native';

import { CampoTexto } from './campo-texto';
import { Casilla } from './casilla';
import { Selector } from './selector';

describe('componentes de formulario (RNF03)', () => {
  it('Selector simple marca la opción elegida con rol de radio', async () => {
    const onChange = jest.fn();
    await render(
      <Selector
        etiqueta="Localidad"
        opciones={[
          { valor: 'SUBA', etiqueta: 'Suba' },
          { valor: 'KENNEDY', etiqueta: 'Kennedy' },
        ]}
        valor="SUBA"
        onChange={onChange}
      />,
    );
    expect(screen.getByRole('radio', { name: 'Suba' }).props.accessibilityState.selected).toBe(
      true,
    );
    await fireEvent.press(screen.getByRole('radio', { name: 'Kennedy' }));
    expect(onChange).toHaveBeenCalledWith('KENNEDY');
  });

  it('Selector múltiple agrega y quita valores', async () => {
    const onChange = jest.fn();
    await render(
      <Selector
        multiple
        etiqueta="Intereses"
        opciones={[
          { valor: 1, etiqueta: 'Libros' },
          { valor: 2, etiqueta: 'Ropa' },
        ]}
        valor={[1]}
        onChange={onChange}
      />,
    );
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Ropa' }));
    expect(onChange).toHaveBeenLastCalledWith([1, 2]);
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Libros' }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('Casilla alterna y muestra el error', async () => {
    const onChange = jest.fn();
    await render(
      <Casilla
        marcada={false}
        onChange={onChange}
        etiqueta="Acepto la política"
        error="Debes aceptar"
      />,
    );
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Acepto la política' }));
    expect(onChange).toHaveBeenCalledWith(true);
    expect(screen.getByText('Debes aceptar')).toBeTruthy();
  });

  it('CampoTexto de contraseña permite mostrarla', async () => {
    await render(<CampoTexto etiqueta="Contraseña" contrasena value="abc" />);
    expect(screen.getByLabelText('Contraseña').props.secureTextEntry).toBe(true);
    await fireEvent.press(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(screen.getByLabelText('Contraseña').props.secureTextEntry).toBe(false);
  });
});
