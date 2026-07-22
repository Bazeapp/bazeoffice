import * as React from "react";
import { useController } from "react-hook-form";

import { useAutoSaveForm } from "@/hooks/use-auto-save-form";
import {
  buildGateFieldsDefaults,
  createGateFieldsOnSave,
  type GateFieldsSaveDeps,
} from "../lib/gate-fields-form";
import type { GateDraft } from "../lib/gate-draft";
import type { GateFieldsFormDraft } from "../types/gate1-view";
import type { LavoratoreRecord } from "../types/lavoratore";

type UseGateFieldsFormParams = {
  selectedWorkerId: string | null;
  selectedWorkerRow: LavoratoreRecord | null;
  selectedWorkerAddress: Record<string, unknown> | null;
  lookupOptionsByDomain: Map<string, Array<{ label: string; value: string }>>;
  resolvedIban: string;
  setGateDraft: React.Dispatch<React.SetStateAction<GateDraft>>;
} & Omit<GateFieldsSaveDeps, "setGateDraft">;

export function useGateFieldsForm({
  selectedWorkerId,
  selectedWorkerRow,
  selectedWorkerAddress,
  lookupOptionsByDomain,
  resolvedIban,
  setGateDraft,
  setAvailabilityDraft,
  setAddressDraft,
  setJobSearchDraft,
  setSkillsDraft,
  setAvailabilityStatusDraft,
  setDocumentsDraft,
  patchSelectedWorkerField,
  patchSkillsField,
  patchWorkerAvailabilityStatus,
  patchDocumentField,
  commitAddressField,
  patchWorkerAddressField,
}: UseGateFieldsFormParams) {
  const onSave = React.useMemo(
    () =>
      createGateFieldsOnSave({
        setAvailabilityDraft,
        setAddressDraft,
        setJobSearchDraft,
        setSkillsDraft,
        setAvailabilityStatusDraft,
        setDocumentsDraft,
        setGateDraft,
        patchSelectedWorkerField,
        patchSkillsField,
        patchWorkerAvailabilityStatus,
        patchDocumentField,
        commitAddressField,
        patchWorkerAddressField,
      }),
    [
      setAvailabilityDraft,
      setAddressDraft,
      setJobSearchDraft,
      setSkillsDraft,
      setAvailabilityStatusDraft,
      setDocumentsDraft,
      setGateDraft,
      patchSelectedWorkerField,
      patchSkillsField,
      patchWorkerAvailabilityStatus,
      patchDocumentField,
      commitAddressField,
      patchWorkerAddressField,
    ],
  );

  const gateFieldsForm = useAutoSaveForm<GateFieldsFormDraft>({
    defaults: buildGateFieldsDefaults({
      selectedWorkerRow,
      selectedWorkerAddress,
      lookupOptionsByDomain,
      resolvedIban,
    }),
    // Hard-reset al cambio lavoratore: altrimenti keepDirtyValues tiene gli
    // edit del record precedente sulla scheda del successivo.
    resetKey: selectedWorkerId,
    onSave,
  });

  const anniColfCtrl = useController({
    name: "anni_esperienza_colf",
    control: gateFieldsForm.control,
  });
  const anniBadanteCtrl = useController({
    name: "anni_esperienza_badante",
    control: gateFieldsForm.control,
  });
  const anniBabysitterCtrl = useController({
    name: "anni_esperienza_babysitter",
    control: gateFieldsForm.control,
  });
  const descrizioneCtrl = useController({
    name: "descrizione_pubblica",
    control: gateFieldsForm.control,
  });
  const naspiDocCtrl = useController({
    name: "data_scadenza_naspi_doc",
    control: gateFieldsForm.control,
  });
  const ibanCtrl = useController({
    name: "iban",
    control: gateFieldsForm.control,
  });
  const nomeCtrl = useController({
    name: "nome",
    control: gateFieldsForm.control,
  });
  const cognomeCtrl = useController({
    name: "cognome",
    control: gateFieldsForm.control,
  });
  const emailCtrl = useController({
    name: "email",
    control: gateFieldsForm.control,
  });
  const telefonoCtrl = useController({
    name: "telefono",
    control: gateFieldsForm.control,
  });
  const dataNascitaCtrl = useController({
    name: "data_di_nascita",
    control: gateFieldsForm.control,
  });

  return {
    gateFieldsForm,
    anniColfCtrl,
    anniBadanteCtrl,
    anniBabysitterCtrl,
    descrizioneCtrl,
    naspiDocCtrl,
    ibanCtrl,
    nomeCtrl,
    cognomeCtrl,
    emailCtrl,
    telefonoCtrl,
    dataNascitaCtrl,
    anniEsperienzaColfValue: anniColfCtrl.field.value,
    anniEsperienzaBadanteValue: anniBadanteCtrl.field.value,
    anniEsperienzaBabysitterValue: anniBabysitterCtrl.field.value,
    descrizionePubblicaValue: descrizioneCtrl.field.value,
    naspiDocValue: naspiDocCtrl.field.value,
    ibanValue: ibanCtrl.field.value,
    headerNomeValue: nomeCtrl.field.value,
    headerCognomeValue: cognomeCtrl.field.value,
    headerEmailValue: emailCtrl.field.value,
    headerTelefonoValue: telefonoCtrl.field.value,
    headerDataNascitaValue: dataNascitaCtrl.field.value,
  };
}
