-- Ajustes da área da(o) paciente (rodada de testes 1).

-- 1) Pagamento por sessão: a Ritieli libera a sessão para a paciente pagar separado.
ALTER TABLE public.sessoes ADD COLUMN IF NOT EXISTS pagamento_avulso BOOLEAN NOT NULL DEFAULT FALSE;

-- 2) Um mesmo responsável (mesmo nome e e-mail) não deve existir duas vezes: junta os repetidos
--    para que um login enxergue todos os filhos.
DO $$
DECLARE
  g RECORD;
  dup UUID;
  manter UUID;
BEGIN
  FOR g IN
    SELECT lower(btrim(email)) AS em, lower(btrim(nome)) AS nm
      FROM public.responsaveis
     WHERE email IS NOT NULL AND btrim(email) <> ''
     GROUP BY 1, 2
    HAVING count(*) > 1
  LOOP
    -- Fica o que já tem acesso (se houver), senão o mais antigo.
    SELECT r.id INTO manter
      FROM public.responsaveis r
     WHERE lower(btrim(r.email)) = g.em AND lower(btrim(r.nome)) = g.nm
     ORDER BY EXISTS (SELECT 1 FROM public.acessos_paciente a WHERE a.responsavel_id = r.id) DESC, r.criado_em
     LIMIT 1;
    FOR dup IN
      SELECT r.id FROM public.responsaveis r
       WHERE lower(btrim(r.email)) = g.em AND lower(btrim(r.nome)) = g.nm AND r.id <> manter
    LOOP
      INSERT INTO public.paciente_responsaveis (paciente_id, responsavel_id, parentesco, financeiro, legal, ordem)
      SELECT paciente_id, manter, parentesco, financeiro, legal, ordem
        FROM public.paciente_responsaveis WHERE responsavel_id = dup
      ON CONFLICT (paciente_id, responsavel_id) DO NOTHING;
      DELETE FROM public.acessos_paciente WHERE responsavel_id = dup AND EXISTS (SELECT 1 FROM public.acessos_paciente WHERE responsavel_id = manter);
      UPDATE public.acessos_paciente SET responsavel_id = manter WHERE responsavel_id = dup;
      DELETE FROM public.responsaveis WHERE id = dup;
    END LOOP;
  END LOOP;
END $$;

-- 3) Só um responsável financeiro por paciente (se houver mais de um, fica o de menor ordem).
UPDATE public.paciente_responsaveis pr SET financeiro = FALSE
 WHERE financeiro AND EXISTS (
   SELECT 1 FROM public.paciente_responsaveis o
    WHERE o.paciente_id = pr.paciente_id AND o.financeiro AND o.responsavel_id <> pr.responsavel_id
      AND (o.ordem, o.responsavel_id) < (pr.ordem, pr.responsavel_id));
CREATE UNIQUE INDEX IF NOT EXISTS paciente_responsaveis_um_financeiro ON public.paciente_responsaveis (paciente_id) WHERE financeiro;

-- 4) Aviso à paciente quando o pedido é resolvido.
ALTER TABLE public.pedidos_paciente ADD COLUMN IF NOT EXISTS resultado TEXT CHECK (resultado IN ('confirmado','recusado'));
