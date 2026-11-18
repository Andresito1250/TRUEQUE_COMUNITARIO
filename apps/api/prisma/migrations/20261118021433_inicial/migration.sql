-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- CreateEnum
CREATE TYPE "Localidad" AS ENUM ('SUBA', 'KENNEDY', 'TEUSAQUILLO');

-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('CIUDADANO', 'ADMIN');

-- CreateEnum
CREATE TYPE "EstadoUsuario" AS ENUM ('ACTIVO', 'SUSPENDIDO', 'ELIMINADO');

-- CreateEnum
CREATE TYPE "TipoCodigo" AS ENUM ('VERIFICAR_CORREO', 'RECUPERAR_CONTRASENA');

-- CreateEnum
CREATE TYPE "TipoPublicacion" AS ENUM ('BIEN', 'SERVICIO');

-- CreateEnum
CREATE TYPE "EstadoConservacion" AS ENUM ('NUEVO', 'COMO_NUEVO', 'BUENO', 'ACEPTABLE', 'NO_APLICA');

-- CreateEnum
CREATE TYPE "EstadoPublicacion" AS ENUM ('DISPONIBLE', 'RESERVADA', 'INTERCAMBIADA', 'OCULTA', 'ELIMINADA');

-- CreateEnum
CREATE TYPE "EstadoPropuesta" AS ENUM ('PROPUESTA_CREADA', 'PENDIENTE_RESPUESTA', 'CONTRAPROPUESTA', 'RECHAZADA', 'CANCELADA', 'ACEPTADA', 'ENCUENTRO_ACORDADO', 'ESPERANDO_CONFIRMACION', 'INTERCAMBIO_CONFIRMADO', 'CALIFICACION_HABILITADA', 'FINALIZADO');

-- CreateEnum
CREATE TYPE "LadoArticulo" AS ENUM ('OFRECIDO', 'SOLICITADO');

