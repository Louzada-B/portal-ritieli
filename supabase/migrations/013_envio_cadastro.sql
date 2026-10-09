-- 013 · Controle de envio da ficha de cadastro e do termo
-- Marca quando o link foi aberto no WhatsApp (o envio em si é manual).
ALTER TABLE public.fichas ADD COLUMN IF NOT EXISTS enviada_em TIMESTAMPTZ;
ALTER TABLE public.termos ADD COLUMN IF NOT EXISTS link_enviado_em TIMESTAMPTZ;
