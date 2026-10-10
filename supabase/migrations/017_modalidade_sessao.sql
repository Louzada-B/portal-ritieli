-- Modalidade de uma sessão específica. Vazio = o padrão do paciente (adulta: online; criança: presencial).
ALTER TABLE public.sessoes ADD COLUMN IF NOT EXISTS modalidade TEXT CHECK (modalidade IN ('online', 'presencial'));
