# Supabase Edge Functions

Funzioni presenti:
- `table-query`
- `lookup-values`
- `update-record`
- `update-process-stato-sales`
- `create-record`
- `delete-record`
- `run-automation-webhook`
- `create-stripe-connect-account`

Deploy da questa repo (dopo `supabase login` e `supabase link --project-ref ...`):

```bash
supabase functions deploy table-query
supabase functions deploy lookup-values
supabase functions deploy update-record
supabase functions deploy update-process-stato-sales
supabase functions deploy create-record
supabase functions deploy delete-record
supabase functions deploy run-automation-webhook
supabase functions deploy create-stripe-connect-account
```

Variabili richieste in Supabase (Function Secrets):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_CONNECT_SECRET_KEY` o `STRIPE_SECRET_KEY` per `create-stripe-connect-account`

GitHub Actions:
- `.github/workflows/deploy-supabase-functions.yml` deploya le funzioni su push a `main` quando cambiano file in `supabase/functions/**`.
- Secrets richiesti nel repository GitHub: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`.
