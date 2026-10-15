-- Avaliações anônimas das palestras (página pública /avaliacao, acessada por QR code).
-- Sem nome, e-mail ou IP: só as respostas. Escrita e leitura apenas pelo servidor (service role).
create table if not exists public.avaliacoes_palestra (
  id bigint generated always as identity primary key,
  palestra text not null default 'palestra' check (palestra ~ '^[a-z0-9-]{1,60}$'),
  nota smallint not null check (nota between 1 and 5),
  clareza text not null check (clareza in ('sim', 'em_parte', 'nao')),
  duracao text not null check (duracao in ('curta', 'na_medida', 'longa')),
  mais_util text check (char_length(mais_util) <= 1000),
  melhorar text check (char_length(melhorar) <= 1000),
  criado_em timestamptz not null default now()
);
create index if not exists avaliacoes_palestra_palestra_idx on public.avaliacoes_palestra (palestra, criado_em desc);
alter table public.avaliacoes_palestra enable row level security;
