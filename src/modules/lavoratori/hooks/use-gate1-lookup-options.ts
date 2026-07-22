import * as React from "react";

import { useProvincieOptions } from "@/hooks/use-provincie";

type LookupOption = { label: string; value: string };

type UseGate1LookupOptionsParams = {
  lookupOptionsByDomain: Map<string, LookupOption[]>;
  allowCertifiedStatus: boolean;
};

/** Pure lookup-option derivation for Gate 1 detail cards. */
export function useGate1LookupOptions({
  lookupOptionsByDomain,
  allowCertifiedStatus,
}: UseGate1LookupOptionsParams) {
  const documentiInRegolaOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.documenti_in_regola") ?? [],
    [lookupOptionsByDomain],
  );
  const documentiVerificatiOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get("lavoratori.stato_verifica_documenti") ?? [],
    [lookupOptionsByDomain],
  );
  const haiReferenzeOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.hai_referenze") ?? [],
    [lookupOptionsByDomain],
  );
  const disponibilitaLookupOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.disponibilita") ?? [],
    [lookupOptionsByDomain],
  );
  const provinciaLookupOptions = useProvincieOptions();
  const sessoLookupOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.sesso") ?? [],
    [lookupOptionsByDomain],
  );
  const nazionalitaLookupOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.nazionalita") ?? [],
    [lookupOptionsByDomain],
  );
  const mobilityLookupOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.come_ti_sposti") ?? [],
    [lookupOptionsByDomain],
  );
  const tipoLavoroDomesticoOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.tipo_lavoro_domestico") ?? [],
    [lookupOptionsByDomain],
  );
  const tipoRapportoLavorativoOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get("lavoratori.tipo_rapporto_lavorativo") ?? [],
    [lookupOptionsByDomain],
  );
  const lavoriAccettabiliOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get("lavoratori.check_lavori_accettabili") ?? [],
    [lookupOptionsByDomain],
  );
  const disponibilitaNelGiornoOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get("lavoratori.disponibilita_nel_giorno") ?? [],
    [lookupOptionsByDomain],
  );
  const babysittingNeonatiOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get(
        "lavoratori.check_accetta_babysitting_neonati",
      ) ?? [],
    [lookupOptionsByDomain],
  );
  const babysittingMultipliBambiniOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get(
        "lavoratori.check_accetta_babysitting_multipli_bambini",
      ) ?? [],
    [lookupOptionsByDomain],
  );
  const caseConCaniOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get("lavoratori.check_accetta_case_con_cani") ?? [],
    [lookupOptionsByDomain],
  );
  const caseConCaniGrandiOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get(
        "lavoratori.check_accetta_case_con_cani_grandi",
      ) ?? [],
    [lookupOptionsByDomain],
  );
  const caseConGattiOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get("lavoratori.check_accetta_case_con_gatti") ??
      [],
    [lookupOptionsByDomain],
  );
  const scaleSoffittiOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get(
        "lavoratori.check_accetta_salire_scale_o_soffitti_alti",
      ) ?? [],
    [lookupOptionsByDomain],
  );
  const trasfertaOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get(
        "lavoratori.check_accetta_lavori_con_trasferta",
      ) ?? [],
    [lookupOptionsByDomain],
  );
  const livelloItalianoOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.livello_italiano") ?? [],
    [lookupOptionsByDomain],
  );
  const livelloIngleseOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.livello_inglese") ?? [],
    [lookupOptionsByDomain],
  );
  const livelloCucinaOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.livello_cucina") ?? [],
    [lookupOptionsByDomain],
  );
  const livelloStiroOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.livello_stiro") ?? [],
    [lookupOptionsByDomain],
  );
  const livelloPulizieOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.livello_pulizie") ?? [],
    [lookupOptionsByDomain],
  );
  const livelloBabysittingOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.livello_babysitting") ?? [],
    [lookupOptionsByDomain],
  );
  const livelloDogsittingOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.livello_dogsitting") ?? [],
    [lookupOptionsByDomain],
  );
  const livelloGiardinaggioOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.livello_giardinaggio") ?? [],
    [lookupOptionsByDomain],
  );
  const compatibilitaStiroOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get(
        "lavoratori.compatibilita_con_stiro_esigente",
      ) ?? [],
    [lookupOptionsByDomain],
  );
  const compatibilitaCucinaOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get(
        "lavoratori.compatibilita_con_cucina_strutturata",
      ) ?? [],
    [lookupOptionsByDomain],
  );
  const compatibilitaNeonatiOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get(
        "lavoratori.compatibilita_babysitting_neonati",
      ) ?? [],
    [lookupOptionsByDomain],
  );
  const compatibilitaFamiglieNumeroseOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get("lavoratori.compatibilita_famiglie_numerose") ??
      [],
    [lookupOptionsByDomain],
  );
  const compatibilitaFamiglieMoltoEsigentiOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get(
        "lavoratori.compatibilita_famiglie_molto_esigenti",
      ) ?? [],
    [lookupOptionsByDomain],
  );
  const compatibilitaDatorePresenteOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get(
        "lavoratori.compatibilita_lavoro_con_datore_presente_in_casa",
      ) ?? [],
    [lookupOptionsByDomain],
  );
  const compatibilitaCaseGrandiOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get(
        "lavoratori.compatibilita_con_case_di_grandi_dimensioni",
      ) ?? [],
    [lookupOptionsByDomain],
  );
  const compatibilitaAnimaliOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get(
        "lavoratori.compatibilita_con_animali_in_casa",
      ) ?? [],
    [lookupOptionsByDomain],
  );
  const compatibilitaAutonomiaOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get(
        "lavoratori.compatibilita_con_elevata_autonomia_richiesta",
      ) ?? [],
    [lookupOptionsByDomain],
  );
  const compatibilitaContestiPacatiOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get(
        "lavoratori.compatibilita_con_contesti_pacati",
      ) ?? [],
    [lookupOptionsByDomain],
  );
  const ratingCorporaturaOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get("lavoratori.rating_corporatura") ?? [
        {
          label: "Abile a svolgere qualsiasi lavoro",
          value: "abile_qualsiasi_lavoro",
        },
        {
          label: "Abile a svolgere attivita con intensita media",
          value: "abile_intensita_media",
        },
        {
          label: "Abile a svolgere attivita con carichi di lavoro limitati",
          value: "abile_carichi_limitati",
        },
        {
          label: "Non idonea",
          value: "non_idonea",
        },
      ],
    [lookupOptionsByDomain],
  );
  const experienceTipoLavoroOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get("esperienze_lavoratori.tipo_lavoro") ??
      tipoLavoroDomesticoOptions,
    [lookupOptionsByDomain, tipoLavoroDomesticoOptions],
  );
  const experienceTipoRapportoOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get("esperienze_lavoratori.tipo_rapporto") ?? [],
    [lookupOptionsByDomain],
  );
  const referenceStatusOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get("referenze_lavoratori.referenza_verificata") ??
      [],
    [lookupOptionsByDomain],
  );
  const statoLavoratoreOptions = React.useMemo(() => {
    const options =
      lookupOptionsByDomain.get("lavoratori.stato_lavoratore") ?? [];
    if (allowCertifiedStatus) return options;
    return options.filter(
      (option) =>
        option.label.trim().toLowerCase() !== "certificato" &&
        option.value.trim().toLowerCase() !== "certificato",
    );
  }, [allowCertifiedStatus, lookupOptionsByDomain]);
  const motivazioniNonIdoneoOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.motivazione_non_idoneo") ?? [],
    [lookupOptionsByDomain],
  );
  const motivazioniNonIdoneoOptionsByValue = React.useMemo(() => {
    const optionsMap = new Map<string, LookupOption>();
    for (const option of motivazioniNonIdoneoOptions) {
      optionsMap.set(option.value, option);
    }
    return optionsMap;
  }, [motivazioniNonIdoneoOptions]);
  const getMotivazioneLabel = React.useCallback(
    (value: string) =>
      motivazioniNonIdoneoOptionsByValue.get(value)?.label ?? value,
    [motivazioniNonIdoneoOptionsByValue],
  );
  const followupStatusOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get("lavoratori.followup_chiamata_idoneita") ?? [],
    [lookupOptionsByDomain],
  );
  const funzionamentoBazeOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get(
        "lavoratori.check_accetta_funzionamento_baze",
      ) ?? [
        { label: "Non accetta", value: "non_accetta" },
        { label: "Accetta", value: "accetta" },
      ],
    [lookupOptionsByDomain],
  );
  const multipliContrattiOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get(
        "lavoratori.check_accetta_multipli_contratti",
      ) ?? [],
    [lookupOptionsByDomain],
  );
  const paga9Options = React.useMemo(
    () =>
      lookupOptionsByDomain.get("lavoratori.check_accetta_paga_9_euro_netti") ??
      [],
    [lookupOptionsByDomain],
  );

  return {
    babysittingMultipliBambiniOptions,
    babysittingNeonatiOptions,
    caseConCaniGrandiOptions,
    caseConCaniOptions,
    caseConGattiOptions,
    compatibilitaAnimaliOptions,
    compatibilitaAutonomiaOptions,
    compatibilitaCaseGrandiOptions,
    compatibilitaContestiPacatiOptions,
    compatibilitaCucinaOptions,
    compatibilitaDatorePresenteOptions,
    compatibilitaFamiglieMoltoEsigentiOptions,
    compatibilitaFamiglieNumeroseOptions,
    compatibilitaNeonatiOptions,
    compatibilitaStiroOptions,
    disponibilitaLookupOptions,
    disponibilitaNelGiornoOptions,
    documentiInRegolaOptions,
    documentiVerificatiOptions,
    experienceTipoLavoroOptions,
    experienceTipoRapportoOptions,
    followupStatusOptions,
    funzionamentoBazeOptions,
    getMotivazioneLabel,
    haiReferenzeOptions,
    lavoriAccettabiliOptions,
    livelloBabysittingOptions,
    livelloCucinaOptions,
    livelloDogsittingOptions,
    livelloGiardinaggioOptions,
    livelloIngleseOptions,
    livelloItalianoOptions,
    livelloPulizieOptions,
    livelloStiroOptions,
    mobilityLookupOptions,
    motivazioniNonIdoneoOptions,
    multipliContrattiOptions,
    nazionalitaLookupOptions,
    paga9Options,
    provinciaLookupOptions,
    ratingCorporaturaOptions,
    referenceStatusOptions,
    scaleSoffittiOptions,
    sessoLookupOptions,
    statoLavoratoreOptions,
    tipoLavoroDomesticoOptions,
    tipoRapportoLavorativoOptions,
    trasfertaOptions,
  };
}