-- CreateEnum
CREATE TYPE "TipoPuntoEncuentro" AS ENUM ('CENTRO_COMERCIAL', 'BIBLIOTECA', 'ESTACION', 'PARQUE', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoMensaje" AS ENUM ('ENVIADO', 'LEIDO');

-- CreateEnum
CREATE TYPE "TipoNotificacion" AS ENUM ('PROPUESTA_NUEVA', 'PROPUESTA_RESPONDIDA', 'CONTRAPROPUESTA', 'ENCUENTRO_ACORDADO', 'TRUEQUE_CANCELADO', 'TRUEQUE_REALIZADO', 'MENSAJE_NUEVO', 'CALIFICACION_RECIBIDA', 'MODERACION');

-- CreateEnum
CREATE TYPE "Plataforma" AS ENUM ('ANDROID', 'IOS');

-- CreateEnum
CREATE TYPE "MotivoReporte" AS ENUM ('PROHIBIDO', 'FRAUDE', 'OFENSIVO', 'SPAM', 'ACOSO', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoReporte" AS ENUM ('PENDIENTE', 'REVISADO', 'RESUELTO');

-- CreateEnum
CREATE TYPE "DecisionReporte" AS ENUM ('APROBAR', 'OCULTAR', 'ELIMINAR', 'SUSPENDER_USUARIO');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "correo" VARCHAR(254) NOT NULL,
    "contrasenaHash" TEXT NOT NULL,
    "localidad" "Localidad" NOT NULL,
    "fotoUrl" TEXT,
    "descripcion" VARCHAR(500),
    "telefonoContacto" VARCHAR(20),
    "rol" "Rol" NOT NULL DEFAULT 'CIUDADANO',
    "estado" "EstadoUsuario" NOT NULL DEFAULT 'ACTIVO',
    "correoVerificado" BOOLEAN NOT NULL DEFAULT false,
    "totpSecret" TEXT,
    "totpActivo" BOOLEAN NOT NULL DEFAULT false,
    "politicaDatosVersion" TEXT NOT NULL,
    "politicaDatosFecha" TIMESTAMP(3) NOT NULL,
    "terminosVersion" TEXT NOT NULL,
    "terminosFecha" TIMESTAMP(3) NOT NULL,
    "ubicacion" geography(Point,4326),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "eliminadoEn" TIMESTAMP(3),

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsuarioCategoriaInteres" (
    "usuarioId" UUID NOT NULL,
    "categoriaId" INTEGER NOT NULL,

    CONSTRAINT "UsuarioCategoriaInteres_pkey" PRIMARY KEY ("usuarioId","categoriaId")
);

-- CreateTable
CREATE TABLE "CodigoVerificacion" (
    "id" UUID NOT NULL,
    "usuarioId" UUID NOT NULL,
    "tipo" "TipoCodigo" NOT NULL,
    "codigoHash" TEXT NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "usadoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodigoVerificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" UUID NOT NULL,
    "usuarioId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "revocadoEn" TIMESTAMP(3),
    "dispositivo" VARCHAR(120),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Categoria" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(60) NOT NULL,
    "icono" VARCHAR(40),
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Publicacion" (
    "id" UUID NOT NULL,
    "titulo" VARCHAR(80) NOT NULL,
    "descripcion" VARCHAR(1000) NOT NULL,
    "tipo" "TipoPublicacion" NOT NULL,
    "estadoConservacion" "EstadoConservacion" NOT NULL,
    "estado" "EstadoPublicacion" NOT NULL DEFAULT 'DISPONIBLE',
    "localidad" "Localidad" NOT NULL,
    "ubicacion" geography(Point,4326),
    "usuarioId" UUID NOT NULL,
    "categoriaId" INTEGER NOT NULL,
    "fechaPublicacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Publicacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImagenPublicacion" (
    "id" UUID NOT NULL,
    "publicacionId" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "miniaturaUrl" TEXT NOT NULL,
    "orden" SMALLINT NOT NULL,

    CONSTRAINT "ImagenPublicacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropuestaTrueque" (
    "id" UUID NOT NULL,
    "estado" "EstadoPropuesta" NOT NULL DEFAULT 'PENDIENTE_RESPUESTA',
    "mensaje" VARCHAR(500),
    "publicacionObjetivoId" UUID NOT NULL,
    "proponenteId" UUID NOT NULL,
    "receptorId" UUID NOT NULL,
    "propuestaPadreId" UUID,
    "motivoCierre" VARCHAR(200),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropuestaTrueque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropuestaArticulo" (
    "propuestaId" UUID NOT NULL,
    "publicacionId" UUID NOT NULL,
    "lado" "LadoArticulo" NOT NULL,

    CONSTRAINT "PropuestaArticulo_pkey" PRIMARY KEY ("propuestaId","publicacionId")
);

-- CreateTable
CREATE TABLE "PuntoEncuentro" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "tipo" "TipoPuntoEncuentro" NOT NULL,
    "localidad" "Localidad" NOT NULL,
    "direccion" VARCHAR(160),
    "ubicacion" geography(Point,4326) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PuntoEncuentro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Intercambio" (
    "id" UUID NOT NULL,
    "propuestaId" UUID NOT NULL,
    "fechaHoraEncuentro" TIMESTAMP(3) NOT NULL,
    "puntoEncuentroId" INTEGER,
    "puntoTexto" VARCHAR(160) NOT NULL,
    "confirmadoPorId" UUID,
    "fechaConfirmacion" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Intercambio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mensaje" (
    "id" UUID NOT NULL,
    "propuestaId" UUID NOT NULL,
    "emisorId" UUID NOT NULL,
    "contenido" VARCHAR(1000) NOT NULL,
    "estado" "EstadoMensaje" NOT NULL DEFAULT 'ENVIADO',
    "fechaHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mensaje_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notificacion" (
    "id" UUID NOT NULL,
    "usuarioId" UUID NOT NULL,
    "tipo" "TipoNotificacion" NOT NULL,
    "titulo" VARCHAR(120) NOT NULL,
    "mensaje" VARCHAR(300) NOT NULL,
    "datos" JSONB,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "fechaHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispositivoPush" (
    "id" UUID NOT NULL,
    "usuarioId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "plataforma" "Plataforma" NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DispositivoPush_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Calificacion" (
    "id" UUID NOT NULL,
    "intercambioId" UUID NOT NULL,
    "calificadorId" UUID NOT NULL,
    "calificadoId" UUID NOT NULL,
    "puntuacion" SMALLINT NOT NULL,
    "comentario" VARCHAR(300),
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Calificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reporte" (
    "id" UUID NOT NULL,
    "reportanteId" UUID NOT NULL,
    "publicacionId" UUID,
    "usuarioReportadoId" UUID,
    "motivo" "MotivoReporte" NOT NULL,
    "detalle" VARCHAR(500),
    "estado" "EstadoReporte" NOT NULL DEFAULT 'PENDIENTE',
    "decision" "DecisionReporte",
    "adminId" UUID,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resueltoEn" TIMESTAMP(3),

    CONSTRAINT "Reporte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroAuditoria" (
    "id" UUID NOT NULL,
    "accion" VARCHAR(60) NOT NULL,
    "actorId" UUID,
    "entidad" VARCHAR(40) NOT NULL,
    "entidadId" VARCHAR(64) NOT NULL,
    "detalle" JSONB,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroAuditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_correo_key" ON "Usuario"("correo");

-- CreateIndex
CREATE INDEX "Usuario_localidad_idx" ON "Usuario"("localidad");

-- CreateIndex
CREATE INDEX "Usuario_estado_idx" ON "Usuario"("estado");

-- CreateIndex
CREATE INDEX "Usuario_ubicacion_idx" ON "Usuario" USING GIST ("ubicacion");

-- CreateIndex
CREATE INDEX "CodigoVerificacion_usuarioId_tipo_idx" ON "CodigoVerificacion"("usuarioId", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_usuarioId_idx" ON "RefreshToken"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_nombre_key" ON "Categoria"("nombre");

-- CreateIndex
CREATE INDEX "Publicacion_estado_fechaPublicacion_idx" ON "Publicacion"("estado", "fechaPublicacion");

-- CreateIndex
CREATE INDEX "Publicacion_usuarioId_idx" ON "Publicacion"("usuarioId");

-- CreateIndex
CREATE INDEX "Publicacion_categoriaId_idx" ON "Publicacion"("categoriaId");

-- CreateIndex
CREATE INDEX "Publicacion_localidad_idx" ON "Publicacion"("localidad");

-- CreateIndex
CREATE INDEX "Publicacion_ubicacion_idx" ON "Publicacion" USING GIST ("ubicacion");

-- CreateIndex
CREATE UNIQUE INDEX "ImagenPublicacion_publicacionId_orden_key" ON "ImagenPublicacion"("publicacionId", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "PropuestaTrueque_propuestaPadreId_key" ON "PropuestaTrueque"("propuestaPadreId");

-- CreateIndex
CREATE INDEX "PropuestaTrueque_proponenteId_estado_idx" ON "PropuestaTrueque"("proponenteId", "estado");

-- CreateIndex
CREATE INDEX "PropuestaTrueque_receptorId_estado_idx" ON "PropuestaTrueque"("receptorId", "estado");

-- CreateIndex
CREATE INDEX "PropuestaTrueque_publicacionObjetivoId_estado_idx" ON "PropuestaTrueque"("publicacionObjetivoId", "estado");

-- CreateIndex
CREATE INDEX "PropuestaArticulo_publicacionId_idx" ON "PropuestaArticulo"("publicacionId");

-- CreateIndex
CREATE INDEX "PuntoEncuentro_localidad_idx" ON "PuntoEncuentro"("localidad");

-- CreateIndex
CREATE INDEX "PuntoEncuentro_ubicacion_idx" ON "PuntoEncuentro" USING GIST ("ubicacion");

-- CreateIndex
CREATE UNIQUE INDEX "Intercambio_propuestaId_key" ON "Intercambio"("propuestaId");

-- CreateIndex
CREATE INDEX "Mensaje_propuestaId_fechaHora_idx" ON "Mensaje"("propuestaId", "fechaHora");

-- CreateIndex
CREATE INDEX "Notificacion_usuarioId_leida_fechaHora_idx" ON "Notificacion"("usuarioId", "leida", "fechaHora");

-- CreateIndex
CREATE UNIQUE INDEX "DispositivoPush_token_key" ON "DispositivoPush"("token");

-- CreateIndex
CREATE INDEX "Calificacion_calificadoId_idx" ON "Calificacion"("calificadoId");

-- CreateIndex
CREATE UNIQUE INDEX "Calificacion_intercambioId_calificadorId_key" ON "Calificacion"("intercambioId", "calificadorId");

-- CreateIndex
CREATE INDEX "Reporte_estado_creadoEn_idx" ON "Reporte"("estado", "creadoEn");

-- CreateIndex
CREATE INDEX "RegistroAuditoria_entidad_entidadId_idx" ON "RegistroAuditoria"("entidad", "entidadId");

-- CreateIndex
CREATE INDEX "RegistroAuditoria_fecha_idx" ON "RegistroAuditoria"("fecha");

-- AddForeignKey
ALTER TABLE "UsuarioCategoriaInteres" ADD CONSTRAINT "UsuarioCategoriaInteres_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioCategoriaInteres" ADD CONSTRAINT "UsuarioCategoriaInteres_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodigoVerificacion" ADD CONSTRAINT "CodigoVerificacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Publicacion" ADD CONSTRAINT "Publicacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Publicacion" ADD CONSTRAINT "Publicacion_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImagenPublicacion" ADD CONSTRAINT "ImagenPublicacion_publicacionId_fkey" FOREIGN KEY ("publicacionId") REFERENCES "Publicacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropuestaTrueque" ADD CONSTRAINT "PropuestaTrueque_publicacionObjetivoId_fkey" FOREIGN KEY ("publicacionObjetivoId") REFERENCES "Publicacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropuestaTrueque" ADD CONSTRAINT "PropuestaTrueque_proponenteId_fkey" FOREIGN KEY ("proponenteId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropuestaTrueque" ADD CONSTRAINT "PropuestaTrueque_receptorId_fkey" FOREIGN KEY ("receptorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropuestaTrueque" ADD CONSTRAINT "PropuestaTrueque_propuestaPadreId_fkey" FOREIGN KEY ("propuestaPadreId") REFERENCES "PropuestaTrueque"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropuestaArticulo" ADD CONSTRAINT "PropuestaArticulo_propuestaId_fkey" FOREIGN KEY ("propuestaId") REFERENCES "PropuestaTrueque"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropuestaArticulo" ADD CONSTRAINT "PropuestaArticulo_publicacionId_fkey" FOREIGN KEY ("publicacionId") REFERENCES "Publicacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intercambio" ADD CONSTRAINT "Intercambio_propuestaId_fkey" FOREIGN KEY ("propuestaId") REFERENCES "PropuestaTrueque"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intercambio" ADD CONSTRAINT "Intercambio_puntoEncuentroId_fkey" FOREIGN KEY ("puntoEncuentroId") REFERENCES "PuntoEncuentro"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intercambio" ADD CONSTRAINT "Intercambio_confirmadoPorId_fkey" FOREIGN KEY ("confirmadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mensaje" ADD CONSTRAINT "Mensaje_propuestaId_fkey" FOREIGN KEY ("propuestaId") REFERENCES "PropuestaTrueque"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mensaje" ADD CONSTRAINT "Mensaje_emisorId_fkey" FOREIGN KEY ("emisorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispositivoPush" ADD CONSTRAINT "DispositivoPush_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Calificacion" ADD CONSTRAINT "Calificacion_intercambioId_fkey" FOREIGN KEY ("intercambioId") REFERENCES "Intercambio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Calificacion" ADD CONSTRAINT "Calificacion_calificadorId_fkey" FOREIGN KEY ("calificadorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Calificacion" ADD CONSTRAINT "Calificacion_calificadoId_fkey" FOREIGN KEY ("calificadoId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reporte" ADD CONSTRAINT "Reporte_reportanteId_fkey" FOREIGN KEY ("reportanteId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reporte" ADD CONSTRAINT "Reporte_publicacionId_fkey" FOREIGN KEY ("publicacionId") REFERENCES "Publicacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reporte" ADD CONSTRAINT "Reporte_usuarioReportadoId_fkey" FOREIGN KEY ("usuarioReportadoId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reporte" ADD CONSTRAINT "Reporte_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroAuditoria" ADD CONSTRAINT "RegistroAuditoria_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Búsqueda de texto en español sin tildes (RF-10).
-- unaccent() no es IMMUTABLE, así que se envuelve para poder usarla en índices de expresión.
CREATE OR REPLACE FUNCTION f_unaccent(text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;
