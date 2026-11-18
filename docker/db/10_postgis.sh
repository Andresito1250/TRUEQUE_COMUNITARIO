#!/bin/sh
# Sustituye el script de la imagen postgis/postgis que instala postgis, topology y tiger en la BD.
# Las extensiones las crea la migración de Prisma (schema.prisma: extensions = [postgis, unaccent]).
echo "Base de datos sin extensiones preinstaladas: las gestiona Prisma."
