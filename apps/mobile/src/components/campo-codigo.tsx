import { CampoTexto } from '@/components/ui/campo-texto';
import { FontSize } from '@/constants/theme';

type CampoCodigoProps = {
  valor: string;
  onChange: (v: string) => void;
  error?: string;
  etiqueta?: string;
  onCompleto?: () => void;
};

/** Campo para códigos de 6 dígitos: teclado numérico y autocompletado del SMS/correo cuando el sistema lo permite. */
export function CampoCodigo({
  valor,
  onChange,
  error,
  etiqueta = 'Código de 6 dígitos',
  onCompleto,
}: CampoCodigoProps) {
  return (
    <CampoTexto
      etiqueta={etiqueta}
      value={valor}
      onChangeText={(t) => {
        const limpio = t.replace(/\D/g, '').slice(0, 6);
        onChange(limpio);
        if (limpio.length === 6) onCompleto?.();
      }}
      keyboardType="number-pad"
      autoComplete="one-time-code"
      textContentType="oneTimeCode"
      maxLength={6}
      placeholder="000000"
      style={{ fontSize: FontSize.title, letterSpacing: 8, textAlign: 'center' }}
      error={error}
    />
  );
}
