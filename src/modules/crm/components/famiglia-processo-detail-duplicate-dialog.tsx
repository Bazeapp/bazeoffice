import { CopyIcon } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogActions,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

type FamigliaProcessoDetailDuplicateDialogProps = {
  disabled: boolean
  isDuplicating: boolean
  onConfirm: () => void
}

export function FamigliaProcessoDetailDuplicateDialog({
  disabled,
  isDuplicating,
  onConfirm,
}: FamigliaProcessoDetailDuplicateDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" disabled={disabled || isDuplicating}>
          <CopyIcon className="size-4" />
          {isDuplicating ? "Duplicazione…" : "Duplica ricerca"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle>Duplicare la ricerca?</AlertDialogTitle>
        <AlertDialogDescription>
          Verra creata una copia di questa ricerca con i relativi indirizzi.
          L'operazione non puo essere annullata automaticamente.
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogActions>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction variant="default" onClick={onConfirm}>
              Duplica ricerca
            </AlertDialogAction>
          </AlertDialogActions>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
