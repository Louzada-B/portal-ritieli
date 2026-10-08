-- 009 · Prontuário com criptografia de ponta a ponta
-- Tudo é cifrado no navegador da Ritieli com uma chave que só existe lá (aberta pela
-- senha do prontuário ou pela chave de recuperação). O banco guarda só texto ilegível.

-- A chave mestra, embrulhada duas vezes: pela senha e pela chave de recuperação.
CREATE TABLE public.prontuario_chave (
  id            SMALLINT    PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  salt_senha    TEXT        NOT NULL,
  iteracoes     INTEGER     NOT NULL,
  chave_senha   TEXT        NOT NULL,
  salt_rec      TEXT        NOT NULL,
  chave_rec     TEXT        NOT NULL,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Evoluções: depois de salvas não mudam; correções entram como notas.
CREATE TABLE public.prontuario_evolucoes (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id     UUID        NOT NULL REFERENCES public.pacientes (id) ON DELETE CASCADE,
  sessao_id       UUID        REFERENCES public.sessoes (id) ON DELETE SET NULL,
  data            DATE        NOT NULL,
  rotulo          TEXT        CHECK (char_length(rotulo) <= 60),
  conteudo_cripto TEXT        NOT NULL,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX prontuario_evolucoes_pac ON public.prontuario_evolucoes (paciente_id, data DESC);

CREATE TABLE public.prontuario_correcoes (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  evolucao_id     UUID        NOT NULL REFERENCES public.prontuario_evolucoes (id) ON DELETE CASCADE,
  conteudo_cripto TEXT        NOT NULL,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Demanda e objetivos, encerramento: cada salvamento é uma versão nova.
CREATE TABLE public.prontuario_secoes (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id     UUID        NOT NULL REFERENCES public.pacientes (id) ON DELETE CASCADE,
  tipo            TEXT        NOT NULL CHECK (tipo IN ('demanda', 'encerramento')),
  conteudo_cripto TEXT        NOT NULL,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX prontuario_secoes_pac ON public.prontuario_secoes (paciente_id, tipo, criado_em DESC);

-- Anexos: o arquivo cifrado vai para o Storage; aqui ficam o caminho e o nome cifrado.
CREATE TABLE public.prontuario_anexos (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID        NOT NULL REFERENCES public.pacientes (id) ON DELETE CASCADE,
  caminho     TEXT        NOT NULL UNIQUE,
  meta_cripto TEXT        NOT NULL,
  tamanho     INTEGER     NOT NULL CHECK (tamanho BETWEEN 1 AND 15000000),
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Registro de acessos (quem abriu, de que aparelho, de onde).
CREATE TABLE public.prontuario_acessos (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID        REFERENCES public.pacientes (id) ON DELETE CASCADE,
  acao        TEXT        NOT NULL CHECK (char_length(acao) <= 60),
  aparelho    TEXT        CHECK (char_length(aparelho) <= 60),
  cidade      TEXT        CHECK (char_length(cidade) <= 80),
  quando      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX prontuario_acessos_pac ON public.prontuario_acessos (paciente_id, quando DESC);

-- Evoluções e correções não podem ser alteradas depois de salvas.
CREATE FUNCTION privado.sem_alteracao() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'registro do prontuário não pode ser alterado';
END;
$$;
CREATE TRIGGER evolucoes_imutaveis BEFORE UPDATE ON public.prontuario_evolucoes FOR EACH ROW EXECUTE FUNCTION privado.sem_alteracao();
CREATE TRIGGER correcoes_imutaveis BEFORE UPDATE ON public.prontuario_correcoes FOR EACH ROW EXECUTE FUNCTION privado.sem_alteracao();

ALTER TABLE public.prontuario_chave     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prontuario_evolucoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prontuario_correcoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prontuario_secoes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prontuario_anexos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prontuario_acessos   ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.prontuario_chave, public.prontuario_evolucoes, public.prontuario_correcoes, public.prontuario_secoes, public.prontuario_anexos, public.prontuario_acessos FROM anon;

CREATE POLICY admin_pr_chave ON public.prontuario_chave FOR ALL TO authenticated USING (privado.eh_admin()) WITH CHECK (privado.eh_admin());
CREATE POLICY admin_pr_evo   ON public.prontuario_evolucoes FOR ALL TO authenticated USING (privado.eh_admin()) WITH CHECK (privado.eh_admin());
CREATE POLICY admin_pr_corr  ON public.prontuario_correcoes FOR ALL TO authenticated USING (privado.eh_admin()) WITH CHECK (privado.eh_admin());
CREATE POLICY admin_pr_sec   ON public.prontuario_secoes FOR ALL TO authenticated USING (privado.eh_admin()) WITH CHECK (privado.eh_admin());
CREATE POLICY admin_pr_anx   ON public.prontuario_anexos FOR ALL TO authenticated USING (privado.eh_admin()) WITH CHECK (privado.eh_admin());
CREATE POLICY admin_pr_log   ON public.prontuario_acessos FOR ALL TO authenticated USING (privado.eh_admin()) WITH CHECK (privado.eh_admin());

-- Storage privado para os anexos (já cifrados no navegador).
INSERT INTO storage.buckets (id, name, public, file_size_limit) VALUES ('prontuario', 'prontuario', false, 15000000)
ON CONFLICT (id) DO NOTHING;
CREATE POLICY prontuario_admin_le ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'prontuario' AND privado.eh_admin());
CREATE POLICY prontuario_admin_grava ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'prontuario' AND privado.eh_admin());
CREATE POLICY prontuario_admin_apaga ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'prontuario' AND privado.eh_admin());
