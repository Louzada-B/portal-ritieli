-- As três primeiras perguntas viram escala Likert de 1 (discordo totalmente) a 5 (concordo totalmente).
alter table public.avaliacoes_palestra drop constraint if exists avaliacoes_palestra_clareza_check;
alter table public.avaliacoes_palestra drop constraint if exists avaliacoes_palestra_duracao_check;
alter table public.avaliacoes_palestra alter column clareza type smallint using null, alter column duracao type smallint using null;
alter table public.avaliacoes_palestra add constraint avaliacoes_palestra_clareza_check check (clareza between 1 and 5);
alter table public.avaliacoes_palestra add constraint avaliacoes_palestra_duracao_check check (duracao between 1 and 5);
comment on column public.avaliacoes_palestra.nota is 'Likert 1-5: No geral, a palestra foi muito boa';
comment on column public.avaliacoes_palestra.clareza is 'Likert 1-5: O conteúdo foi fácil de entender';
comment on column public.avaliacoes_palestra.duracao is 'Likert 1-5: O tempo da palestra foi adequado';
