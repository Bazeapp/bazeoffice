import * as React from "react"
import { Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogActions,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

interface DeleteRecordActionProps {
  title: string
  description: React.ReactNode
  toastMessages?: {
    loading?: string
    success?: string
    error?: string
  }
  disabled?: boolean
  onDelete: () => Promise<void> | void
}

/**
 * Papelera con AlertDialog de confirmación obligatoria (checkbox).
 * Reutilizable en cualquier detail sheet / panel que necesite hard-delete.
 *
 * Patrón tomado de DeleteExperienceAction en experience-references-card.tsx.
 */
export function DeleteRecordAction({
  title,
  description,
  toastMessages,
  disabled = false,
  onDelete,
}: DeleteRecordActionProps) {
  const [open, setOpen] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)

  const loading = toastMessages?.loading ?? "Eliminazione in corso…"
  const success = toastMessages?.success ?? "Record eliminato"
  const error = toastMessages?.error ?? "Errore durante l'eliminazione"

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await toast.promise(Promise.resolve(onDelete()), {
        loading,
        success,
        error,
      })
      setOpen(false)
    } catch {
      // error already notified by toast
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setOpen(true)
        }}
        disabled={disabled}
        aria-label="Elimina record"
      >
        <Trash2Icon className="size-4 text-danger" />
      </Button>
      <AlertDialogContent icon={<Trash2Icon className="size-4" />} tone="danger">
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogActions>
            <AlertDialogCancel disabled={deleting}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              requireConfirmation
              confirmationLabel="Confermo, eliminare definitivamente"
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault()
                void handleDelete()
              }}
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogActions>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
