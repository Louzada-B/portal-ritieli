-- 005 · Pacientes, responsáveis, ficha de cadastro e termos
-- Dados pessoais sensíveis (CPF, nascimento, contato de emergência) chegam
-- já criptografados pelo servidor (colunas *_cripto). O banco nunca vê o texto puro.

CREATE TYPE public.tipo_paciente  AS ENUM ('adulta', 'crianca');
CREATE TYPE public.status_paciente AS ENUM ('ativo', 'encerrado');
CREATE TYPE public.status_termo    AS ENUM ('enviado', 'aceito', 'cancelado');

CREATE TABLE public.pacientes (
  id                 UUID                   PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo               public.tipo_paciente   NOT NULL,
  nome               TEXT                   NOT NULL CHECK (char_length(nome) BETWEEN 2 AND 120),
  idade              SMALLINT               CHECK (idade BETWEEN 1 AND 120),
  whatsapp           TEXT                   CHECK (whatsapp ~ '^[0-9]{10,11}$'),
  email              TEXT                   CHECK (char_length(email) <= 254),
  cidade             TEXT                   CHECK (char_length(cidade) <= 120),
  escola             TEXT                   CHECK (char_length(escola) <= 160),
  cpf_cripto         TEXT,
  cpf_final          TEXT                   CHECK (cpf_final ~ '^[0-9]{2}$'),
  nascimento_cripto  TEXT,
  emergencia_cripto  TEXT,
  valor_centavos     INTEGER                CHECK (valor_centavos BETWEEN 0 AND 10000000),
  tipo_valor         TEXT                   NOT NULL DEFAULT 'normal' CHECK (tipo_valor IN ('normal', 'social')),
  fixo_dia           SMALLINT               CHECK (fixo_dia BETWEEN 0 AND 6),
  fixo_hora          TIME,
  meet_link          TEXT,
  google_evento_id   TEXT,
  status             public.status_paciente NOT NULL DEFAULT 'ativo',
  desde              DATE                   NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  pedido_id          UUID                   REFERENCES public.pedidos (id) ON DELETE SET NULL,
  ficha_em           TIMESTAMPTZ,
  criado_em          TIMESTAMPTZ            NOT NULL DEFAULT now(),
  atualizado_em      TIMESTAMPTZ            NOT NULL DEFAULT now(),
  CHECK ((fixo_dia IS NULL) = (fixo_hora IS NULL))
);

CREATE INDEX pacientes_status ON public.pacientes (status, nome);

-- Um responsável pode acompanhar mais de um filho (um login por responsável, no futuro).
CREATE TABLE public.responsaveis (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome               TEXT        NOT NULL CHECK (char_length(nome) BETWEEN 2 AND 120),
  whatsapp           TEXT        CHECK (whatsapp ~ '^[0-9]{10,11}$'),
  email              TEXT        CHECK (char_length(email) <= 254),
  cpf_cripto         TEXT,
  cpf_final          TEXT        CHECK (cpf_final ~ '^[0-9]{2}$'),
  nascimento_cripto  TEXT,
  criado_em          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.paciente_responsaveis (
  paciente_id    UUID    NOT NULL REFERENCES public.pacientes (id) ON DELETE CASCADE,
  responsavel_id UUID    NOT NULL REFERENCES public.responsaveis (id) ON DELETE CASCADE,
  parentesco     TEXT    CHECK (char_length(parentesco) <= 40),
  financeiro     BOOLEAN NOT NULL DEFAULT FALSE,
  legal          BOOLEAN NOT NULL DEFAULT TRUE,
  ordem          SMALLINT NOT NULL DEFAULT 1,
  PRIMARY KEY (paciente_id, responsavel_id)
);

-- Links pessoais (ficha de cadastro e aceite do termo). Guardamos só o hash do token.
CREATE TABLE public.fichas (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id   UUID        NOT NULL REFERENCES public.pacientes (id) ON DELETE CASCADE,
  token_hash    TEXT        NOT NULL UNIQUE,
  expira_em     TIMESTAMPTZ NOT NULL,
  preenchida_em TIMESTAMPTZ,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.termos (
  id               UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id      UUID                NOT NULL REFERENCES public.pacientes (id) ON DELETE CASCADE,
  conteudo_cripto  TEXT                NOT NULL,
  resumo           TEXT                NOT NULL,
  token_hash       TEXT                NOT NULL UNIQUE,
  status           public.status_termo NOT NULL DEFAULT 'enviado',
  enviado_em       TIMESTAMPTZ         NOT NULL DEFAULT now(),
  aceito_em        TIMESTAMPTZ,
  aceite_nome      TEXT,
  aceite_ip_hash   TEXT,
  aceite_navegador TEXT
);

CREATE INDEX termos_paciente ON public.termos (paciente_id, enviado_em DESC);

-- Política de faltas padrão (vale para todos os termos novos).
ALTER TABLE public.config_agenda
  ADD COLUMN politica_faltas TEXT NOT NULL DEFAULT 'Cancelamentos e remarcações precisam ser avisados com pelo menos 24 horas de antecedência. Cancelamentos com menos de 24 horas são considerados falta, e faltas sem desmarcação são cobradas como sessão realizada.';

-- Proteções ---------------------------------------------------------------

ALTER TABLE public.pacientes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responsaveis          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paciente_responsaveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fichas                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.termos                ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.pacientes, public.responsaveis, public.paciente_responsaveis, public.fichas, public.termos FROM anon;

CREATE POLICY admin_pacientes ON public.pacientes
  FOR ALL TO authenticated USING (privado.eh_admin()) WITH CHECK (privado.eh_admin());

CREATE POLICY admin_responsaveis ON public.responsaveis
  FOR ALL TO authenticated USING (privado.eh_admin()) WITH CHECK (privado.eh_admin());

CREATE POLICY admin_paciente_responsaveis ON public.paciente_responsaveis
  FOR ALL TO authenticated USING (privado.eh_admin()) WITH CHECK (privado.eh_admin());

CREATE POLICY admin_fichas ON public.fichas
  FOR ALL TO authenticated USING (privado.eh_admin()) WITH CHECK (privado.eh_admin());

CREATE POLICY admin_termos ON public.termos
  FOR ALL TO authenticated USING (privado.eh_admin()) WITH CHECK (privado.eh_admin());
