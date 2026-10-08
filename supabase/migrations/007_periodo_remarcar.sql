-- 007 · Início e fim do acompanhamento, e sessões remarcadas
-- fim: data da última sessão (prevista ou de encerramento). A série semanal para ali.
-- retomado_em: quando um acompanhamento encerrado volta; as sessões recomeçam dessa data.
-- remarcada_de: horário original de uma sessão que mudou de dia ou hora.

ALTER TABLE public.pacientes
  ADD COLUMN fim DATE,
  ADD COLUMN retomado_em DATE;
ALTER TABLE public.pacientes ADD CONSTRAINT pacientes_fim_depois CHECK (fim IS NULL OR fim >= desde);
ALTER TABLE public.sessoes ADD COLUMN remarcada_de TIMESTAMPTZ;
