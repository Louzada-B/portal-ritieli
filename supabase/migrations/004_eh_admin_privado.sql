-- 004 · Tira a função eh_admin() da API pública
-- As políticas continuam usando a mesma função; ela só deixa de ser chamável pelo site.

CREATE SCHEMA IF NOT EXISTS privado;

REVOKE ALL ON SCHEMA privado FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA privado TO authenticated;

ALTER FUNCTION public.eh_admin() SET SCHEMA privado;

REVOKE EXECUTE ON FUNCTION privado.eh_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION privado.eh_admin() TO authenticated;
