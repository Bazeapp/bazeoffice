# Supabase Edge Functions

Funzioni presenti:
- `table-query`
- `lookup-values`
- `update-record`
- `update-process-stato-sales`
- `create-record`
- `run-automation-webhook`

Deploy da questa repo (dopo `supabase login` e `supabase link --project-ref ...`):

```bash
supabase functions deploy table-query
supabase functions deploy lookup-values
supabase functions deploy update-record
supabase functions deploy update-process-stato-sales
supabase functions deploy create-record
supabase functions deploy run-automation-webhook
```

Variabili richieste in Supabase (Function Secrets):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
