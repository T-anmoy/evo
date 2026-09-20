// lib/i18n.js — minimal, dependency-free localization layer for EJS.
//
// Deliberately not a duplicate-template scheme: one EJS view renders in
// either language by calling t('some.key') instead of hardcoding English.
// Dictionaries are plain nested JSON (locales/en.json, locales/ar.json),
// loaded once at startup. A key missing from a non-English dictionary
// falls back to English rather than showing a raw key or breaking the
// page — real coverage gaps are tracked in
// docs/evo-implementation/PHASE-04-LOCALIZATION-RESPONSIVE.md, not hidden
// by a broken UI.

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '..', 'locales');
const SUPPORTED_LOCALES = ['en', 'ar'];
const DEFAULT_LOCALE = 'en';

const dictionaries = {};
SUPPORTED_LOCALES.forEach(locale => {
  const file = path.join(LOCALES_DIR, `${locale}.json`);
  dictionaries[locale] = JSON.parse(fs.readFileSync(file, 'utf-8'));
});

function resolveKey(dict, key) {
  return key.split('.').reduce((node, part) => {
    return (node && typeof node === 'object') ? node[part] : undefined;
  }, dict);
}

function interpolate(str, vars) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
}

// t(locale, 'nav.forParents') -> string, with vars interpolated ({name} etc.)
// Missing in the requested locale -> falls back to English -> falls back
// to the raw key (a visible marker during development, never silent).
function t(locale, key, vars) {
  const primary = resolveKey(dictionaries[locale], key);
  if (typeof primary === 'string') return interpolate(primary, vars);

  const fallback = resolveKey(dictionaries[DEFAULT_LOCALE], key);
  if (typeof fallback === 'string') return interpolate(fallback, vars);

  return key;
}

module.exports = { t, SUPPORTED_LOCALES, DEFAULT_LOCALE };
