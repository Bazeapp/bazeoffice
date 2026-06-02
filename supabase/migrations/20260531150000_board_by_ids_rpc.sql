-- FASE 4 BIS — Wave 4: by-ids per reload single-card delle board.
-- variazioni / contributi reload del singolo record dopo edit (by id).
-- chiusure_by_ids e rapporti_lavorativi_by_ids esistono già.
create or replace function public.variazioni_by_ids(p_ids uuid[])
returns setof public.variazioni_contrattuali
language sql stable security definer set search_path = public
as $$ select * from public.variazioni_contrattuali where id = any (p_ids); $$;

create or replace function public.contributi_inps_by_ids(p_ids uuid[])
returns setof public.contributi_inps
language sql stable security definer set search_path = public
as $$ select * from public.contributi_inps where id = any (p_ids); $$;

grant execute on function public.variazioni_by_ids(uuid[]) to anon, authenticated;
grant execute on function public.contributi_inps_by_ids(uuid[]) to anon, authenticated;
