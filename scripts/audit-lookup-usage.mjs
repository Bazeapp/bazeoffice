import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SOURCE_ROOTS = ["src/components", "src/hooks", "src/features"];

const EXTENSIONS = new Set([".ts", ".tsx"]);

const PATTERNS = [
  {
    id: "select-item-option-value",
    regex: /<SelectItem\b[^\n]*(value=\{option\.(?:value|valueKey)\})/,
  },
  {
    id: "radio-option-value",
    regex: /<RadioGroupItem\b[^\n]*(value=\{option\.(?:value|valueKey)\})/,
  },
  {
    id: "checkbox-option-value",
    regex: /\.includes\(option\.(?:value|valueKey)\)|\.includes\(previous\.valueKey\)/,
  },
  {
    id: "direct-lookup-patch",
    regex:
      /(onPatchProcess|patchProcess|onPatchField|patchSelectedWorkerField|updateRapporto|patchWorkerAvailabilityStatus)\([^;\n]*(?:next|value)(?:\s*\|\|\s*null)?/,
  },
];

const REVIEWED_PATHS = new Map([
  [
    "src/components/data-table/data-table-filter-builder.tsx",
    "filter UI; table-query expands lookup key/label aliases",
  ],
  [
    "src/components/anagrafiche/anagrafiche-query-builder.tsx",
    "filter UI; table-query expands lookup key/label aliases",
  ],
  [
    "src/components/anagrafiche/anagrafiche-tables-view.tsx",
    "anagrafiche grouping/filter UI, not persisted lookup edit",
  ],
  [
    "src/components/gestione-contrattuale/assunzioni-detail-sheet.tsx",
    "uses lookup key for Select.value and label for save",
  ],
  [
    "src/components/prove-colloqui/prove-colloqui-view.tsx",
    "lookup selects normalized with getLookupSelectValue/getLookupLabelForSave",
  ],
  [
    "src/components/ricerca/selection-details-card.tsx",
    "lookup selects normalized with getLookupSelectValue/getLookupLabelForSave",
  ],
  [
    "src/components/ricerca/scheda-colloquio-panel.tsx",
    "lookup select normalized; other select values are hardcoded non-lookup",
  ],
  [
    "src/components/ricerca/ricerca-family-summary-card.tsx",
    "selectedOptionValue matches key and label",
  ],
  [
    "src/components/ricerca/worker-pipeline-summary-cards.tsx",
    "delegates lookup persistence to normalized parent/component callbacks",
  ],
  [
    "src/components/crm/cards/stato-lead-card.tsx",
    "CRM patch path normalizes lookup values before update; selectedOptionValue matches key/label",
  ],
  [
    "src/components/crm/cards/onboarding-card.tsx",
    "CRM lookup selects use selected key and label save where persisted",
  ],
  [
    "src/components/crm/cards/onboarding-context-card.tsx",
    "CRM contextual selects/checkboxes normalize key/label for value and checked state",
  ],
  [
    "src/components/crm/cards/onboarding-decisione-lavoro-card.tsx",
    "uses label-valued select or boolean checkboxes, not key-backed persistence",
  ],
  [
    "src/components/crm/famiglia-processo-detail-content.tsx",
    "CRM detail normalizes selected key/label and saves labels for lookup-backed fields",
  ],
  [
    "src/components/lavoratori/documents-card.tsx",
    "uses getLookupSelectValue for display and backend normalizes saved lookup values",
  ],
  [
    "src/components/lavoratori/worker-profile-overview.tsx",
    "uses getLookupSelectValue for display and backend normalizes saved lookup values",
  ],
  [
    "src/components/lavoratori/worker-profile-header.tsx",
    "lookup inline selects normalize key/label and save label",
  ],
  [
    "src/components/lavoratori/availability-status-card.tsx",
    "availability lookup select normalizes key/label and saves label",
  ],
  [
    "src/components/lavoratori/gate1-view.tsx",
    "Gate lookup selects/radios normalize key/label for value and save paths",
  ],
  [
    "src/components/lavoratori/lavoratori-cerca-view.tsx",
    "passes through normalized child values; address province uses label-valued AddressSectionCard",
  ],
  [
    "src/components/ricerca/ricerca-workers-pipeline-view.tsx",
    "passes through normalized WorkerProfileHeader values; status select uses getLookupSelectValue",
  ],
  [
    "src/hooks/use-selected-worker-editor.ts",
    "central worker editor patch path; lookup UI callers normalize display/save values before invoking it",
  ],
  [
    "src/components/lavoratori/skills-competenze-card.tsx",
    "skill controls are label-valued domain controls",
  ],
  [
    "src/components/lavoratori/experience-references-card.tsx",
    "experience/reference controls use label-valued selects or normalized multi lookups",
  ],
  [
    "src/components/payroll/payroll-overview-view.tsx",
    "presence day selects use local hardcoded options, not lookup_values",
  ],
  [
    "src/components/payroll/contributi-inps-view.tsx",
    "board stage select uses stage ids with board alias mapping",
  ],
]);

function walk(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist") continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...walk(fullPath));
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      result.push(fullPath);
    }
  }
  return result;
}

function lineNumberFor(content, index) {
  return content.slice(0, index).split("\n").length;
}

function relative(file) {
  return path.relative(ROOT, file).replaceAll(path.sep, "/");
}

const findings = [];

for (const sourceRoot of SOURCE_ROOTS) {
  const absoluteRoot = path.join(ROOT, sourceRoot);
  if (!fs.existsSync(absoluteRoot)) continue;

  for (const file of walk(absoluteRoot)) {
    const rel = relative(file);
    const content = fs.readFileSync(file, "utf8");

    for (const pattern of PATTERNS) {
      for (const match of content.matchAll(new RegExp(pattern.regex, "g"))) {
        const line = lineNumberFor(content, match.index ?? 0);
        const reviewedReason = REVIEWED_PATHS.get(rel);
        findings.push({
          file: rel,
          line,
          pattern: pattern.id,
          reviewed: Boolean(reviewedReason),
          reason: reviewedReason ?? null,
        });
      }
    }
  }
}

const unreviewed = findings.filter((finding) => !finding.reviewed);

console.log(`Lookup audit findings: ${findings.length}`);
for (const finding of findings) {
  const status = finding.reviewed ? "reviewed" : "UNREVIEWED";
  console.log(
    `${status} ${finding.pattern} ${finding.file}:${finding.line}` +
      (finding.reason ? ` - ${finding.reason}` : "")
  );
}

if (unreviewed.length > 0) {
  console.error(`\nLookup audit failed: ${unreviewed.length} unreviewed risky lookup usages.`);
  process.exit(1);
}
