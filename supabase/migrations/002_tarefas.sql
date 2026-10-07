-- 002 · Tarefas automáticas
-- Antes de rodar: Database → Extensions → ligar pg_cron.
-- Libera pedidos sem resposta há 48 horas e limpa o controle de envios, a cada 15 minutos.

CREATE FUNCTION public.liberar_pedidos_vencidos()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  qtd INTEGER;
BEGIN
  UPDATE public.pedidos
     SET status      = 'liberado',
         liberado_em = now()
   WHERE status    = 'aguardando'
     AND criado_em < now() - INTERVAL '48 hours';
  GET DIAGNOSTICS qtd = ROW_COUNT;

  DELETE FROM public.tentativas
   WHERE criado_em < now() - INTERVAL '1 day';

  RETURN qtd;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.liberar_pedidos_vencidos() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule(
  'liberar-pedidos-vencidos',
  '*/15 * * * *',
  $$SELECT public.liberar_pedidos_vencidos();$$
);
