import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SOURCE_ROOTS = ["src/components", "src/hooks", "src/features"];
const EXTENSIONS = new Set([".ts", ".tsx"]);
const STRICT = process.argv.includes("--strict");

const REVIEWED_PATHS = new Map([
  [
    "src/components/gestione-contrattuale/rapporto-detail-panel.tsx",
    "contract autosave keeps latest draft in a ref and prevents parent overwrite while editing",
  ],
  [
    "src/components/gestione-contrattuale/assunzioni-detail-sheet.tsx",
    "core assunzioni card patch paths use latest card and creation locks; remaining form detail blur findings are tracked",
  ],
  [
    "src/components/gestione-contrattuale/variazioni-board-view.tsx",
    "detail/rapporto patches use latest card and event values on blur",
  ],
  [
    "src/components/gestione-contrattuale/chiusure-board-view.tsx",
    "detail patches use latest card and event values on blur",
  ],
  [
    "src/hooks/use-selected-worker-editor.ts",
    "central worker editor applies response rows into local selected worker/address state",
  ],
  [
    "src/components/ricerca/ricerca-detail-view.tsx",
    "optimistic process/family updates apply local patch and rollback on updateRecord error",
  ],
]);

const PATTERNS = [
  {
    id: "draft-value-on-blur",
    regex: /onBlur=\{\(\)\s*=>[^\n]*(?:\bdraft\.|\b[a-zA-Z0-9]+Draft\.)/g,
    severity: "high",
  },
  {
    id: "stale-card-spread-on-save",
    regex: /onCardChange\(\s*\{[\s\S]{0,220}\.\.\.card\b/g,
    severity: "high",
  },
  {
    id: "debounced-save-in-cleanup",
    regex: /return\s*\(\)\s*=>\s*\{[\s\S]{0,420}clearTimeout\([\s\S]{0,240}persist[A-Za-z0-9_]*Changes\(/g,
    severity: "high",
  },
  {
    id: "direct-update-without-response-merge",
    regex: /await\s+updateRecord\([^;\n]+\);\s*(?:\n\s*){0,3}(?:\}|finally|catch)/g,
    severity: "medium",
  },
];

function walk(dir) {
  const result = [];
  if (!fs.existsSync(dir)) return result;
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

function relative(file) {
  return path.relative(ROOT, file).replaceAll(path.sep, "/");
}

function lineNumberFor(content, index) {
  return content.slice(0, index).split("\n").length;
}

const findings = [];

for (const sourceRoot of SOURCE_ROOTS) {
  for (const file of walk(path.join(ROOT, sourceRoot))) {
    const rel = relative(file);
    const content = fs.readFileSync(file, "utf8");

    for (const pattern of PATTERNS) {
      for (const match of content.matchAll(pattern.regex)) {
        const line = lineNumberFor(content, match.index ?? 0);
        const reviewedReason = REVIEWED_PATHS.get(rel);
        findings.push({
          file: rel,
          line,
          pattern: pattern.id,
          severity: pattern.severity,
          reviewed: Boolean(reviewedReason),
          reason: reviewedReason ?? null,
        });
      }
    }
  }
}

const unreviewedHigh = findings.filter(
  (finding) => finding.severity === "high" && !finding.reviewed
);

console.log(`Autosave risk findings: ${findings.length}`);
for (const finding of findings) {
  const status = finding.reviewed ? "reviewed" : "REVIEW";
  console.log(
    `${status} ${finding.severity} ${finding.pattern} ${finding.file}:${finding.line}` +
      (finding.reason ? ` - ${finding.reason}` : "")
  );
}

if (STRICT && unreviewedHigh.length > 0) {
  console.error(
    `\nAutosave audit failed: ${unreviewedHigh.length} unreviewed high-risk autosave findings.`
  );
  process.exit(1);
}
