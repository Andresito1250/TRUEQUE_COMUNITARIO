import { useCallback, useEffect, useState } from 'react';

/** Cuenta regresiva en segundos (p. ej. para esperar antes de reenviar un código). */
export function useCuentaRegresiva(inicial = 0) {
  const [segundos, setSegundos] = useState(inicial);

  useEffect(() => {
    if (segundos <= 0) return;
    const t = setTimeout(() => setSegundos((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [segundos]);

  const reiniciar = useCallback((s: number) => setSegundos(s), []);
  return { segundos, activa: segundos > 0, reiniciar };
}
