-- 003 · Conferência (não altera nada)
-- Rodar depois do 001 e do 002 e mandar o resultado para o Claude (print da tabela).

SELECT 'tabelas com RLS'                       AS item,
       count(*)::TEXT                          AS valor
  FROM pg_tables
 WHERE schemaname = 'public'
   AND tablename IN ('admins', 'config_agenda', 'semana_padrao', 'bloqueios', 'pedidos', 'google_conexao', 'tentativas')
   AND rowsecurity

UNION ALL
SELECT 'políticas de acesso',
       count(*)::TEXT
  FROM pg_policies
 WHERE schemaname = 'public'

UNION ALL
SELECT 'administradoras',
       count(*)::TEXT
  FROM public.admins

UNION ALL
SELECT 'dias da semana padrão',
       count(*)::TEXT
  FROM public.semana_padrao

UNION ALL
SELECT 'tarefa de 15 em 15 minutos',
       coalesce(max(schedule), 'não encontrada')
  FROM cron.job
 WHERE jobname = 'liberar-pedidos-vencidos';
