import { fireEvent, render, screen } from '@testing-library/react-native';

import { ElegirEstrellas, Estrellas } from './estrellas';

describe('reputación en la app (RF-22, RF-23)', () => {
  it('las estrellas se leen bien con el lector de pantalla', async () => {
    await render(<Estrellas valor={4.5} />);
    expect(screen.getByLabelText('4,5 de 5 estrellas')).toBeTruthy();
  });

  it('se elige la calificación tocando una estrella', async () => {
    const onChange = jest.fn();
    await render(<ElegirEstrellas valor={0} onChange={onChange} />);
    await fireEvent.press(screen.getByRole('radio', { name: '4 estrellas: Buena' }));
    expect(onChange).toHaveBeenCalledWith(4);
    expect(screen.getAllByRole('radio')).toHaveLength(5);
  });
});
