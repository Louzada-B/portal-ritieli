-- 015 · Área da paciente
-- acessos_paciente: um login por pessoa (a própria paciente adulta ou o responsável de crianças/adolescentes).
--   Senhas só como hash (scrypt). A senha provisória vale 24 h e é guardada como hash também.
-- acessos_sessao: sessões abertas (o navegador guarda um código; o banco guarda só o hash).
-- pedidos_paciente: pedidos de remarcação ou cancelamento que a Ritieli resolve pelo painel.
-- config_agenda: dados do Pix para gerar o "copia e cola".
-- As tabelas de acesso e sessão só são lidas pelo servidor (service role): sem política para ninguém.
CREATE TABLE public.acessos_paciente (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email            TEXT        NOT NULL CHECK (email = lower(email)),
  nome             TEXT        NOT NULL,
  paciente_id      UUID        REFERENCES public.pacientes(id) ON DELETE CASCADE,
  responsavel_id   UUID        REFERENCES public.responsaveis(id) ON DELETE CASCADE,
  senha_hash       TEXT,
  prov_hash        TEXT,
  prov_expira_em   TIMESTAMPTZ,
  senha_trocada_em TIMESTAMPTZ,
  ativo            BOOLEAN     NOT NULL DEFAULT TRUE,
  ultimo_acesso_em TIMESTAMPTZ,
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((paciente_id IS NULL) <> (responsavel_id IS NULL))
);
CREATE UNIQUE INDEX acessos_paciente_email ON public.acessos_paciente (email);
CREATE UNIQUE INDEX acessos_paciente_pac   ON public.acessos_paciente (paciente_id)   WHERE paciente_id IS NOT NULL;
CREATE UNIQUE INDEX acessos_paciente_resp  ON public.acessos_paciente (responsavel_id) WHERE responsavel_id IS NOT NULL;

CREATE TABLE public.acessos_sessao (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  acesso_id    UUID        NOT NULL REFERENCES public.acessos_paciente(id) ON DELETE CASCADE,
  token_hash   TEXT        NOT NULL UNIQUE,
  trocar_senha BOOLEAN     NOT NULL DEFAULT FALSE,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expira_em    TIMESTAMPTZ NOT NULL
);
CREATE INDEX acessos_sessao_acesso ON public.acessos_sessao (acesso_id);
CREATE INDEX acessos_sessao_expira ON public.acessos_sessao (expira_em);

CREATE TABLE public.pedidos_paciente (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id   UUID        NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  sessao_id     UUID        REFERENCES public.sessoes(id) ON DELETE SET NULL,
  sessao_inicio TIMESTAMPTZ,
  tipo          TEXT        NOT NULL CHECK (tipo IN ('remarcar', 'cancelar')),
  mensagem      TEXT,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolvido_em  TIMESTAMPTZ
);
CREATE INDEX pedidos_paciente_abertos ON public.pedidos_paciente (criado_em) WHERE resolvido_em IS NULL;
CREATE INDEX pedidos_paciente_sessao  ON public.pedidos_paciente (sessao_id);

ALTER TABLE public.acessos_paciente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acessos_sessao   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos_paciente ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.acessos_paciente, public.acessos_sessao, public.pedidos_paciente FROM anon;
REVOKE ALL ON public.acessos_paciente, public.acessos_sessao FROM authenticated;

CREATE POLICY admin_pedidos_paciente ON public.pedidos_paciente
  FOR ALL TO authenticated USING (privado.eh_admin()) WITH CHECK (privado.eh_admin());

ALTER TABLE public.config_agenda ADD COLUMN IF NOT EXISTS pix_chave  TEXT;
ALTER TABLE public.config_agenda ADD COLUMN IF NOT EXISTS pix_nome   TEXT NOT NULL DEFAULT 'Ritieli Hermes';
ALTER TABLE public.config_agenda ADD COLUMN IF NOT EXISTS pix_cidade TEXT NOT NULL DEFAULT 'Porto Alegre';
