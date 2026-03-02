# Supabase Edge Functions

Funzioni presenti:
- `table-query`
- `lookup-values`
- `update-record`
- `update-process-stato-sales`

Deploy da questa repo (dopo `supabase login` e `supabase link --project-ref ...`):

```bash
supabase functions deploy table-query
supabase functions deploy lookup-values
supabase functions deploy update-record
supabase functions deploy update-process-stato-sales
```

Variabili richieste in Supabase (Function Secrets):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
