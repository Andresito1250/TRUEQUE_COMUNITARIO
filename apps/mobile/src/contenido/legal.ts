import { VERSION_POLITICA_DATOS, VERSION_TERMINOS } from '@trueque/shared';

/**
 * Textos legales del prototipo académico. Versión enlazada a VERSION_POLITICA_DATOS / VERSION_TERMINOS:
 * si cambian, sube la versión en packages/shared para que el registro guarde la nueva aceptación.
 * TODO(equipo): completar el correo de contacto oficial del proyecto antes de las pruebas con usuarios.
 */

export type DocumentoLegal = {
  titulo: string;
  version: string;
  secciones: { titulo: string; parrafos: string[] }[];
};

const CONTACTO = 'el correo de contacto del equipo del proyecto (Universidad Manuela Beltrán)';

export const POLITICA_DATOS: DocumentoLegal = {
  titulo: 'Política de tratamiento de datos personales',
  version: VERSION_POLITICA_DATOS,
  secciones: [
    {
      titulo: '1. Quién trata tus datos',
      parrafos: [
        'Trueque Comunitario es un prototipo académico desarrollado por estudiantes de Ingeniería de Software de la Universidad Manuela Beltrán (Bogotá) como trabajo de grado. El equipo del proyecto es responsable del tratamiento de tus datos conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013.',
      ],
    },
    {
      titulo: '2. Qué datos recogemos',
      parrafos: [
        'Nombre, correo electrónico, contraseña (guardada cifrada, nunca en texto plano), localidad, y de forma opcional foto, descripción, teléfono y categorías de interés.',
        'Tu ubicación aproximada, solo cuando la autorizas, para mostrarte publicaciones cercanas. Guardamos la ubicación desplazada hasta 300 metros y nunca mostramos tu ubicación exacta a otras personas.',
        'Las publicaciones, propuestas, mensajes y calificaciones que hagas dentro de la app.',
      ],
    },
    {
      titulo: '3. Para qué los usamos',
      parrafos: [
        'Permitir el intercambio de bienes y servicios entre ciudadanos, proteger la seguridad de la comunidad (verificación de cuentas, reputación y moderación) y enviarte avisos sobre tus trueques.',
        'Analizar de forma agregada y anónima el uso de la plataforma como parte de la investigación académica. Nunca vendemos ni compartimos tus datos con fines comerciales.',
      ],
    },
    {
      titulo: '4. Quién ve tu información',
      parrafos: [
        'Otras personas ven tu nombre, localidad, foto, descripción, reputación y tus publicaciones. Tu correo y tu teléfono no se muestran: la comunicación se hace por el chat interno.',
      ],
    },
    {
      titulo: '5. Tus derechos',
      parrafos: [
        'Puedes conocer, actualizar y rectificar tus datos desde tu perfil; revocar esta autorización y pedir la supresión de tus datos eliminando tu cuenta desde Perfil → Privacidad y datos; y presentar quejas ante la Superintendencia de Industria y Comercio.',
        `Para consultas o reclamos escribe a ${CONTACTO}. Responderemos en los plazos de la Ley 1581 de 2012.`,
      ],
    },
    {
      titulo: '6. Eliminación de la cuenta',
      parrafos: [
        'Al eliminar tu cuenta borramos tu nombre, correo, teléfono, foto, descripción y ubicación, cerramos tus sesiones y retiramos tus publicaciones. Los intercambios y calificaciones ya realizados se conservan sin datos que te identifiquen, solo con fines estadísticos.',
      ],
    },
    {
      titulo: '7. Seguridad',
      parrafos: [
        'Usamos conexiones cifradas, contraseñas protegidas con algoritmos de hash y verificación en dos pasos opcional. Aun así, ningún sistema es 100 % seguro: cuida tu contraseña y no la compartas.',
      ],
    },
  ],
};

export const TERMINOS: DocumentoLegal = {
  titulo: 'Términos de uso',
  version: VERSION_TERMINOS,
  secciones: [
    {
      titulo: '1. Qué es Trueque Comunitario',
      parrafos: [
        'Una plataforma para intercambiar bienes y servicios sin dinero entre vecinos de Bogotá. Es un prototipo académico en etapa de pruebas.',
      ],
    },
    {
      titulo: '2. Requisitos',
      parrafos: [
        'Ser mayor de 18 años, dar información verdadera y usar una sola cuenta personal.',
      ],
    },
    {
      titulo: '3. Qué no se puede intercambiar',
      parrafos: [
        'Está prohibido publicar o intercambiar: armas, municiones o explosivos; drogas o sustancias controladas; medicamentos; bebidas alcohólicas y tabaco; animales; bienes robados, falsificados o de contrabando; documentos de identidad; contenido sexual; servicios ilegales; dinero, criptomonedas o tarjetas de regalo.',
        'Tampoco se permite pedir o dar dinero como parte de un trueque.',
      ],
    },
    {
      titulo: '4. Convivencia',
      parrafos: [
        'Trata a las demás personas con respeto. No se permite el acoso, la discriminación, el spam ni el engaño. Puedes reportar publicaciones o usuarios que incumplan estas reglas.',
      ],
    },
    {
      titulo: '5. Moderación',
      parrafos: [
        'El equipo puede ocultar o eliminar publicaciones y suspender cuentas que incumplan estos términos. Las decisiones quedan registradas.',
      ],
    },
    {
      titulo: '6. Encuentros seguros',
      parrafos: [
        'Acuerda los encuentros en lugares públicos y concurridos, de día, y avísale a alguien de confianza. Revisa el objeto antes de cambiarlo. La plataforma conecta a las personas, pero cada usuario es responsable de los intercambios que acuerda.',
      ],
    },
  ],
};
