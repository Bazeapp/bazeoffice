import * as React from "react"

export type FamigliaProcessoEditBlock =
  | "statoLead"
  | "onboarding"
  | "annuncio"
  | "familyHeader"

export function useFamigliaProcessoEditMode({
  editMode,
  readOnly,
  isActive,
  cardId,
}: {
  editMode: "always" | "toggle"
  readOnly: boolean
  isActive: boolean
  cardId: string | null | undefined
}) {
  const [isEditingStatoLead, setIsEditingStatoLead] = React.useState(
    editMode === "always"
  )
  const [isEditingOnboarding, setIsEditingOnboarding] = React.useState(
    editMode === "always"
  )
  const [isEditingAnnuncio, setIsEditingAnnuncio] = React.useState(
    editMode === "always"
  )
  const [isEditingFamilyHeader, setIsEditingFamilyHeader] = React.useState(false)

  React.useEffect(() => {
    if (readOnly) {
      setIsEditingStatoLead(false)
      setIsEditingOnboarding(false)
      setIsEditingAnnuncio(false)
      setIsEditingFamilyHeader(false)
      return
    }

    if (editMode === "always") {
      setIsEditingStatoLead(true)
      setIsEditingOnboarding(true)
      setIsEditingAnnuncio(true)
      return
    }

    if (!isActive) {
      setIsEditingStatoLead(false)
      setIsEditingOnboarding(false)
      setIsEditingAnnuncio(false)
      setIsEditingFamilyHeader(false)
    }
  }, [cardId, editMode, isActive, readOnly])

  const toggleEdit = React.useCallback((block: FamigliaProcessoEditBlock) => {
    switch (block) {
      case "statoLead":
        setIsEditingStatoLead((current) => !current)
        break
      case "onboarding":
        setIsEditingOnboarding((current) => !current)
        break
      case "annuncio":
        setIsEditingAnnuncio((current) => !current)
        break
      case "familyHeader":
        setIsEditingFamilyHeader((current) => !current)
        break
    }
  }, [])

  const setEditingOnboarding = React.useCallback((value: boolean) => {
    setIsEditingOnboarding(value)
  }, [])

  const canEditStatoLead =
    !readOnly && (editMode === "always" ? true : isEditingStatoLead)
  const canEditOnboarding =
    !readOnly && (editMode === "always" ? true : isEditingOnboarding)
  const canEditAnnuncio =
    !readOnly && (editMode === "always" ? true : isEditingAnnuncio)

  return {
    isEditingFamilyHeader,
    canEditStatoLead,
    canEditOnboarding,
    canEditAnnuncio,
    toggleEdit,
    setEditingOnboarding,
  }
}
