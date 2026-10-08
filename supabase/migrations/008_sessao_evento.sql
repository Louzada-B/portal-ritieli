-- 008 · Sessões avulsas também vão para a agenda do Google (evento próprio),
-- para bloquear o horário no site e na agenda da Ritieli.
ALTER TABLE public.sessoes ADD COLUMN google_evento_id TEXT;
