import type { SkillFieldConfig, SkillSectionConfig } from "../lib/skills-competenze"

export const SKILL_SECTIONS: SkillSectionConfig[] = [
  {
    title: "Pulizie",
    iconKey: "brush-cleaning",
    levelFields: [
      {
        field: "livello_pulizie",
        label: "Pulizie",
        domain: "lavoratori.livello_pulizie",
        type: "level",
      },
    ],
    choiceFields: [
      {
        field: "check_accetta_salire_scale_o_soffitti_alti",
        label: "Scale / soffitti alti",
        domain: "lavoratori.check_accetta_salire_scale_o_soffitti_alti",
        type: "choice",
      },
      {
        field: "compatibilita_famiglie_numerose",
        label: "Famiglie numerose",
        domain: "lavoratori.compatibilita_famiglie_numerose",
        type: "choice",
      },
      {
        field: "compatibilita_famiglie_molto_esigenti",
        label: "Famiglie molto esigenti",
        domain: "lavoratori.compatibilita_famiglie_molto_esigenti",
        type: "choice",
      },
      {
        field: "compatibilita_lavoro_con_datore_presente_in_casa",
        label: "Datore sempre presente",
        domain: "lavoratori.compatibilita_lavoro_con_datore_presente_in_casa",
        type: "choice",
      },
      {
        field: "compatibilita_con_case_di_grandi_dimensioni",
        label: "Case grandi (>200mq)",
        domain: "lavoratori.compatibilita_con_case_di_grandi_dimensioni",
        type: "choice",
      },
      {
        field: "compatibilita_con_elevata_autonomia_richiesta",
        label: "Totale autonomia",
        domain: "lavoratori.compatibilita_con_elevata_autonomia_richiesta",
        type: "choice",
      },
      {
        field: "compatibilita_con_contesti_pacati",
        label: "Contesti pacati",
        domain: "lavoratori.compatibilita_con_contesti_pacati",
        type: "choice",
      },
    ],
    choiceGroups: [
      {
        title: "Disponibilita",
        fields: ["check_accetta_salire_scale_o_soffitti_alti"],
      },
      {
        title: "Consigliata da Baze",
        fields: [
          "compatibilita_famiglie_numerose",
          "compatibilita_con_case_di_grandi_dimensioni",
        ],
      },
    ],
  },
  {
    title: "Stiro",
    iconKey: "shirt",
    levelFields: [
      {
        field: "livello_stiro",
        label: "Stiro",
        domain: "lavoratori.livello_stiro",
        type: "level",
      },
    ],
    choiceFields: [
      {
        field: "compatibilita_con_stiro_esigente",
        label: "Stiro ottimo richiesto",
        domain: "lavoratori.compatibilita_con_stiro_esigente",
        type: "choice",
      },
    ],
    choiceGroups: [
      {
        title: "Consigliata da Baze",
        fields: ["compatibilita_con_stiro_esigente"],
      },
    ],
  },
  {
    title: "Cucina",
    iconKey: "utensils",
    levelFields: [
      {
        field: "livello_cucina",
        label: "Cucina",
        domain: "lavoratori.livello_cucina",
        type: "level",
      },
    ],
    choiceFields: [
      {
        field: "compatibilita_con_cucina_strutturata",
        label: "Cucina strutturata",
        domain: "lavoratori.compatibilita_con_cucina_strutturata",
        type: "choice",
      },
    ],
    choiceGroups: [
      {
        title: "Consigliata da Baze",
        fields: ["compatibilita_con_cucina_strutturata"],
      },
    ],
  },
  {
    title: "Bambini",
    iconKey: "baby",
    levelFields: [
      {
        field: "livello_babysitting",
        label: "Babysitting",
        domain: "lavoratori.livello_babysitting",
        type: "level",
      },
    ],
    choiceFields: [
      {
        field: "check_accetta_babysitting_multipli_bambini",
        label: "Piu bambini",
        domain: "lavoratori.check_accetta_babysitting_multipli_bambini",
        type: "choice",
      },
      {
        field: "check_accetta_babysitting_neonati",
        label: "Neonati",
        domain: "lavoratori.check_accetta_babysitting_neonati",
        type: "choice",
      },
      {
        field: "compatibilita_babysitting_neonati",
        label: "Consigliata per neonati",
        domain: "lavoratori.compatibilita_babysitting_neonati",
        type: "choice",
      },
    ],
    choiceGroups: [
      {
        title: "Disponibilita",
        fields: [
          "check_accetta_babysitting_multipli_bambini",
          "check_accetta_babysitting_neonati",
        ],
      },
      {
        title: "Consigliata da Baze",
        fields: ["compatibilita_babysitting_neonati"],
      },
    ],
  },
  {
    title: "Animali",
    iconKey: "paw-print",
    levelFields: [
      {
        field: "livello_dogsitting",
        label: "Dogsitting",
        domain: "lavoratori.livello_dogsitting",
        type: "level",
      },
    ],
    choiceFields: [
      {
        field: "check_accetta_case_con_cani",
        label: "Case con cani",
        domain: "lavoratori.check_accetta_case_con_cani",
        type: "choice",
      },
      {
        field: "check_accetta_case_con_cani_grandi",
        label: "Case con cani grandi",
        domain: "lavoratori.check_accetta_case_con_cani_grandi",
        type: "choice",
      },
      {
        field: "check_accetta_case_con_gatti",
        label: "Case con gatti",
        domain: "lavoratori.check_accetta_case_con_gatti",
        type: "choice",
      },
      {
        field: "compatibilita_con_animali_in_casa",
        label: "Consigliata con animali",
        domain: "lavoratori.compatibilita_con_animali_in_casa",
        type: "choice",
      },
    ],
    choiceGroups: [
      {
        title: "Accetta",
        fields: [
          "check_accetta_case_con_cani",
          "check_accetta_case_con_cani_grandi",
          "check_accetta_case_con_gatti",
        ],
      },
      {
        title: "Consigliata da Baze",
        fields: ["compatibilita_con_animali_in_casa"],
      },
    ],
  },
  {
    title: "Giardinaggio",
    iconKey: "home",
    levelFields: [
      {
        field: "livello_giardinaggio",
        label: "Giardinaggio",
        domain: "lavoratori.livello_giardinaggio",
        type: "level",
      },
    ],
    choiceFields: [],
  },
  {
    title: "Generali",
    iconKey: "home",
    levelFields: [],
    choiceFields: [
      {
        field: "compatibilita_con_elevata_autonomia_richiesta",
        label: "Totale autonomia",
        domain: "lavoratori.compatibilita_con_elevata_autonomia_richiesta",
        type: "choice",
      },
      {
        field: "compatibilita_lavoro_con_datore_presente_in_casa",
        label: "Datore sempre presente",
        domain: "lavoratori.compatibilita_lavoro_con_datore_presente_in_casa",
        type: "choice",
      },
      {
        field: "compatibilita_famiglie_molto_esigenti",
        label: "Famiglie molto esigenti",
        domain: "lavoratori.compatibilita_famiglie_molto_esigenti",
        type: "choice",
      },
      {
        field: "compatibilita_con_contesti_pacati",
        label: "Contesti pacati",
        domain: "lavoratori.compatibilita_con_contesti_pacati",
        type: "choice",
      },
    ],
    choiceGroups: [
      {
        title: "Consigliata da Baze",
        fields: [
          "compatibilita_con_elevata_autonomia_richiesta",
          "compatibilita_lavoro_con_datore_presente_in_casa",
          "compatibilita_famiglie_molto_esigenti",
          "compatibilita_con_contesti_pacati",
        ],
      },
    ],
  },
]

const LANGUAGE_FIELDS: SkillFieldConfig[] = [
  {
    field: "livello_italiano",
    label: "Italiano",
    domain: "lavoratori.livello_italiano",
    type: "level",
  },
  {
    field: "livello_inglese",
    label: "Inglese",
    domain: "lavoratori.livello_inglese",
    type: "level",
  },
]

export const LANGUAGE_SECTION: SkillSectionConfig = {
  title: "Lingue",
  iconKey: "globe",
  levelFields: LANGUAGE_FIELDS,
  choiceFields: [],
}
