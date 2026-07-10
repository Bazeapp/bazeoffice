export type RicercaBoardViewErrorProps = {
  error: string
}

export function RicercaBoardViewError({ error }: RicercaBoardViewErrorProps) {
  return (
    <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">
      Errore caricamento board ricerca: {error}
    </div>
  )
}
