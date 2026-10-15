-- A psicóloga (admin) lê as avaliações no painel. Ninguém mais lê; a gravação é só pelo servidor.
create policy admin_avaliacoes_palestra on public.avaliacoes_palestra for select to authenticated using (privado.eh_admin());
