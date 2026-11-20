import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { Notificacion } from '@trueque/shared';
import { router } from 'expo-router';

import { useAvisos } from '@/store/avisos';
import { AvisoFlotante } from './aviso-flotante';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const aviso = (n: Partial<Notificacion> = {}): Notificacion => ({
  id: 'n1',
  tipo: 'PROPUESTA_NUEVA',
  titulo: 'Tienes una propuesta de trueque',
  mensaje: 'Laura quiere cambiar algo por «Teclado».',
  ruta: '/propuesta/p1',
  leida: false,
  fechaHora: '2026-11-20T10:00:00.000Z',
  ...n,
});

describe('avisos en tiempo real (RF-21)', () => {
  beforeEach(() => useAvisos.setState({ actual: null, chatAbierto: null }));

  it('muestra el aviso y al tocarlo abre la pantalla relacionada', async () => {
    await render(<AvisoFlotante />);
    await act(() => useAvisos.getState().mostrar(aviso()));
    expect(screen.getByText('Tienes una propuesta de trueque')).toBeTruthy();
    await fireEvent.press(screen.getByRole('alert'));
    expect(router.push).toHaveBeenCalledWith('/propuesta/p1');
    expect(useAvisos.getState().actual).toBeNull();
  });

  it('no avisa de los mensajes del chat que ya está abierto', () => {
    useAvisos.getState().abrirChat('p1');
    useAvisos.getState().mostrar(aviso({ tipo: 'MENSAJE_NUEVO', ruta: '/chat/p1' }));
    expect(useAvisos.getState().actual).toBeNull();
    useAvisos.getState().mostrar(aviso({ tipo: 'MENSAJE_NUEVO', ruta: '/chat/otro' }));
    expect(useAvisos.getState().actual?.ruta).toBe('/chat/otro');
  });

  it('el aviso se cierra solo a los 5 segundos', async () => {
    jest.useFakeTimers();
    await render(<AvisoFlotante />);
    await act(() => useAvisos.getState().mostrar(aviso()));
    await act(() => jest.advanceTimersByTime(5000));
    expect(screen.queryByText('Tienes una propuesta de trueque')).toBeNull();
    jest.useRealTimers();
  });
});
