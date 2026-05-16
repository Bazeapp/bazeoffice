# ASS-009 data fix - processi_matching stato_res legacy

Date: 2026-05-16
Database: Supabase project `baze`
Table: `public.processi_matching`

## Scope

One-shot data correction for legacy records with an assigned recruiter but
`stato_res = 'da assegnare'`.

The frontend kanban uses `stato_res` for the process stage. The affected rows
were hidden because `da assegnare` is valid only for unassigned processes,
while these rows already had `recruiter_ricerca_e_selezione_id` and
`data_assegnazione`.

## Pre-fix diagnostic

```sql
select
  count(*) as affected_count,
  count(*) filter (where data_assegnazione is not null) as with_data_assegnazione,
  count(*) filter (where data_chiusura is not null) as with_data_chiusura
from public.processi_matching
where recruiter_ricerca_e_selezione_id is not null
  and lower(trim(stato_res)) = 'da assegnare';
```

Result:

- `affected_count`: 11
- `with_data_assegnazione`: 11
- `with_data_chiusura`: 0

## Updated records

All rows below had `stato_res_pre_fix = 'da assegnare'` and were updated to
`stato_res_post_fix = 'fare ricerca'`.

| id | recruiter_ricerca_e_selezione_id | data_assegnazione | aggiornato_il_pre_fix |
| --- | --- | --- | --- |
| d5df921d-c9f5-54a2-8b62-5cdb55333d11 | aeae84ea-2145-5a74-b915-098f8162667e | 2026-03-10 | 2026-05-13T07:47:32+00:00 |
| 130664ea-3d32-5ba4-a46b-b71aa957b69c | 007b316d-4f1b-5310-aac7-9d85711a3a7f | 2026-05-18 | 2026-05-15T16:08:01+00:00 |
| 66c2a203-5a6c-5930-a6ab-7ff8a194eb5d | 007b316d-4f1b-5310-aac7-9d85711a3a7f | 2026-05-18 | 2026-05-15T16:09:07+00:00 |
| 8d0c57a8-1649-51dd-a994-b44a0e72c926 | c09c4182-5dc1-50e0-a72c-79bca2e82370 | 2026-05-18 | 2026-05-15T16:08:24+00:00 |
| 941eca4c-1bf3-567f-bd2f-a1e797e8f958 | c09c4182-5dc1-50e0-a72c-79bca2e82370 | 2026-05-18 | 2026-05-15T16:23:03+00:00 |
| 9826f5ea-6775-5351-b042-52cffc9108bc | 007b316d-4f1b-5310-aac7-9d85711a3a7f | 2026-05-18 | 2026-05-15T16:08:38+00:00 |
| a01abaa4-bbb6-559a-aab3-1b99975a2a16 | 007b316d-4f1b-5310-aac7-9d85711a3a7f | 2026-05-18 | 2026-05-15T16:07:27+00:00 |
| a0a3e6eb-69ab-58c3-9981-7efd0c6c7325 | c09c4182-5dc1-50e0-a72c-79bca2e82370 | 2026-05-18 | 2026-05-15T16:08:08+00:00 |
| af37b78f-a7f7-528a-8d3c-6af85afbbf83 | c09c4182-5dc1-50e0-a72c-79bca2e82370 | 2026-05-18 | 2026-05-15T16:08:50+00:00 |
| b958fc25-b23b-5ea6-84ba-8e1364524753 | 007b316d-4f1b-5310-aac7-9d85711a3a7f | 2026-05-18 | 2026-05-15T16:09:18+00:00 |
| f17cd0b4-ce91-532f-b83f-c923500d2c23 | c09c4182-5dc1-50e0-a72c-79bca2e82370 | 2026-05-18 | 2026-05-15T16:08:57+00:00 |

`aggiornato_il_post_fix` returned by the update:
`2026-05-16T12:55:59.603673+00:00`.

## Executed update

```sql
with candidates as (
  select
    id,
    recruiter_ricerca_e_selezione_id,
    data_assegnazione,
    stato_res as stato_res_pre_fix,
    aggiornato_il as aggiornato_il_pre_fix
  from public.processi_matching
  where recruiter_ricerca_e_selezione_id is not null
    and lower(trim(stato_res)) = 'da assegnare'
    and data_assegnazione is not null
    and data_chiusura is null
)
update public.processi_matching pm
set
  stato_res = 'fare ricerca',
  aggiornato_il = now()
from candidates c
where pm.id = c.id;
```

## Post-fix verification

```sql
select count(*) as remaining_hybrid_count
from public.processi_matching
where recruiter_ricerca_e_selezione_id is not null
  and lower(trim(stato_res)) = 'da assegnare';
```

Result:

- `remaining_hybrid_count`: 0

## Rollback

Rollback should only be used if the business decision is reversed.

```sql
update public.processi_matching
set stato_res = 'da assegnare'
where id in (
  'd5df921d-c9f5-54a2-8b62-5cdb55333d11',
  '130664ea-3d32-5ba4-a46b-b71aa957b69c',
  '66c2a203-5a6c-5930-a6ab-7ff8a194eb5d',
  '8d0c57a8-1649-51dd-a994-b44a0e72c926',
  '941eca4c-1bf3-567f-bd2f-a1e797e8f958',
  '9826f5ea-6775-5351-b042-52cffc9108bc',
  'a01abaa4-bbb6-559a-aab3-1b99975a2a16',
  'a0a3e6eb-69ab-58c3-9981-7efd0c6c7325',
  'af37b78f-a7f7-528a-8d3c-6af85afbbf83',
  'b958fc25-b23b-5ea6-84ba-8e1364524753',
  'f17cd0b4-ce91-532f-b83f-c923500d2c23'
);
```
