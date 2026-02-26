# Supabase Edge Functions

Funzioni presenti:
- `table-query`
- `lookup-values`

Deploy da questa repo (dopo `supabase login` e `supabase link --project-ref ...`):

```bash
supabase functions deploy table-query
supabase functions deploy lookup-values
```

Variabili richieste in Supabase (Function Secrets):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
