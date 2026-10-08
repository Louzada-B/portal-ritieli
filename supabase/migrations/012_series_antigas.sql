-- Séries semanais anteriores do paciente no Google (quando o horário fixo muda ou o
-- acompanhamento é retomado), para cancelar ou mover sessões do período antigo.
ALTER TABLE public.pacientes ADD COLUMN IF NOT EXISTS series_antigas text[] NOT NULL DEFAULT '{}';
