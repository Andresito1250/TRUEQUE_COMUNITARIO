import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type AccionPropuesta,
  accionesPermitidas,
  type Bandeja,
  type CancelarPropuestaDto,
  type ContrapropuestaDto,
  type CrearPropuestaDto,
  type EncuentroDto,
  ESTADOS_CERRADOS,
  ESTADOS_EN_CURSO,
  ESTADOS_PENDIENTES,
  ESTADOS_REALIZADOS,
  LIMITES,
  type Persona,
  type PropuestaDetalle,
  type PropuestaResumen,
  type PuntoEncuentro,
  puede,
  REGLAS,
  type RolEnPropuesta,
} from '@trueque/shared';
import { AlmacenamientoService } from '../almacenamiento/almacenamiento.service.js';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import { Prisma } from '../generated/prisma/client.js';
import type { EstadoPropuesta } from '../generated/prisma/client.js';
import {
  type NuevaNotificacion,
  NotificacionesService,
} from '../notificaciones/notificaciones.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { aResumen, INCLUIR } from '../publicaciones/mapeo.js';
import { PuntosEncuentroService } from './puntos-encuentro.service.js';

const PERSONA = {
  select: { id: true, nombre: true, fotoUrl: true, correoVerificado: true, localidad: true },
} as const;

const INCLUIR_PROPUESTA = {
  proponente: PERSONA,
  receptor: PERSONA,
  articulos: { include: { publicacion: { include: INCLUIR } } },
  intercambio: {
    include: { confirmadoPor: { select: { nombre: true } }, calificaciones: true },
  },
  contrapropuesta: { select: { id: true } },
} satisfies Prisma.PropuestaTruequeInclude;

type PropuestaCompleta = Prisma.PropuestaTruequeGetPayload<{ include: typeof INCLUIR_PROPUESTA }>;
type Tx = Prisma.TransactionClient;
type Bloqueada = {
  id: string;
  estado: EstadoPropuesta;
  proponenteId: string;
  receptorId: string;
  publicacionObjetivoId: string;
};

const DIA_MS = 86_400_000;
const ruta = (id: string) => `/propuesta/${id}`;

const MENSAJE_ESTADO =
  'Esta propuesta ya cambió de estado. Actualiza la pantalla para ver lo más reciente.';

/**
 * Módulo 4: gestión del trueque (RF-14 a RF-19). Cada transición:
 * 1) bloquea la fila de la propuesta (SELECT … FOR UPDATE) para evitar dobles clics o carreras,
 * 2) valida estado y actor con las REGLAS compartidas (409/403 si no se permite),
 * 3) actualiza publicaciones, auditoría y notificaciones en la misma transacción.
 */
