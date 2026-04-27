import * as React from "react"
import { toast } from "sonner"

import {
  type SupportTicketTag,
  getSupportTicketTagsForType,
  resolveSupportTicketTag,
  SUPPORT_TICKET_URGENCIES,
  type SupportTicketType,
  type SupportTicketUrgency,
} from "@/components/support/support-ticket-config"
import { Button } from "@/components/ui-next/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui-next/dialog"
import { Label } from "@/components/ui-next/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui-next/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui-next/select"
import { Textarea } from "@/components/ui-next/textarea"

type SupportTicketCreateDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultTicketType: SupportTicketType
  rapportoOptions: Array<{ id: string; label: string }>
  onCreateTicket: (input: {
    tipo: SupportTicketType
    rapportoId: string
    tag: SupportTicketTag
    urgenza: SupportTicketUrgency
    causale: string
    note: string
  }) => Promise<void>
}

export function SupportTicketCreateDialog({
  open,
  onOpenChange,
  defaultTicketType,
  rapportoOptions,
  onCreateTicket,
}: SupportTicketCreateDialogProps) {
  const [ticketType, setTicketType] = React.useState<SupportTicketType>(defaultTicketType)
  const [rapportoId, setRapportoId] = React.useState("")
  const [tag, setTag] = React.useState<SupportTicketTag | "">("")
  const [urgenza, setUrgenza] = React.useState<SupportTicketUrgency | "">("")
  const [note, setNote] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const availableTags = React.useMemo(() => getSupportTicketTagsForType(ticketType), [ticketType])
  const canSubmit = Boolean(rapportoId && tag && urgenza && note.trim())

  const reset = React.useCallback(() => {
    setTicketType(defaultTicketType)
    setRapportoId("")
    setTag("")
    setUrgenza("")
    setNote("")
    setIsSubmitting(false)
  }, [defaultTicketType])

  React.useEffect(() => {
    if (!open) {
      reset()
      return
    }

    setTicketType(defaultTicketType)
  }, [defaultTicketType, open, reset])

  React.useEffect(() => {
    if (!tag) return

    const tagStillAvailable = availableTags.some((item) => item.id === tag)
    if (!tagStillAvailable) setTag("")
  }, [availableTags, tag])

  async function handleSubmit() {
    if (!canSubmit || !tag || !urgenza) return

    setIsSubmitting(true)
    try {
      await onCreateTicket({
        tipo: ticketType,
        rapportoId,
        tag,
        urgenza,
        causale: note.trim(),
        note: note.trim(),
      })

      toast.success("Ticket aperto con successo")
      onOpenChange(false)
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Errore aprendo ticket"
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Apri un ticket</DialogTitle>
          <DialogDescription>
            Compila i campi principali per aprire un nuovo ticket di supporto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label>
              Tipologia <span className="text-destructive">*</span>
            </Label>
            <RadioGroup
              value={ticketType}
              onValueChange={(value) => setTicketType(value as SupportTicketType)}
              className="flex flex-wrap gap-4"
            >
              {(["Customer", "Payroll"] as SupportTicketType[]).map((item) => (
                <label
                  key={item}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <RadioGroupItem value={item} />
                  <span>{item}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>
              Rapporto lavorativo <span className="text-destructive">*</span>
            </Label>
            <Select value={rapportoId} onValueChange={setRapportoId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona rapporto lavorativo" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {rapportoOptions.map((rapporto) => (
                  <SelectItem key={rapporto.id} value={rapporto.id}>
                    {rapporto.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>
              Categoria <span className="text-destructive">*</span>
            </Label>
            <Select value={tag} onValueChange={(value) => setTag(value as SupportTicketTag)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona categoria" />
              </SelectTrigger>
              <SelectContent>
                {availableTags.map((item) => {
                  const config = resolveSupportTicketTag(item.id)
                  const Icon = config.icon
                  return (
                    <SelectItem key={item.id} value={item.id}>
                      <div className="flex items-center gap-2">
                        <Icon className="size-4" />
                        <span>{config.label}</span>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>
              Urgenza <span className="text-destructive">*</span>
            </Label>
            <RadioGroup
              value={urgenza}
              onValueChange={(value) => setUrgenza(value as SupportTicketUrgency)}
              className="flex flex-wrap gap-4"
            >
              {SUPPORT_TICKET_URGENCIES.map((item) => (
                <label
                  key={item.id}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <RadioGroupItem value={item.id} />
                  <span>{item.label}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>
              Descrizione <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Spiega il problema e cosa bisogna fare per risolverlo."
              className="min-h-28 resize-none"
              maxLength={1000}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Annulla
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? "Apertura..." : "Apri ticket"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
