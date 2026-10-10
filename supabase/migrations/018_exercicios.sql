-- Exercícios entre as sessões: a Ritieli envia, a paciente vê na área e marca como feito (com recado opcional).
-- O texto, o link e o recado ficam cifrados no servidor. Anexos: pasta privada, entregues à paciente por link temporário.
CREATE TABLE public.exercicios (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id       UUID        NOT NULL REFERENCES public.pacientes (id) ON DELETE CASCADE,
  titulo            TEXT        NOT NULL CHECK (char_length(titulo) BETWEEN 2 AND 120),
  instrucoes_cripto TEXT        NOT NULL,
  link_cripto       TEXT,
  prazo             DATE,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT now(),
  concluido_em      TIMESTAMPTZ,
  recado_cripto     TEXT
);
CREATE INDEX exercicios_paciente ON public.exercicios (paciente_id, criado_em DESC);

CREATE TABLE public.exercicio_anexos (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  exercicio_id UUID        NOT NULL REFERENCES public.exercicios (id) ON DELETE CASCADE,
  caminho      TEXT        NOT NULL UNIQUE,
  nome         TEXT        NOT NULL CHECK (char_length(nome) BETWEEN 1 AND 120),
  tipo         TEXT        NOT NULL CHECK (char_length(tipo) <= 100),
  tamanho      INTEGER     NOT NULL CHECK (tamanho BETWEEN 1 AND 10000000),
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX exercicio_anexos_ex ON public.exercicio_anexos (exercicio_id);

ALTER TABLE public.exercicios       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercicio_anexos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.exercicios, public.exercicio_anexos FROM anon;
CREATE POLICY admin_exercicios ON public.exercicios FOR ALL TO authenticated USING (privado.eh_admin()) WITH CHECK (privado.eh_admin());
CREATE POLICY admin_exercicio_anexos ON public.exercicio_anexos FOR ALL TO authenticated USING (privado.eh_admin()) WITH CHECK (privado.eh_admin());

INSERT INTO storage.buckets (id, name, public, file_size_limit) VALUES ('exercicios', 'exercicios', false, 10000000)
ON CONFLICT (id) DO NOTHING;
CREATE POLICY exercicios_admin_le ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'exercicios' AND privado.eh_admin());
CREATE POLICY exercicios_admin_grava ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'exercicios' AND privado.eh_admin());
CREATE POLICY exercicios_admin_apaga ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'exercicios' AND privado.eh_admin());
