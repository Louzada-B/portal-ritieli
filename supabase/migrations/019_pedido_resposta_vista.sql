-- A(o) paciente pode dispensar o aviso da resposta a um pedido de remarcação/cancelamento.
alter table public.pedidos_paciente add column if not exists resposta_vista_em timestamptz;
