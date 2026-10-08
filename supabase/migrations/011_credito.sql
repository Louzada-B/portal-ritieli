-- Usa um crédito (sessão cancelada já paga) para pagar outra sessão em aberto do mesmo paciente.
-- As duas mudanças acontecem juntas: o pagamento muda de lugar, nunca some nem duplica.
-- SECURITY INVOKER: valem as mesmas regras de acesso (só a Ritieli, pelo painel).
CREATE OR REPLACE FUNCTION public.usar_credito(de uuid, para uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  c record;
BEGIN
  SELECT id, paciente_id, pago_em, recibo_em INTO c
  FROM sessoes WHERE id = de AND status = 'cancelada' AND pago_em IS NOT NULL
  FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;

  UPDATE sessoes SET pago_em = c.pago_em, recibo_em = c.recibo_em, atualizado_em = now()
  WHERE id = para AND paciente_id = c.paciente_id AND status <> 'cancelada' AND pago_em IS NULL;
  IF NOT FOUND THEN RETURN false; END IF;

  UPDATE sessoes SET pago_em = NULL, recibo_em = NULL, atualizado_em = now() WHERE id = de;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.usar_credito(uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.usar_credito(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.usar_credito(uuid, uuid) TO service_role;
