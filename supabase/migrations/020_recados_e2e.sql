-- Recado do exercício: cifrado no navegador da paciente com a chave pública da Ritieli (só ela decifra).
-- A chave pública fica aberta; a privada fica selada pela chave mestra do prontuário.
ALTER TABLE public.prontuario_chave ADD COLUMN IF NOT EXISTS pub_recados TEXT;
ALTER TABLE public.prontuario_chave ADD COLUMN IF NOT EXISTS priv_recados_cripto TEXT;
ALTER TABLE public.exercicios ADD COLUMN IF NOT EXISTS recado_e2e TEXT;
-- O recado antigo (cifrado no servidor) deixa de ser usado.
UPDATE public.exercicios SET recado_cripto = NULL WHERE recado_cripto IS NOT NULL;
