-- 026 · Paciente de clínica parceira
-- A clínica cuida do cadastro, dos documentos, da agenda e do pagamento. No painel fica só o mínimo
-- (nome, clínica, início e uma observação) e o prontuário da Ritieli, com a mesma criptografia.
ALTER TABLE public.pacientes ADD COLUMN IF NOT EXISTS origem TEXT NOT NULL DEFAULT 'particular' CHECK (origem IN ('particular', 'clinica'));
ALTER TABLE public.pacientes ADD COLUMN IF NOT EXISTS clinica TEXT CHECK (char_length(clinica) BETWEEN 2 AND 120);
ALTER TABLE public.pacientes ADD COLUMN IF NOT EXISTS observacao TEXT CHECK (char_length(observacao) <= 500);
ALTER TABLE public.pacientes ADD CONSTRAINT pacientes_clinica_nome CHECK (origem <> 'clinica' OR clinica IS NOT NULL);

-- Atendimentos feitos na clínica: só data e, se quiser, horário. Sem valor, sem pagamento,
-- fora da agenda do site, do Google, dos lembretes e do financeiro (por isso numa tabela à parte das sessões).
CREATE TABLE public.atendimentos_clinica (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID        NOT NULL REFERENCES public.pacientes (id) ON DELETE CASCADE,
  data        DATE        NOT NULL,
  hora        TIME,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT atendimentos_clinica_unico UNIQUE NULLS NOT DISTINCT (paciente_id, data, hora)
);
CREATE INDEX atendimentos_clinica_pac ON public.atendimentos_clinica (paciente_id, data DESC);
ALTER TABLE public.atendimentos_clinica ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.atendimentos_clinica FROM anon;
CREATE POLICY admin_atendimentos_clinica ON public.atendimentos_clinica FOR ALL TO authenticated USING (privado.eh_admin()) WITH CHECK (privado.eh_admin());

-- A evolução pode apontar para um atendimento da clínica (em vez de uma sessão).
-- Sem ON DELETE: um atendimento que já tem evolução não pode ser apagado (a evolução não muda).
ALTER TABLE public.prontuario_evolucoes ADD COLUMN IF NOT EXISTS atendimento_id UUID REFERENCES public.atendimentos_clinica (id);
CREATE INDEX IF NOT EXISTS prontuario_evolucoes_atend ON public.prontuario_evolucoes (atendimento_id) WHERE atendimento_id IS NOT NULL;
