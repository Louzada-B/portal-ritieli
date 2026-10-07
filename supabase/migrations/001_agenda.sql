-- 001 · Agenda da conversa inicial
-- Rodar uma vez no Supabase: SQL Editor → New query → colar tudo → Run.
-- Cria as tabelas da agenda, as proteções de acesso e marca a Ritieli como administradora.

-- Tipos ---------------------------------------------------------------

CREATE TYPE public.status_pedido AS ENUM ('aguardando', 'confirmado', 'recusado', 'liberado');
CREATE TYPE public.para_quem     AS ENUM ('mim', 'filho');

-- Quem pode entrar no painel -------------------------------------------

CREATE TABLE public.admins (
  user_id   UUID        PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE FUNCTION public.eh_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid());
$$;

-- Regras gerais da agenda (uma linha só) ---------------------------------

CREATE TABLE public.config_agenda (
  id                   SMALLINT    PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  antecedencia_horas   INTEGER     NOT NULL DEFAULT 24 CHECK (antecedencia_horas BETWEEN 0 AND 168),
  janela_dias          INTEGER     NOT NULL DEFAULT 14 CHECK (janela_dias BETWEEN 7 AND 60),
  duracao_conversa_min INTEGER     NOT NULL DEFAULT 15 CHECK (duracao_conversa_min BETWEEN 10 AND 60),
  atualizado_em        TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.config_agenda (id) VALUES (1);

-- Semana padrão (0 = domingo … 6 = sábado), horários de Brasília -------------

CREATE TABLE public.semana_padrao (
  dia_semana   SMALLINT PRIMARY KEY CHECK (dia_semana BETWEEN 0 AND 6),
  ativo        BOOLEAN  NOT NULL DEFAULT FALSE,
  inicio       TIME     NOT NULL DEFAULT '08:00',
  fim          TIME     NOT NULL DEFAULT '12:00',
  pausa_inicio TIME,
  pausa_fim    TIME,
  CHECK (fim > inicio),
  CHECK ((pausa_inicio IS NULL) = (pausa_fim IS NULL)),
  CHECK (pausa_inicio IS NULL OR (pausa_inicio >= inicio AND pausa_fim <= fim AND pausa_fim > pausa_inicio))
);

-- Começa tudo desligado: nada aparece no site até a Ritieli configurar.
INSERT INTO public.semana_padrao (dia_semana)
SELECT generate_series(0, 6);

-- Datas bloqueadas -----------------------------------------------------

CREATE TABLE public.bloqueios (
  id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  inicio    TIMESTAMPTZ NOT NULL,
  fim       TIMESTAMPTZ NOT NULL,
  motivo    TEXT        CHECK (char_length(motivo) <= 200),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (fim > inicio)
);

CREATE INDEX bloqueios_periodo ON public.bloqueios (inicio, fim);

-- Pedidos de conversa inicial --------------------------------------------

CREATE TABLE public.pedidos (
  id                 UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  para_quem          public.para_quem     NOT NULL,
  nome               TEXT                 NOT NULL CHECK (char_length(nome) BETWEEN 2 AND 120),
  whatsapp           TEXT                 NOT NULL CHECK (whatsapp ~ '^[0-9]{10,13}$'),
  email              TEXT                 NOT NULL CHECK (char_length(email) <= 254 AND email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  idade_crianca      SMALLINT             CHECK (idade_crianca BETWEEN 5 AND 16),
  mensagem           TEXT                 CHECK (char_length(mensagem) <= 2000),
  inicio             TIMESTAMPTZ          NOT NULL,
  status             public.status_pedido NOT NULL DEFAULT 'aguardando',
  aceite_politica_em TIMESTAMPTZ          NOT NULL,
  meet_link          TEXT,
  google_evento_id   TEXT,
  criado_em          TIMESTAMPTZ          NOT NULL DEFAULT now(),
  respondido_em      TIMESTAMPTZ,
  liberado_em        TIMESTAMPTZ,
  CHECK ((para_quem = 'filho') = (idade_crianca IS NOT NULL))
);

-- Impede dois pedidos ativos no mesmo horário, mesmo com cliques simultâneos.
CREATE UNIQUE INDEX pedidos_horario_ativo ON public.pedidos (inicio)
  WHERE status IN ('aguardando', 'confirmado');

CREATE INDEX pedidos_status_criado ON public.pedidos (status, criado_em);

-- Conexão com o Google Agenda (guardada criptografada pelo servidor) ----------

CREATE TABLE public.google_conexao (
  id                   SMALLINT    PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  email                TEXT,
  refresh_token_cripto TEXT        NOT NULL,
  bloquear_site        BOOLEAN     NOT NULL DEFAULT TRUE,
  enviar_eventos       BOOLEAN     NOT NULL DEFAULT TRUE,
  conectado_em         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Controle de envios repetidos do formulário ------------------------------

CREATE TABLE public.tentativas (
  id        BIGSERIAL   PRIMARY KEY,
  chave     TEXT        NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX tentativas_chave ON public.tentativas (chave, criado_em);

-- Proteções --------------------------------------------------------------
-- RLS ligado em tudo. O site público não tem nenhuma permissão:
-- quem grava o pedido é o servidor. Só a administradora logada lê e altera.

ALTER TABLE public.admins         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_agenda  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semana_padrao  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bloqueios      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_conexao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tentativas     ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.admins, public.config_agenda, public.semana_padrao, public.bloqueios,
              public.pedidos, public.google_conexao, public.tentativas
  FROM anon;

REVOKE ALL ON public.google_conexao, public.tentativas FROM authenticated;

CREATE POLICY admin_le_admins ON public.admins
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY admin_config ON public.config_agenda
  FOR ALL TO authenticated
  USING (public.eh_admin()) WITH CHECK (public.eh_admin());

CREATE POLICY admin_semana ON public.semana_padrao
  FOR ALL TO authenticated
  USING (public.eh_admin()) WITH CHECK (public.eh_admin());

CREATE POLICY admin_bloqueios ON public.bloqueios
  FOR ALL TO authenticated
  USING (public.eh_admin()) WITH CHECK (public.eh_admin());

CREATE POLICY admin_pedidos ON public.pedidos
  FOR ALL TO authenticated
  USING (public.eh_admin()) WITH CHECK (public.eh_admin());

REVOKE EXECUTE ON FUNCTION public.eh_admin() FROM anon;

-- Administradora ---------------------------------------------------------

INSERT INTO public.admins (user_id)
SELECT id
  FROM auth.users
 WHERE email = 'ritielihermes@gmail.com';
