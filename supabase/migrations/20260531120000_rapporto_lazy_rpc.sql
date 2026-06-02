-- FASE 4 BIS — Wave 3 (lazy): RPC sezioni dettaglio rapporto + rapporto-by-id
-- Sostituisce i table-query delle sezioni lazy (tickets/contributi/variazioni/
-- cedolini) e la fetch del rapporto per id. <entita>_<scopo>, setof <table>,
-- STABLE, SECURITY DEFINER. Tutti gli id sono uuid.

create or replace function public.rapporti_lavorativi_by_ids(p_ids uuid[])
returns setof public.rapporti_lavorativi
language sql stable security definer set search_path = public
as $$ select * from public.rapporti_lavorativi where id = any (p_ids); $$;

create or replace function public.ticket_by_rapporto(p_rapporto_id uuid)
returns setof public.ticket
language sql stable security definer set search_path = public
as $$ select * from public.ticket where rapporto_id = p_rapporto_id; $$;

create or replace function public.contributi_inps_by_rapporto(p_rapporto_id uuid)
returns setof public.contributi_inps
language sql stable security definer set search_path = public
as $$ select * from public.contributi_inps where rapporto_lavorativo_id = p_rapporto_id; $$;

create or replace function public.variazioni_by_rapporto(p_rapporto_id uuid)
returns setof public.variazioni_contrattuali
language sql stable security definer set search_path = public
as $$ select * from public.variazioni_contrattuali where rapporto_lavorativo_id = p_rapporto_id; $$;

create or replace function public.mesi_lavorati_by_rapporto(p_rapporto_id uuid)
returns setof public.mesi_lavorati
language sql stable security definer set search_path = public
as $$ select * from public.mesi_lavorati where rapporto_lavorativo_id = p_rapporto_id; $$;

create or replace function public.mesi_calendario_by_ids(p_ids uuid[])
returns setof public.mesi_calendario
language sql stable security definer set search_path = public
as $$ select * from public.mesi_calendario where id = any (p_ids); $$;

create or replace function public.pagamenti_by_ticket_ids(p_ticket_ids uuid[])
returns setof public.pagamenti
language sql stable security definer set search_path = public
as $$ select * from public.pagamenti where ticket_id = any (p_ticket_ids); $$;

create or replace function public.presenze_by_ids(p_ids uuid[])
returns setof public.presenze_mensili
language sql stable security definer set search_path = public
as $$ select * from public.presenze_mensili where id = any (p_ids); $$;

grant execute on function public.rapporti_lavorativi_by_ids(uuid[]) to anon, authenticated;
grant execute on function public.ticket_by_rapporto(uuid) to anon, authenticated;
grant execute on function public.contributi_inps_by_rapporto(uuid) to anon, authenticated;
grant execute on function public.variazioni_by_rapporto(uuid) to anon, authenticated;
grant execute on function public.mesi_lavorati_by_rapporto(uuid) to anon, authenticated;
grant execute on function public.mesi_calendario_by_ids(uuid[]) to anon, authenticated;
grant execute on function public.pagamenti_by_ticket_ids(uuid[]) to anon, authenticated;
grant execute on function public.presenze_by_ids(uuid[]) to anon, authenticated;
