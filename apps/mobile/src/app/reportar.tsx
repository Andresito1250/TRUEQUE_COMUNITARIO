import { MOTIVO_REPORTE_NOMBRE, MotivoReporte } from '@trueque/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Aviso } from '@/components/ui/aviso';
import { Boton } from '@/components/ui/boton';
import { CampoTexto } from '@/components/ui/campo-texto';
import { Pantalla } from '@/components/ui/pantalla';
import { Selector } from '@/components/ui/selector';
import { Texto } from '@/components/ui/texto';
import { useReportar } from '@/hooks/use-confianza';
import { mensajeDeError } from '@/lib/api';

/** RF-24: reportar una publicación o a una persona. Lo revisa el equipo de moderación (RF-25). */
export default function ReportarScreen() {
  const { publicacionId, usuarioId, nombre } = useLocalSearchParams<{
    publicacionId?: string;
    usuarioId?: string;
    nombre?: string;
  }>();
  const reportar = useReportar();
  const [motivo, setMotivo] = useState<MotivoReporte | undefined>();
  const [detalle, setDetalle] = useState('');

  if (reportar.isSuccess) {
    return (
      <Pantalla bordeSuperior={false}>
        <Aviso
          tipo="exito"
          mensaje="Gracias por avisarnos. El equipo de moderación lo revisará pronto."
        />
        <Texto color="textSecondary">
          Si te sientes en riesgo, cancela el trueque y no vayas al encuentro. En una emergencia
          llama a la línea 123.
        </Texto>
        <Boton titulo="Volver" onPress={() => router.back()} />
      </Pantalla>
    );
  }

  const otro = motivo === 'OTRO';
  return (
    <Pantalla bordeSuperior={false}>
      <Texto>
        {publicacionId ? 'Vas a reportar la publicación' : 'Vas a reportar a'}{' '}
        <Texto negrita>«{nombre}»</Texto>. Tu reporte es confidencial: la otra persona no sabrá
        quién lo hizo.
      </Texto>
      <Selector
        etiqueta="¿Qué pasa?"
        opciones={Object.values(MotivoReporte).map((m) => ({
          valor: m,
          etiqueta: MOTIVO_REPORTE_NOMBRE[m],
        }))}
        valor={motivo}
        onChange={setMotivo}
      />
      <CampoTexto
        etiqueta={otro ? 'Cuéntanos qué pasó' : 'Detalles (opcional)'}
        value={detalle}
        onChangeText={setDetalle}
        multiline
        maxLength={500}
        placeholder="Lo que nos cuentes ayuda a revisarlo más rápido"
      />
      <Aviso mensaje={reportar.error ? mensajeDeError(reportar.error) : null} />
      <Boton
        titulo="Enviar reporte"
        disabled={!motivo || (otro && detalle.trim().length < 10)}
        cargando={reportar.isPending}
        onPress={() =>
          motivo &&
          reportar.mutate({
            motivo,
            detalle,
            ...(publicacionId ? { publicacionId } : { usuarioId }),
          })
        }
      />
    </Pantalla>
  );
}
