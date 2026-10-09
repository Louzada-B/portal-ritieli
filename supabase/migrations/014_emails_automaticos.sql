-- 014 · E-mails automáticos (confirmação da conversa e lembretes)
-- envios_email: um registro por e-mail enviado, para nunca mandar o mesmo duas vezes.
-- pacientes.lembretes_email: a pessoa pode pedir para não receber lembretes.
CREATE TABLE IF NOT EXISTS public.envios_email (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo       TEXT        NOT NULL,
  chave      TEXT        NOT NULL,
  enviado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tipo, chave)
);

ALTER TABLE public.envios_email ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.envios_email FROM anon;

CREATE POLICY admin_envios_email ON public.envios_email
  FOR ALL TO authenticated USING (privado.eh_admin()) WITH CHECK (privado.eh_admin());

ALTER TABLE public.pacientes ADD COLUMN IF NOT EXISTS lembretes_email BOOLEAN NOT NULL DEFAULT TRUE;
