-- 006 · Sessões e pagamentos
-- Cada sessão nasce "agendada" (do horário fixo do paciente ou registrada à mão).
-- No dia vira realizada, falta (cobrada) ou cancelada com 24h (sem cobrança).
-- Pagamento é só Pix: pago_em marca quando caiu; recibo_em marca o recibo do Receita Saúde.

CREATE TYPE public.status_sessao AS ENUM ('agendada', 'realizada', 'falta', 'cancelada');

CREATE TABLE public.sessoes (
  id             UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id    UUID                 NOT NULL REFERENCES public.pacientes (id) ON DELETE CASCADE,
  inicio         TIMESTAMPTZ          NOT NULL,
  status         public.status_sessao NOT NULL DEFAULT 'agendada',
  valor_centavos INTEGER              CHECK (valor_centavos BETWEEN 0 AND 10000000),
  pago_em        TIMESTAMPTZ,
  recibo_em      TIMESTAMPTZ,
  origem         TEXT                 NOT NULL DEFAULT 'manual' CHECK (origem IN ('fixo', 'manual')),
  criado_em      TIMESTAMPTZ          NOT NULL DEFAULT now(),
  atualizado_em  TIMESTAMPTZ          NOT NULL DEFAULT now(),
  UNIQUE (paciente_id, inicio)
);

CREATE INDEX sessoes_inicio ON public.sessoes (inicio DESC);

ALTER TABLE public.sessoes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sessoes FROM anon;

CREATE POLICY admin_sessoes ON public.sessoes
  FOR ALL TO authenticated USING (privado.eh_admin()) WITH CHECK (privado.eh_admin());
