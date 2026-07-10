import * as React from "react"
import { toast } from "sonner"
import { AlertTriangleIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FieldDescription, FieldLabel } from "@/components/ui/field"
import { Form } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  NEW_WORKER_EXPERIENCE_FORM_DEFAULTS,
  newWorkerExperienceFormSchema,
  newWorkerReferenceFormSchema,
  type NewWorkerExperienceFormValues,
  type NewWorkerReferenceFormValues,
} from "../lib/worker-creation-schemas"
import type { LookupOption } from "../lib/experience-references"
import type { EsperienzaLavoratoreRecord } from "../types/esperienza-lavoratore"
import type { ReferenzaLavoratoreRecord } from "../types/referenza-lavoratore"
import {
  ExperienceFormDataFineError,
  ExperienceReferencesFormBody,
} from "./experience-references-forms"

type AddReferenceActionProps = {
  experience: EsperienzaLavoratoreRecord
  disabled: boolean
  onReferenceCreate: (
    values: Partial<ReferenzaLavoratoreRecord>,
  ) => Promise<void> | void
}

export function AddReferenceAction({
  experience,
  disabled,
  onReferenceCreate,
}: AddReferenceActionProps) {
  const [open, setOpen] = React.useState(false)
  const form = useForm<NewWorkerReferenceFormValues>({
    resolver: zodResolver(newWorkerReferenceFormSchema),
    defaultValues: {
      nome_datore: "",
      cognome_datore: "",
      telefono_datore: "",
    },
  })

  const resetAndClose = React.useCallback(() => {
    form.reset()
    setOpen(false)
  }, [form])

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen)
      if (!nextOpen) form.reset()
    },
    [form],
  )

  const onSubmit = form.handleSubmit(async (values) => {
    const nome = values.nome_datore.trim()
    const cognome = values.cognome_datore.trim()
    const telefono = values.telefono_datore.trim()

    await onReferenceCreate({
      esperienza_lavoratore_id: experience.id,
      lavoratore_id: experience.lavoratore_id,
      referenza_verificata: "Referenza da richiedere",
      nome_datore: nome || null,
      cognome_datore: cognome || null,
      telefono_datore: telefono,
      ruolo:
        Array.isArray(experience.tipo_lavoro) && experience.tipo_lavoro.length > 0
          ? experience.tipo_lavoro
          : null,
    })

    resetAndClose()
  })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        <PlusIcon />
        Aggiungi referenza
      </Button>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuova referenza</DialogTitle>
          <DialogDescription>
            Inserisci il telefono e almeno uno tra nome e cognome.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <FieldLabel>Nome</FieldLabel>
              <Input
                {...form.register("nome_datore")}
                disabled={disabled}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>Cognome</FieldLabel>
              <Input
                {...form.register("cognome_datore")}
                disabled={disabled}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>Telefono</FieldLabel>
              <Input
                {...form.register("telefono_datore")}
                type="tel"
                disabled={disabled}
                className="w-full"
              />
            </div>
            {form.formState.errors.nome_datore?.message ||
            form.formState.errors.telefono_datore?.message ? (
              <FieldDescription className="text-destructive">
                {form.formState.errors.nome_datore?.message ??
                  form.formState.errors.telefono_datore?.message}
              </FieldDescription>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetAndClose}>
                Annulla
              </Button>
              <Button type="submit" disabled={disabled}>
                Aggiungi referenza
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

type AddExperienceActionProps = {
  workerId: string | null
  disabled: boolean
  experienceTipoLavoroOptions: LookupOption[]
  experienceTipoRapportoOptions: LookupOption[]
  onExperienceCreate: (
    values: Partial<EsperienzaLavoratoreRecord>,
  ) => Promise<void> | void
}

export function AddExperienceAction({
  workerId,
  disabled,
  experienceTipoLavoroOptions,
  experienceTipoRapportoOptions,
  onExperienceCreate,
}: AddExperienceActionProps) {
  const [open, setOpen] = React.useState(false)
  const form = useForm<NewWorkerExperienceFormValues>({
    resolver: zodResolver(newWorkerExperienceFormSchema),
    defaultValues: NEW_WORKER_EXPERIENCE_FORM_DEFAULTS,
  })

  const resetAndClose = React.useCallback(() => {
    form.reset(NEW_WORKER_EXPERIENCE_FORM_DEFAULTS)
    setOpen(false)
  }, [form])

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen)
      if (!nextOpen) form.reset(NEW_WORKER_EXPERIENCE_FORM_DEFAULTS)
    },
    [form],
  )

  const onSubmit = form.handleSubmit(async (values) => {
    await onExperienceCreate({
      lavoratore_id: workerId,
      tipo_lavoro: values.tipo_lavoro.length > 0 ? values.tipo_lavoro : null,
      tipo_rapporto: values.tipo_rapporto || null,
      data_inizio: values.data_inizio || null,
      data_fine: values.stato_esperienza_attiva ? null : values.data_fine || null,
      stato_esperienza_attiva: values.stato_esperienza_attiva,
      descrizione: values.descrizione.trim() || null,
      descrizione_contesto_lavorativo:
        values.descrizione_contesto_lavorativo.trim() || null,
      motivazione_fine_rapporto: values.stato_esperienza_attiva
        ? null
        : values.motivazione_fine_rapporto.trim() || null,
    })

    resetAndClose()
  })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button
        type="button"
        variant="outline"
        size="default"
        aria-label="Aggiungi esperienza"
        title="Aggiungi esperienza"
        className="h-10 px-4 text-sm"
        onClick={() => setOpen(true)}
        disabled={disabled || !workerId}
      >
        <PlusIcon />
        Aggiungi esperienza
      </Button>

      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Nuova esperienza</DialogTitle>
          <DialogDescription>
            Inserisci i dettagli dell&apos;esperienza lavorativa del lavoratore.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={onSubmit}>
            <ExperienceReferencesFormBody
              disabled={disabled}
              experienceTipoLavoroOptions={experienceTipoLavoroOptions}
              experienceTipoRapportoOptions={experienceTipoRapportoOptions}
            />
            <ExperienceFormDataFineError />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetAndClose}>
                Annulla
              </Button>
              <Button type="submit" disabled={disabled || !workerId}>
                Aggiungi esperienza
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export function DeleteExperienceAction({
  disabled,
  onDelete,
}: {
  disabled: boolean
  onDelete: () => Promise<void> | void
}) {
  const [open, setOpen] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await toast.promise(Promise.resolve(onDelete()), {
        loading: "Eliminazione esperienza in corso…",
        success: "Esperienza eliminata",
        error: "Errore durante l'eliminazione dell'esperienza",
      }).unwrap()
      setOpen(false)
    } catch {
      // l'errore è già notificato dal toast
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
        aria-label="Elimina esperienza"
        title="Elimina esperienza"
        className="text-destructive hover:text-destructive"
      >
        <Trash2Icon className="size-4" />
      </Button>
      <AlertDialogContent>
        <div className="space-y-2 text-left">
          <div className="bg-destructive/10 text-destructive flex size-9 items-center justify-center rounded-full">
            <AlertTriangleIcon className="size-4" />
          </div>
          <AlertDialogTitle>Eliminare questa esperienza?</AlertDialogTitle>
          <AlertDialogDescription>
            L&apos;esperienza verrà rimossa dal profilo del lavoratore. Se ci
            sono referenze collegate a questa esperienza, verranno eliminate
            insieme all&apos;esperienza. Questa azione non è reversibile.
          </AlertDialogDescription>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Annulla</AlertDialogCancel>
          <AlertDialogAction
            disabled={deleting}
            onClick={(event) => {
              event.preventDefault()
              void handleDelete()
            }}
          >
            Elimina esperienza
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