@Injectable()
export class TruequesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly almacenamiento: AlmacenamientoService,
    private readonly auditoria: AuditoriaService,
    private readonly notificaciones: NotificacionesService,
    private readonly puntos: PuntosEncuentroService,
  ) {}

  // ───────────── RF-14: proponer ─────────────

  async crear(usuarioId: string, dto: CrearPropuestaDto): Promise<PropuestaDetalle> {
    const objetivo = await this.prisma.publicacion.findUnique({
      where: { id: dto.publicacionId },
      include: { usuario: { select: { estado: true, nombre: true } } },
    });
    if (!objetivo || objetivo.estado === 'ELIMINADA' || objetivo.estado === 'OCULTA') {
      throw new NotFoundException('Esta publicación ya no está disponible.');
    }
    if (objetivo.usuarioId === usuarioId) {
      throw new ConflictException('No puedes proponer un trueque por tu propia publicación.');
    }
    if (objetivo.usuario.estado !== 'ACTIVO') {
      throw new ConflictException('Esta persona no puede recibir propuestas por ahora.');
    }
    if (objetivo.estado !== 'DISPONIBLE') {
      throw new ConflictException('Esta publicación ya está reservada o fue intercambiada.');
    }
    const repetida = await this.prisma.propuestaTrueque.findFirst({
      where: {
        proponenteId: usuarioId,
        publicacionObjetivoId: objetivo.id,
        estado: { in: [...ESTADOS_PENDIENTES, ...ESTADOS_EN_CURSO] },
      },
      select: { id: true },
    });
    if (repetida) {
      throw new ConflictException(
        'Ya tienes una propuesta abierta por esta publicación. Revísala en Trueques.',
      );
    }
    await this.validarPropias(usuarioId, dto.ofrecidas, 'ofrecer');

    const { propuesta, avisos } = await this.prisma.$transaction(async (tx) => {
      const propuesta = await tx.propuestaTrueque.create({
        data: {
          estado: 'PENDIENTE_RESPUESTA',
          mensaje: dto.mensaje,
          publicacionObjetivoId: objetivo.id,
          proponenteId: usuarioId,
          receptorId: objetivo.usuarioId,
          articulos: {
            create: [
              { publicacionId: objetivo.id, lado: 'SOLICITADO' },
              ...dto.ofrecidas.map((id) => ({ publicacionId: id, lado: 'OFRECIDO' as const })),
            ],
          },
        },
        include: { proponente: { select: { nombre: true } } },
      });
      await this.auditar(tx, 'PROPUESTA_CREADA', usuarioId, propuesta.id, {
        objetivo: objetivo.id,
        ofrecidas: dto.ofrecidas,
      });
      const avisos = await this.notificaciones.crear(
        [
          {
            usuarioId: objetivo.usuarioId,
            tipo: 'PROPUESTA_NUEVA',
            titulo: 'Tienes una propuesta de trueque',
            mensaje: `${propuesta.proponente.nombre} quiere cambiar algo por «${objetivo.titulo}».`,
            ruta: ruta(propuesta.id),
          },
        ],
        tx,
      );
      return { propuesta, avisos };
    });
    this.notificaciones.emitir(avisos);
    return this.detalle(propuesta.id, usuarioId);
  }

  // ───────────── RF-15: responder ─────────────

  aceptar(id: string, usuarioId: string): Promise<PropuestaDetalle> {
    return this.transicion(id, usuarioId, 'aceptar', async (tx, p) => {
      const ids = await this.articulos(tx, p.id);
      const estados = await this.bloquearPublicaciones(tx, ids);
      // D3: si otra propuesta ya reservó alguno de los artículos, esta queda bloqueada.
      if (estados.some((e) => e.estado !== 'DISPONIBLE')) {
        throw new ConflictException(
          'Uno de los artículos ya no está disponible: otra propuesta fue aceptada o el dueño lo retiró.',
        );
      }
      await tx.publicacion.updateMany({
        where: { id: { in: ids } },
        data: { estado: 'RESERVADA' },
      });
      await tx.propuestaTrueque.update({ where: { id: p.id }, data: { estado: 'ACEPTADA' } });
      return [
        {
          usuarioId: p.proponenteId,
          tipo: 'PROPUESTA_RESPONDIDA',
          titulo: '¡Aceptaron tu propuesta!',
          mensaje: `${await this.nombre(tx, usuarioId)} aceptó el trueque. Acuerden el lugar y la hora del encuentro.`,
          ruta: ruta(p.id),
        },
      ];
    });
  }

  rechazar(id: string, usuarioId: string): Promise<PropuestaDetalle> {
    return this.transicion(id, usuarioId, 'rechazar', async (tx, p) => {
      await tx.propuestaTrueque.update({ where: { id: p.id }, data: { estado: 'RECHAZADA' } });
      return [
        {
          usuarioId: p.proponenteId,
          tipo: 'PROPUESTA_RESPONDIDA',
          titulo: 'Rechazaron tu propuesta',
          mensaje: `${await this.nombre(tx, usuarioId)} no aceptó esta vez. Puedes buscar otras opciones.`,
          ruta: ruta(p.id),
        },
      ];
    });
  }

  /** La contrapropuesta cierra la original y crea una nueva con los papeles invertidos. */
  async contraproponer(
    id: string,
    usuarioId: string,
    dto: ContrapropuestaDto,
  ): Promise<PropuestaDetalle> {
    const original = await this.prisma.propuestaTrueque.findUnique({
      where: { id },
      select: { proponenteId: true },
    });
    if (original) {
      await this.validarPropias(original.proponenteId, dto.solicitadas, 'pedir');
      await this.validarPropias(usuarioId, dto.ofrecidas, 'ofrecer');
    }
    let nuevaId = '';
    await this.transicion(id, usuarioId, 'contraproponer', async (tx, p) => {
      await tx.propuestaTrueque.update({
        where: { id: p.id },
        data: { estado: 'CONTRAPROPUESTA' },
      });
      const nueva = await tx.propuestaTrueque.create({
        data: {
          estado: 'PENDIENTE_RESPUESTA',
          mensaje: dto.mensaje,
          publicacionObjetivoId: dto.solicitadas[0],
          proponenteId: usuarioId,
          receptorId: p.proponenteId,
          propuestaPadreId: p.id,
          articulos: {
            create: [
              ...dto.solicitadas.map((x) => ({ publicacionId: x, lado: 'SOLICITADO' as const })),
              ...dto.ofrecidas.map((x) => ({ publicacionId: x, lado: 'OFRECIDO' as const })),
            ],
          },
        },
      });
      nuevaId = nueva.id;
      await this.auditar(tx, 'CONTRAPROPUESTA_CREADA', usuarioId, nueva.id, { padre: p.id });
      return [
        {
          usuarioId: p.proponenteId,
          tipo: 'CONTRAPROPUESTA',
          titulo: 'Recibiste una contrapropuesta',
          mensaje: `${await this.nombre(tx, usuarioId)} te propone otro trato. Revísalo.`,
          ruta: ruta(nueva.id),
        },
      ];
    });
    return this.detalle(nuevaId, usuarioId);
  }

  // ───────────── RF-18: cancelar ─────────────

  cancelar(id: string, usuarioId: string, dto: CancelarPropuestaDto): Promise<PropuestaDetalle> {
    return this.transicion(id, usuarioId, 'cancelar', async (tx, p) => {
      if (ESTADOS_EN_CURSO.includes(p.estado)) {
        // Los artículos reservados vuelven a estar disponibles y se desbloquean las demás propuestas.
        await tx.publicacion.updateMany({
          where: { id: { in: await this.articulos(tx, p.id) }, estado: 'RESERVADA' },
          data: { estado: 'DISPONIBLE' },
        });
      }
      await tx.propuestaTrueque.update({
        where: { id: p.id },
        data: { estado: 'CANCELADA', motivoCierre: dto.motivo ?? null },
      });
      return [
        {
          usuarioId: this.otro(p, usuarioId),
          tipo: 'TRUEQUE_CANCELADO',
          titulo: 'Se canceló un trueque',
          mensaje: `${await this.nombre(tx, usuarioId)} canceló el trueque${dto.motivo ? `: «${dto.motivo}»` : '.'}`,
          ruta: ruta(p.id),
        },
      ];
    });
  }

  // ───────────── RF-16: acordar el encuentro ─────────────

  acordarEncuentro(id: string, usuarioId: string, dto: EncuentroDto): Promise<PropuestaDetalle> {
    return this.transicion(id, usuarioId, 'acordarEncuentro', async (tx, p) => {
      let lugar = dto.puntoTexto ?? '';
      if (dto.puntoEncuentroId !== undefined) {
        const punto = await tx.puntoEncuentro.findFirst({
          where: { id: dto.puntoEncuentroId, activo: true },
        });
        if (!punto) throw new NotFoundException('Ese punto de encuentro ya no está disponible.');
        lugar = punto.nombre;
      }
      const datos = {
        fechaHoraEncuentro: new Date(dto.fechaHora),
        puntoEncuentroId: dto.puntoEncuentroId ?? null,
        puntoTexto: lugar,
      };
      await tx.intercambio.upsert({
        where: { propuestaId: p.id },
        create: { propuestaId: p.id, ...datos },
        update: datos,
      });
      // ENCUENTRO_ACORDADO pasa automáticamente a ESPERANDO_CONFIRMACION (plan §3).
      await tx.propuestaTrueque.update({
        where: { id: p.id },
        data: { estado: 'ESPERANDO_CONFIRMACION' },
      });
      await this.auditar(tx, 'ENCUENTRO_ACORDADO', usuarioId, p.id, {
        lugar,
        fechaHora: dto.fechaHora,
      });
      const fecha = new Intl.DateTimeFormat('es-CO', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'America/Bogota',
      }).format(datos.fechaHoraEncuentro);
      return [
        {
          usuarioId: this.otro(p, usuarioId),
          tipo: 'ENCUENTRO_ACORDADO',
          titulo: p.estado === 'ACEPTADA' ? 'Encuentro acordado' : 'Cambió el encuentro',
          mensaje: `${lugar}, ${fecha}.`,
          ruta: ruta(p.id),
        },
      ];
    });
  }

  // ───────────── RF-17: marcar como hecho (D4) ─────────────

  confirmar(id: string, usuarioId: string): Promise<PropuestaDetalle> {
    return this.transicion(id, usuarioId, 'confirmar', async (tx, p) => {
      const ids = await this.articulos(tx, p.id);
      await this.bloquearPublicaciones(tx, ids);
      await tx.intercambio.update({
        where: { propuestaId: p.id },
        data: { confirmadoPorId: usuarioId, fechaConfirmacion: new Date() },
      });
      // INTERCAMBIO_CONFIRMADO habilita la calificación de inmediato (plan §3).
      await tx.propuestaTrueque.update({
        where: { id: p.id },
        data: { estado: 'CALIFICACION_HABILITADA' },
      });
      await tx.publicacion.updateMany({
        where: { id: { in: ids } },
        data: { estado: 'INTERCAMBIADA' },
      });
      await this.auditar(tx, 'INTERCAMBIO_CONFIRMADO', usuarioId, p.id, { publicaciones: ids });

      // Las demás propuestas abiertas sobre esos artículos se cierran solas.
      const otras = await tx.propuestaTrueque.findMany({
        where: {
          id: { not: p.id },
          estado: { in: [...ESTADOS_PENDIENTES] },
          articulos: { some: { publicacionId: { in: ids } } },
        },
        select: { id: true, proponenteId: true, receptorId: true },
      });
      const motivo = 'El artículo ya fue intercambiado.';
      await tx.propuestaTrueque.updateMany({
        where: { id: { in: otras.map((o) => o.id) } },
        data: { estado: 'RECHAZADA', motivoCierre: motivo },
      });
      const partes = new Set([p.proponenteId, p.receptorId]);
      const avisosOtras: NuevaNotificacion[] = otras.flatMap((o) =>
        [o.proponenteId, o.receptorId]
          .filter((u) => !partes.has(u))
          .map((u) => ({
            usuarioId: u,
            tipo: 'PROPUESTA_RESPONDIDA' as const,
            titulo: 'Una propuesta se cerró',
            mensaje: motivo,
            ruta: ruta(o.id),
          })),
      );
      return [
        {
          usuarioId: this.otro(p, usuarioId),
          tipo: 'TRUEQUE_REALIZADO',
          titulo: '¡Trueque hecho!',
          mensaje: `${await this.nombre(tx, usuarioId)} marcó el trueque como hecho. Ya aparece en tu historial; califica cómo te fue.`,
          ruta: ruta(p.id),
        },
        ...avisosOtras,
      ];
    });
  }

  // ───────────── Consultas (RF-19: historial) ─────────────

  async listar(usuarioId: string, bandeja: Bandeja): Promise<PropuestaResumen[]> {
    await this.finalizarVencidas();
    const mia = { OR: [{ proponenteId: usuarioId }, { receptorId: usuarioId }] };
    const where: Prisma.PropuestaTruequeWhereInput =
      bandeja === 'recibidas'
        ? { receptorId: usuarioId, estado: { in: [...ESTADOS_PENDIENTES] } }
        : bandeja === 'enviadas'
          ? { proponenteId: usuarioId, estado: { in: [...ESTADOS_PENDIENTES] } }
          : bandeja === 'activas'
            ? { ...mia, estado: { in: [...ESTADOS_EN_CURSO] } }
            : { ...mia, estado: { in: [...ESTADOS_REALIZADOS, ...ESTADOS_CERRADOS] } };
    const lista = await this.prisma.propuestaTrueque.findMany({
      where,
      include: INCLUIR_PROPUESTA,
      orderBy: { actualizadoEn: 'desc' },
      take: 100,
    });
    return lista.map((p) => this.resumen(p, usuarioId));
  }

  async detalle(id: string, usuarioId: string): Promise<PropuestaDetalle> {
    await this.finalizarVencidas();
    const p = await this.prisma.propuestaTrueque.findUnique({
      where: { id },
      include: INCLUIR_PROPUESTA,
    });
    if (!p || (p.proponenteId !== usuarioId && p.receptorId !== usuarioId)) {
      throw new NotFoundException('No encontramos esta propuesta.');
    }
    const rol: RolEnPropuesta = p.proponenteId === usuarioId ? 'proponente' : 'receptor';
    const resumen = this.resumen(p, usuarioId);
    const i = p.intercambio;
    let punto: PuntoEncuentro | null = null;
    if (i?.puntoEncuentroId) punto = await this.puntos.obtener(i.puntoEncuentroId);

    const acciones = accionesPermitidas(p.estado, rol).filter(
      // D3: una propuesta bloqueada no se puede aceptar mientras la otra siga en curso.
      (a) => !(a === 'aceptar' && resumen.bloqueada),
    );
    const mia = i?.calificaciones.find((c) => c.calificadorId === usuarioId) ?? null;
    return {
      ...resumen,
      mensaje: p.mensaje,
      creadoEn: p.creadoEn.toISOString(),
      proponente: this.persona(p.proponente),
      receptor: this.persona(p.receptor),
      propuestaPadreId: p.propuestaPadreId,
      contrapropuestaId: p.contrapropuesta?.id ?? null,
      encuentro: i
        ? { fechaHora: i.fechaHoraEncuentro.toISOString(), lugar: i.puntoTexto, punto }
        : null,
      confirmacion:
        i?.fechaConfirmacion && i.confirmadoPor
          ? {
              porMi: i.confirmadoPorId === usuarioId,
              porNombre: i.confirmadoPor.nombre,
              fecha: i.fechaConfirmacion.toISOString(),
            }
          : null,
      acciones: mia ? acciones.filter((a) => a !== 'calificar') : acciones,
      calificacion: i?.fechaConfirmacion
        ? {
            limite: new Date(
              i.fechaConfirmacion.getTime() + LIMITES.DIAS_PARA_CALIFICAR * DIA_MS,
            ).toISOString(),
            mia: mia ? { puntuacion: mia.puntuacion, comentario: mia.comentario } : null,
            recibida: i.calificaciones.some((c) => c.calificadoId === usuarioId),
          }
        : null,
    };
  }

  /** Cierra las propuestas abiertas de una publicación que su dueño eliminó. */
  async cerrarPorPublicacionEliminada(tx: Tx, publicacionId: string, duenoId: string) {
    const abiertas = await tx.propuestaTrueque.findMany({
      where: {
        estado: { in: [...ESTADOS_PENDIENTES] },
        articulos: { some: { publicacionId } },
      },
      select: { id: true, proponenteId: true, receptorId: true },
    });
    const motivo = 'Una de las publicaciones fue eliminada.';
    await tx.propuestaTrueque.updateMany({
      where: { id: { in: abiertas.map((a) => a.id) } },
      data: { estado: 'CANCELADA', motivoCierre: motivo },
    });
    return this.notificaciones.crear(
      abiertas.map((a) => ({
        usuarioId: a.proponenteId === duenoId ? a.receptorId : a.proponenteId,
        tipo: 'TRUEQUE_CANCELADO' as const,
        titulo: 'Una propuesta se cerró',
        mensaje: motivo,
        ruta: ruta(a.id),
      })),
      tx,
    );
  }

  // ───────────── Núcleo de la máquina de estados ─────────────

  private async transicion(
    id: string,
    usuarioId: string,
    accion: AccionPropuesta,
    aplicar: (tx: Tx, p: Bloqueada) => Promise<NuevaNotificacion[]>,
  ): Promise<PropuestaDetalle> {
    const avisos = await this.prisma.$transaction(async (tx) => {
      const [p] = await tx.$queryRaw<Bloqueada[]>`
        SELECT id, estado, "proponenteId", "receptorId", "publicacionObjetivoId"
        FROM "PropuestaTrueque" WHERE id = ${id}::uuid FOR UPDATE`;
      if (!p || (p.proponenteId !== usuarioId && p.receptorId !== usuarioId)) {
        throw new NotFoundException('No encontramos esta propuesta.');
      }
      const rol: RolEnPropuesta = p.proponenteId === usuarioId ? 'proponente' : 'receptor';
      if (!puede(accion, p.estado, rol)) {
        const otroRolPuede = REGLAS.some((r) => r.accion === accion && r.desde.includes(p.estado));
        if (otroRolPuede) {
          throw new ForbiddenException(
            rol === 'proponente'
              ? 'Solo la persona que recibió la propuesta puede responderla.'
              : 'Solo quien envió la propuesta puede cancelarla mientras espera respuesta.',
          );
        }
        throw new ConflictException(MENSAJE_ESTADO);
      }
      const lista = await aplicar(tx, p);
      await this.auditar(tx, `PROPUESTA_${accion.toUpperCase()}`, usuarioId, p.id, {
        de: p.estado,
      });
      return this.notificaciones.crear(lista, tx);
    });
    this.notificaciones.emitir(avisos);
    return this.detalle(id, usuarioId);
  }

  /** Comprueba que las publicaciones sean del usuario, estén disponibles y no estén repetidas. */
  private async validarPropias(usuarioId: string, ids: string[], para: 'ofrecer' | 'pedir') {
    const encontradas = await this.prisma.publicacion.findMany({
      where: { id: { in: ids }, usuarioId },
      select: { id: true, estado: true, titulo: true },
    });
    if (encontradas.length !== ids.length) {
      throw new ConflictException(
        para === 'ofrecer'
          ? 'Solo puedes ofrecer tus propias publicaciones.'
          : 'Solo puedes pedir publicaciones de la otra persona.',
      );
    }
    const ocupada = encontradas.find((p) => p.estado !== 'DISPONIBLE');
    if (ocupada) {
      throw new ConflictException(`«${ocupada.titulo}» ya no está disponible para un trueque.`);
    }
  }

  private async articulos(tx: Tx, propuestaId: string): Promise<string[]> {
    const a = await tx.propuestaArticulo.findMany({
      where: { propuestaId },
      select: { publicacionId: true },
    });
    return a.map((x) => x.publicacionId);
  }

  private bloquearPublicaciones(tx: Tx, ids: string[]) {
    if (!ids.length) return Promise.resolve([]);
    return tx.$queryRaw<{ id: string; estado: string }[]>`
      SELECT id, estado::text AS estado FROM "Publicacion"
      WHERE id IN (${Prisma.join(ids.map((i) => Prisma.sql`${i}::uuid`))})
      ORDER BY id FOR UPDATE`;
  }

  /** Pasado el plazo para calificar, el trueque se da por finalizado (plan §3). */
  private async finalizarVencidas() {
    await this.prisma.$executeRaw`
      UPDATE "PropuestaTrueque" p SET estado = 'FINALIZADO', "actualizadoEn" = now()
      FROM "Intercambio" i
      WHERE i."propuestaId" = p.id AND p.estado = 'CALIFICACION_HABILITADA'
        AND i."fechaConfirmacion" < now() - make_interval(days => ${LIMITES.DIAS_PARA_CALIFICAR})`;
  }

  private async nombre(tx: Tx, usuarioId: string) {
    const u = await tx.usuario.findUniqueOrThrow({
      where: { id: usuarioId },
      select: { nombre: true },
    });
    return u.nombre.split(' ')[0];
  }

  private otro(p: { proponenteId: string; receptorId: string }, usuarioId: string) {
    return p.proponenteId === usuarioId ? p.receptorId : p.proponenteId;
  }

  private auditar(tx: Tx, accion: string, actorId: string, id: string, detalle: object) {
    return this.auditoria.registrar(
      {
        accion,
        actorId,
        entidad: 'PropuestaTrueque',
        entidadId: id,
        detalle: detalle as Prisma.InputJsonValue,
      },
      tx,
    );
  }

  private persona(u: PropuestaCompleta['proponente']): Persona {
    return {
      id: u.id,
      nombre: u.nombre,
      fotoUrl: this.almacenamiento.url(u.fotoUrl),
      verificado: u.correoVerificado,
      localidad: u.localidad,
    };
  }

  private resumen(p: PropuestaCompleta, usuarioId: string): PropuestaResumen {
    const soyProponente = p.proponenteId === usuarioId;
    const lado = (l: 'OFRECIDO' | 'SOLICITADO') =>
      p.articulos
        .filter((a) => a.lado === l)
        // La publicación por la que se propuso va primero.
        .sort((a) => (a.publicacionId === p.publicacionObjetivoId ? -1 : 1))
        .map((a) => aResumen(a.publicacion, this.almacenamiento));
    const solicitadas = lado('SOLICITADO');
    const ofrecidas = lado('OFRECIDO');
    return {
      id: p.id,
      estado: p.estado,
      soyProponente,
      contraparte: this.persona(soyProponente ? p.receptor : p.proponente),
      solicitadas,
      ofrecidas,
      bloqueada:
        ESTADOS_PENDIENTES.includes(p.estado) &&
        [...solicitadas, ...ofrecidas].some((x) => x.estado !== 'DISPONIBLE'),
      motivoCierre: p.motivoCierre,
      actualizadoEn: p.actualizadoEn.toISOString(),
    };
  }
}
