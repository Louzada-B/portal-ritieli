-- A 3ª afirmação deixa de ser a avaliação geral e passa a medir a aplicação prática do assunto.
alter table public.avaliacoes_palestra rename column nota to aplicacao;
alter table public.avaliacoes_palestra rename constraint avaliacoes_palestra_nota_check to avaliacoes_palestra_aplicacao_check;
comment on column public.avaliacoes_palestra.aplicacao is 'Likert 1-5: O assunto aqui discutido pode ser incrementado em minha vida de forma prática';
