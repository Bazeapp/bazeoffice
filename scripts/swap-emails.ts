#!/usr/bin/env bun
/**
 * Swap the base address used by anonymized seed emails in the sibling
 * `baze-supabase` repo, keeping each +code tag.
 *
 * Default seed pattern:
 *   lisandro.enrici+<code>@bazeapp.it
 *
 * Example:
 *   bun run scripts/swap-emails.ts mattia.dalzocchio@gmail.com
 *   → mattia.dalzocchio+<code>@gmail.com
 *
 * Re-runnable: replaces whatever local+code@domain anonymized pattern is present.
 *
 * Options:
 *   --dry-run                 print counts without writing files
 *   --supabase-root <path>    override sibling repo (default: ../baze-supabase)
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_SUPABASE_ROOT = resolve(REPO_ROOT, "../baze-supabase");

const TARGET_FILES = [
  "supabase/seed.sql",
  "supabase/seed.generator.sql",
  "supabase/seed_e2e.sql",
  "supabase/seed_test_user.sql",
] as const;

/** Anonymized plus-tag: table path + 10-char md5 prefix, e.g. famiglie_af4b7223fe */
const CODE = String.raw`[a-z]+(?:_[a-z]+)*_[a-f0-9]{10}`;
const LOCAL = String.raw`[A-Za-z0-9._%+-]+`;
const DOMAIN = String.raw`[A-Za-z0-9.-]+\.[A-Za-z]{2,}`;

const FULL_EMAIL_RE = new RegExp(
  `\\b(${LOCAL})\\+(${CODE})@(${DOMAIN})\\b`,
  "g",
);

/** Generator fragments: 'local+table_'||substr(md5(...),1,10)||'@domain' */
const GENERATOR_FRAGMENT_RE = new RegExp(
  `'(${LOCAL})\\+([a-z]+(?:_[a-z]+)*_)'\\|\\|substr\\(md5\\(([^)]+)\\),1,10\\)\\|\\|'@(${DOMAIN})'`,
  "g",
);

/** Doc / comment pattern: local+<tabla>_<hash>@domain */
const COMMENT_PATTERN_RE = new RegExp(
  `(${LOCAL})\\+<tabla>_<hash>@(${DOMAIN})`,
  "g",
);

function usage(exitCode = 1): never {
  console.error(`Usage: bun run scripts/swap-emails.ts <email> [--dry-run] [--supabase-root <path>]

Examples:
  bun run scripts/swap-emails.ts mattia.dalzocchio@gmail.com
  bun run scripts/swap-emails.ts mattia.dalzocchio@gmail.com --dry-run
  bun run scripts/swap-emails.ts mattia.dalzocchio@gmail.com --supabase-root ../baze-supabase
`);
  process.exit(exitCode);
}

function takeFlagValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx === -1) return undefined;
  const value = args[idx + 1];
  if (!value || value.startsWith("--")) {
    console.error(`Error: ${flag} requires a path argument.`);
    process.exit(1);
  }
  args.splice(idx, 2);
  return value;
}

function parseTargetEmail(raw: string): { local: string; domain: string } {
  const email = raw.trim();
  if (email.includes("+")) {
    console.error(
      `Error: pass a base email without a +tag (got "${email}").\n` +
        `  The script inserts each seed code after the local part.`,
    );
    process.exit(1);
  }

  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) {
    console.error(`Error: invalid email "${email}"`);
    process.exit(1);
  }

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);

  if (!/^[A-Za-z0-9._%+-]+$/.test(local) || !/^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(domain)) {
    console.error(`Error: invalid email "${email}"`);
    process.exit(1);
  }

  return { local, domain };
}

function swapContent(
  content: string,
  local: string,
  domain: string,
): { next: string; counts: { emails: number; fragments: number; comments: number } } {
  let emails = 0;
  let fragments = 0;
  let comments = 0;

  let next = content.replace(FULL_EMAIL_RE, (_m, _oldLocal, code) => {
    emails += 1;
    return `${local}+${code}@${domain}`;
  });

  next = next.replace(
    GENERATOR_FRAGMENT_RE,
    (_m, _oldLocal, prefix, md5Arg) => {
      fragments += 1;
      return `'${local}+${prefix}'||substr(md5(${md5Arg}),1,10)||'@${domain}'`;
    },
  );

  next = next.replace(COMMENT_PATTERN_RE, () => {
    comments += 1;
    return `${local}+<tabla>_<hash>@${domain}`;
  });

  return { next, counts: { emails, fragments, comments } };
}

function main(): void {
  const args = process.argv.slice(2).filter((a) => a !== "--");
  const dryRun = args.includes("--dry-run");
  if (dryRun) args.splice(args.indexOf("--dry-run"), 1);

  const supabaseRootArg = takeFlagValue(args, "--supabase-root");
  const positional = args.filter((a) => !a.startsWith("--"));

  if (positional.length === 0 || args.includes("--help") || args.includes("-h")) {
    usage(args.includes("--help") || args.includes("-h") ? 0 : 1);
  }

  if (positional.length !== 1) {
    console.error("Error: expected exactly one email argument.");
    usage();
  }

  const supabaseRoot = resolve(
    process.cwd(),
    supabaseRootArg ?? DEFAULT_SUPABASE_ROOT,
  );

  if (!existsSync(supabaseRoot)) {
    console.error(
      `Error: baze-supabase root not found at ${supabaseRoot}\n` +
        `  Pass --supabase-root <path> if the sibling repo lives elsewhere.`,
    );
    process.exit(1);
  }

  const { local, domain } = parseTargetEmail(positional[0]!);
  const target = `${local}+<code>@${domain}`;

  console.log(`Supabase root:  ${supabaseRoot}`);
  console.log(`Target pattern: ${target}`);
  if (dryRun) console.log("(dry-run — no files will be written)\n");
  else console.log("");

  let total = 0;

  for (const rel of TARGET_FILES) {
    const path = join(supabaseRoot, rel);
    let content: string;
    try {
      content = readFileSync(path, "utf8");
    } catch {
      console.warn(`skip  ${rel} (not found)`);
      continue;
    }

    const { next, counts } = swapContent(content, local, domain);
    const fileTotal = counts.emails + counts.fragments + counts.comments;
    total += fileTotal;

    if (fileTotal === 0) {
      console.log(`ok    ${rel} — no anonymized emails`);
      continue;
    }

    console.log(
      `${dryRun ? "would" : "wrote"} ${rel} — ` +
        `${counts.emails} email(s), ${counts.fragments} generator fragment(s), ${counts.comments} comment(s)`,
    );

    if (!dryRun && next !== content) {
      writeFileSync(path, next, "utf8");
    }
  }

  console.log(`\nDone. ${total} replacement(s)${dryRun ? " (dry-run)" : ""}.`);
}

main();
