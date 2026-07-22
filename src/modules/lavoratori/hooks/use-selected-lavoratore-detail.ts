import * as React from "react"

import { asLavoratoreRecord, asString } from "../lib/base-utils"
import type { GenericRow } from "../types"
import {
  fetchWorkerAddressesByIds,
  resolveWorkerAddress,
} from "../lib/worker-list-mapper"
import { fetchLavoratoreScheda } from "../queries/fetch-lavoratore-scheda"
import type { DocumentoLavoratoreRecord } from "../types/documento-lavoratore"
import type { EsperienzaLavoratoreRecord } from "../types/esperienza-lavoratore"
import type { LavoratoreRecord } from "../types/lavoratore"
import type { ReferenzaLavoratoreRecord } from "../types/referenza-lavoratore"

type UseSelectedLavoratoreDetailOptions = {
  selectedWorkerId: string | null
  workerAddressesById: Map<string, Record<string, unknown>[]>
  workerRowsRef: React.RefObject<LavoratoreRecord[]>
  setWorkerAddressesById: React.Dispatch<
    React.SetStateAction<Map<string, Record<string, unknown>[]>>
  >
  setWorkerRows: React.Dispatch<React.SetStateAction<LavoratoreRecord[]>>
}

export function useSelectedLavoratoreDetail({
  selectedWorkerId,
  workerAddressesById,
  workerRowsRef,
  setWorkerAddressesById,
  setWorkerRows,
}: UseSelectedLavoratoreDetailOptions) {
  const [selectedWorkerRow, setSelectedWorkerRow] =
    React.useState<LavoratoreRecord | null>(null)
  const [selectedWorkerExperiences, setSelectedWorkerExperiences] = React.useState<
    EsperienzaLavoratoreRecord[]
  >([])
  const [selectedWorkerDocuments, setSelectedWorkerDocuments] = React.useState<
    DocumentoLavoratoreRecord[]
  >([])
  const [selectedWorkerReferences, setSelectedWorkerReferences] = React.useState<
    ReferenzaLavoratoreRecord[]
  >([])
  const [selectedWorkerRelatedSearches, setSelectedWorkerRelatedSearches] = React.useState<
    GenericRow[]
  >([])
  const [realtimeTick, setRealtimeTick] = React.useState(0)
  const [loadingSelectedWorkerDocuments, setLoadingSelectedWorkerDocuments] =
    React.useState(false)
  const [loadingSelectedWorkerExperiences, setLoadingSelectedWorkerExperiences] =
    React.useState(false)
  const [loadingSelectedWorkerReferences, setLoadingSelectedWorkerReferences] =
    React.useState(false)
  const selectedWorkerAddressLoadAttemptsRef = React.useRef(new Set<string>())

  React.useEffect(() => {
    let isCancelled = false

    async function loadSelectedWorkerScheda() {
      if (!selectedWorkerId) {
        setSelectedWorkerRow(null)
        setSelectedWorkerDocuments([])
        setSelectedWorkerExperiences([])
        setSelectedWorkerReferences([])
        setSelectedWorkerRelatedSearches([])
        setLoadingSelectedWorkerDocuments(false)
        setLoadingSelectedWorkerExperiences(false)
        setLoadingSelectedWorkerReferences(false)
        return
      }

      const listRow =
        workerRowsRef.current.find((row) => row.id === selectedWorkerId) ?? null
      setSelectedWorkerRow(listRow)
      setLoadingSelectedWorkerDocuments(true)
      setLoadingSelectedWorkerExperiences(true)
      setLoadingSelectedWorkerReferences(true)

      try {
        const scheda = await fetchLavoratoreScheda(selectedWorkerId)
        if (isCancelled) return
        const detailRow = scheda.worker ? asLavoratoreRecord(scheda.worker) : listRow
        setSelectedWorkerRow(detailRow ?? null)
        setSelectedWorkerDocuments(scheda.documenti as DocumentoLavoratoreRecord[])
        setSelectedWorkerExperiences(scheda.esperienze as EsperienzaLavoratoreRecord[])
        setSelectedWorkerReferences(scheda.referenze as ReferenzaLavoratoreRecord[])
        setSelectedWorkerRelatedSearches(scheda.relatedSearches as GenericRow[])
      } catch {
        if (isCancelled) return
        setSelectedWorkerRow(listRow)
        setSelectedWorkerDocuments([])
        setSelectedWorkerExperiences([])
        setSelectedWorkerReferences([])
        setSelectedWorkerRelatedSearches([])
      } finally {
        if (!isCancelled) {
          setLoadingSelectedWorkerDocuments(false)
          setLoadingSelectedWorkerExperiences(false)
          setLoadingSelectedWorkerReferences(false)
        }
      }
    }

    void loadSelectedWorkerScheda()

    return () => {
      isCancelled = true
    }
  }, [selectedWorkerId, realtimeTick, workerRowsRef])

  const reloadSelectedWorkerScheda = React.useCallback(() => {
    setRealtimeTick((current) => current + 1)
  }, [])

  const selectedWorkerAddress = React.useMemo(
    () =>
      selectedWorkerId
        ? resolveWorkerAddress(selectedWorkerId, workerAddressesById)
        : null,
    [selectedWorkerId, workerAddressesById]
  )

  // Address bootstrap only — not a detail refetch (Pattern B).
  React.useEffect(() => {
    if (!selectedWorkerId || selectedWorkerAddress) return
    if (selectedWorkerAddressLoadAttemptsRef.current.has(selectedWorkerId)) return

    let isCancelled = false
    const workerId = selectedWorkerId
    selectedWorkerAddressLoadAttemptsRef.current.add(workerId)

    async function loadSelectedWorkerAddress() {
      const result = await fetchWorkerAddressesByIds([workerId])
      if (isCancelled) return
      const addresses = result.get(workerId)
      if (!addresses || addresses.length === 0) return

      setWorkerAddressesById((current) => {
        const next = new Map(current)
        next.set(workerId, addresses)
        return next
      })
    }

    void loadSelectedWorkerAddress().catch(() => {
      if (!isCancelled) selectedWorkerAddressLoadAttemptsRef.current.delete(workerId)
    })

    return () => {
      isCancelled = true
    }
    // eslint-disable-next-line no-restricted-syntax -- one-shot address load, not scheda refresh
  }, [selectedWorkerAddress, selectedWorkerId, setWorkerAddressesById])

  const applyUpdatedWorkerRow = React.useCallback(
    (nextRow: LavoratoreRecord) => {
      setSelectedWorkerRow((current) => (current?.id === nextRow.id ? nextRow : current))
      setWorkerRows((current) =>
        current.map((row) => (row.id === nextRow.id ? { ...row, ...nextRow } : row))
      )
    },
    [setWorkerRows]
  )

  const applyUpdatedWorkerAddress = React.useCallback(
    (nextAddress: Record<string, unknown>) => {
      const workerId = asString(nextAddress.entita_id)
      if (!workerId) return

      setWorkerAddressesById((current) => {
        const next = new Map(current)
        const addresses = next.get(workerId) ?? []
        const nextId = asString(nextAddress.id)
        const existingIndex = nextId
          ? addresses.findIndex((address) => asString(address.id) === nextId)
          : -1
        const nextAddresses =
          existingIndex === -1
            ? [nextAddress, ...addresses]
            : addresses.map((address, index) =>
                index === existingIndex ? nextAddress : address
              )
        next.set(workerId, nextAddresses)
        return next
      })
    },
    [setWorkerAddressesById]
  )

  const applyUpdatedWorkerExperience = React.useCallback(
    (nextRow: EsperienzaLavoratoreRecord) => {
      setSelectedWorkerExperiences((current) =>
        current.map((row) => (row.id === nextRow.id ? nextRow : row))
      )
    },
    []
  )

  const appendCreatedWorkerExperience = React.useCallback(
    (nextRow: EsperienzaLavoratoreRecord) => {
      setSelectedWorkerExperiences((current) => [nextRow, ...current])
    },
    []
  )

  const removeWorkerExperience = React.useCallback((experienceId: string) => {
    setSelectedWorkerExperiences((current) =>
      current.filter((row) => row.id !== experienceId)
    )
  }, [])

  const applyUpdatedWorkerReference = React.useCallback(
    (nextRow: ReferenzaLavoratoreRecord) => {
      setSelectedWorkerReferences((current) =>
        current.map((row) => (row.id === nextRow.id ? nextRow : row))
      )
    },
    []
  )

  const appendCreatedWorkerReference = React.useCallback(
    (nextRow: ReferenzaLavoratoreRecord) => {
      setSelectedWorkerReferences((current) => [nextRow, ...current])
    },
    []
  )

  const upsertSelectedWorkerDocument = React.useCallback(
    (nextRow: DocumentoLavoratoreRecord) => {
      setSelectedWorkerDocuments((current) => {
        const existingIndex = current.findIndex((row) => row.id === nextRow.id)
        if (existingIndex === -1) {
          return [nextRow, ...current]
        }

        return current.map((row) => (row.id === nextRow.id ? nextRow : row))
      })
    },
    []
  )

  return {
    selectedWorkerRow,
    selectedWorkerAddress,
    selectedWorkerDocuments,
    loadingSelectedWorkerDocuments,
    selectedWorkerExperiences,
    loadingSelectedWorkerExperiences,
    selectedWorkerReferences,
    loadingSelectedWorkerReferences,
    selectedWorkerRelatedSearches,
    reloadSelectedWorkerScheda,
    applyUpdatedWorkerRow,
    applyUpdatedWorkerAddress,
    applyUpdatedWorkerExperience,
    appendCreatedWorkerExperience,
    removeWorkerExperience,
    applyUpdatedWorkerReference,
    appendCreatedWorkerReference,
    upsertSelectedWorkerDocument,
  }
}
