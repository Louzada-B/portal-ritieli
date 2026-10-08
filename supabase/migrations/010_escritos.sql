-- 010 · Escritos (textos do site)
-- publicar_em vazio = rascunho; no futuro = agendado; no passado = publicado.
CREATE TABLE public.escritos (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT        UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  titulo        TEXT        NOT NULL DEFAULT '' CHECK (char_length(titulo) <= 160),
  tema          TEXT        NOT NULL DEFAULT 'Ansiedade' CHECK (tema IN ('Ansiedade', 'Depressão', 'Autocuidado', 'TCC na prática')),
  palavra       TEXT        NOT NULL DEFAULT '' CHECK (char_length(palavra) <= 30),
  resumo        TEXT        NOT NULL DEFAULT '' CHECK (char_length(resumo) <= 200),
  capa_url      TEXT        CHECK (char_length(capa_url) <= 500),
  corpo         TEXT        NOT NULL DEFAULT '' CHECK (char_length(corpo) <= 60000),
  publicar_em   TIMESTAMPTZ,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX escritos_publicar ON public.escritos (publicar_em DESC);

ALTER TABLE public.escritos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.escritos FROM anon;
CREATE POLICY admin_escritos ON public.escritos FOR ALL TO authenticated USING (privado.eh_admin()) WITH CHECK (privado.eh_admin());

-- Fotos de capa: leitura pública (aparecem no site), envio só pelo painel.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('escritos', 'escritos', true, 5000000, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;
CREATE POLICY escritos_admin_grava ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'escritos' AND privado.eh_admin());
CREATE POLICY escritos_admin_apaga ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'escritos' AND privado.eh_admin());
