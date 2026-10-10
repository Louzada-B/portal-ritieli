-- Linha de "check" gravada a cada 5 dias para o Supabase gratuito nunca ficar parado.
-- Só o servidor (service role) acessa: RLS ligada e nenhuma política.
create table if not exists public.keepalive (
  id bigint generated always as identity primary key,
  status text not null default 'check',
  checado_em timestamptz not null default now()
);
alter table public.keepalive enable row level security;
