-- RF-10: búsqueda por palabra clave en español, sin importar tildes.
-- El título pesa más que la descripción (A > B) al ordenar por relevancia.
CREATE OR REPLACE FUNCTION publicacion_documento(titulo text, descripcion text) RETURNS tsvector
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  AS $$
    SELECT setweight(to_tsvector('spanish'::regconfig, public.f_unaccent(coalesce($1, ''))), 'A')
        || setweight(to_tsvector('spanish'::regconfig, public.f_unaccent(coalesce($2, ''))), 'B')
  $$;

-- Índice GIN sobre la misma expresión que usa la consulta (RNF04).
CREATE INDEX "Publicacion_busqueda_idx"
  ON "Publicacion" USING GIN (public.publicacion_documento(titulo, descripcion));
