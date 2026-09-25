#!/usr/bin/env node
/**
 * check-i18n.js — systemic safeguard against i18n regressions.
 *
 * Checks:
 *  1. Devanagari scanner — no hardcoded Devanagari string literals in any
 *     .jsx file under src/screens/ or src/components/ (native language names
 *     on whitelisted LINES are exempt).
 *  2. Unwrapped-text scanner — string literals of 3+ words inside JSX files
 *     that are not routed through t()/getSecondary() are flagged.
 *  3. Key parity — every key present in hi.js or en.js must exist (and be a
 *     non-empty string) in ALL nine language files.
 *
 * Exit code 1 if any issue is found. Run after any phase that adds screens:
 *     npm run check-i18n
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SCREENS_DIR = path.join(ROOT, 'src', 'screens');
const COMPONENTS_DIR = path.join(ROOT, 'src', 'components');
const TRANSLATIONS_DIR = path.join(ROOT, 'src', 'i18n', 'translations');

const LANGS = ['en', 'hi', 'ta', 'bn', 'te', 'mr', 'gu', 'kn', 'ml'];

const issues = [];
const warnings = [];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function listJsxFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listJsxFiles(full));
    } else if (entry.name.endsWith('.jsx')) {
      out.push(full);
    }
  }
  return out;
}

/** Extract string literal contents (single, double, template) with line numbers. */
function extractLiterals(source) {
  const literals = [];
  const re = /(['"`])((?:\\.|(?!\1)[^\\\n])*)\1/g;
  let match;
  while ((match = re.exec(source)) !== null) {
    const upTo = source.slice(0, match.index);
    const line = (upTo.match(/\n/g) || []).length + 1;
    literals.push({
      quote: match[1],
      raw: match[2],
      line,
      // resolve common escapes for word counting
      value: match[2].replace(/\\n/g, ' ').replace(/\\(['"`\\])/g, '$1'),
    });
  }
  return literals;
}

/** Strip trailing JSX text context: true when the literal is INSIDE a t( or getSecondary( call. */
function isInsideLookup(source, index) {
  const before = source.slice(Math.max(0, index - 160), index);
  return /\b(t|getSecondary)\s*\(\s*[`'"]?$/.test(before.trimEnd());
}

const LOOKUPISH = /\b(t|getSecondary|getSecondaryText|i18nKey|txKey)\b/;

// Whitelisted lines: native language names & brand text are intentionally
// non-translated. Matched as substrings; keep this list small and justified.
const LINE_WHITELIST = [
  "native: '", // LanguageSelect native language names
  "labelHindi: '", // Settings language list (native names)
  'SHILPKALA', // brand badge
];

// ---------------------------------------------------------------------------
// 1 & 2. JSX scanners
// ---------------------------------------------------------------------------

const DEVANAGARI = /[\u0900-\u097F]/;
const SHORT_ALLOWED = new Set([
  // single-word or 2-word UI literals that are legitimately untranslated
  // (numbers, symbols, product-ish demo labels). Extend deliberately, with a comment.
]);

function scanJsx() {
  const files = [...listJsxFiles(SCREENS_DIR), ...listJsxFiles(COMPONENTS_DIR)];
  for (const file of files) {
    const rel = path.relative(ROOT, file);
    const src = fs.readFileSync(file, 'utf8');
    const lines = src.split('\n');

    lines.forEach((lineText, i) => {
      if (LINE_WHITELIST.some((w) => lineText.includes(w))) return;
      if (DEVANAGARI.test(lineText)) {
        issues.push(
          `${rel}:${i + 1} Devanagari literal outside translation files: ${lineText.trim().slice(0, 90)}`
        );
      }
    });

    // Unwrapped 3+-word literals
    const literals = extractLiterals(src);
    for (const lit of literals) {
      if (lit.quote !== '"' && lit.quote !== "'") continue; // template strings: data interpolation
      const words = lit.value.trim().split(/\s+/).filter(Boolean);
      if (words.length < 3) continue;
      if (SHORT_ALLOWED.has(lit.value.trim())) continue;

      const idx = src.indexOf(lit.quote + lit.raw + lit.quote);
      // skip literals passed as i18n-ish props or inside lookup calls
      if (isInsideLookup(src, idx)) continue;
      const lineText = lines[lit.line - 1] || '';
      if (LINE_WHITELIST.some((w) => lineText.includes(w))) continue;
      if (
        /\b(txKey|i18nKey|titleKey|messageKey|labelKey|timestampKey|groupKey|actionKey|mockText|placeholder|sourceLabel)\s*[:=]\s*$/.test(
          (src.slice(0, idx).match(/[^\n]*$/) || [''])[0]
        )
      ) {
        // values assigned to *Key-style props are data, not display text
        if (/Key\s*[:=]\s*$/.test((src.slice(0, idx).match(/[^\n]*$/) || [''])[0])) continue;
      }
      // skip import paths, image requires, urls, icon names, fonts, colors
      if (/^(import|require|assets\/|http|@|\w[\w-]*\/)/.test(lit.value)) continue;
      if (/^[a-z0-9_-]+$/i.test(lit.value.replace(/\s/g, ''))) continue; // no spaces => handled by word count anyway
      if (
        // icon names, test ids, styles keys, font families, colors
        /^(ios|android|md-|ion-)|^[a-z]+(-[a-z]+)*$/.test(lit.value) ||
        /^(#[0-9A-Fa-f]{3,8}|rgba?\()/.test(lit.value)
      )
        continue;

      issues.push(
        `${rel}:${lit.line} unwrapped 3+-word literal: "${lit.value.trim().slice(0, 90)}"`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// 3. Key parity across all nine language files
// ---------------------------------------------------------------------------

function loadDict(lang) {
  const file = path.join(TRANSLATIONS_DIR, `${lang}.js`);
  const src = fs.readFileSync(file, 'utf8');
  const m = src.match(/export\s+default\s+/);
  const body = m ? src.slice(m.index + m[0].length) : src;
  const cleaned = body
    .replace(/export\s*\{[^}]*\};?/g, '')
    .replace(/^\s*const\s+\w+\s*=\s*/, '')
    .trim();
  // Evaluate the object literal safely in a sandboxed Function
  // eslint-disable-next-line no-new-func
  const obj = new Function(`"use strict"; return (${cleaned.replace(/;\s*$/, '')});`)();
  return obj;
}

function checkParity() {
  const dicts = {};
  for (const lang of LANGS) {
    try {
      dicts[lang] = loadDict(lang);
    } catch (e) {
      issues.push(`translations/${lang}.js could not be parsed: ${e.message}`);
    }
  }
  const enKeys = Object.keys(dicts.en || {});
  const hiKeys = Object.keys(dicts.hi || {});
  const allKeys = [...new Set([...enKeys, ...hiKeys])];

  for (const key of allKeys) {
    for (const lang of LANGS) {
      const dict = dicts[lang] || {};
      const value = dict[key];
      if (value === undefined) {
        issues.push(`key "${key}" missing in ${lang}.js`);
      } else if (typeof value !== 'string' || value.trim() === '') {
        issues.push(`key "${key}" has empty/non-string value in ${lang}.js`);
      } else if (value === 'null') {
        issues.push(`key "${key}" has literal string "null" in ${lang}.js`);
      }
    }
  }

  // warn on keys that exist in one of the 9 files but not in en/hi (orphans)
  for (const lang of LANGS) {
    if (lang === 'en' || lang === 'hi') continue;
    for (const key of Object.keys(dicts[lang] || {})) {
      if (!enKeys.includes(key) && !hiKeys.includes(key)) {
        warnings.push(`key "${key}" exists only in ${lang}.js (orphan key)`);
      }
    }
  }

  return allKeys.length;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

scanJsx();
const totalKeys = checkParity();

console.log('=== i18n safeguard ===');
console.log(`Checked 9 language files (${totalKeys} keys) + all .jsx under src/screens & src/components.`);

if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`);
  for (const w of warnings) console.log(`  ⚠ ${w}`);
}

if (issues.length) {
  console.log(`\n❌ ${issues.length} issue(s) found:\n`);
  for (const issue of issues) console.log(`  ✗ ${issue}`);
  process.exit(1);
} else {
  console.log('\n✅ Zero i18n issues — all strings routed through translation keys, full 9-language parity.');
}
