// Shared server-side validation rules (final refinement pass).
//
// These are the authoritative checks — the client-side copies in
// public/js/motion.js exist only for immediate typing feedback and must
// never be trusted on their own. Keeping both in one place (here, and the
// mirrored rules in motion.js) is the closest this codebase gets to a single
// source of truth without introducing a build step to share code between
// server and browser.

// At least one Unicode letter, otherwise only letters, combining marks
// (diacritics — needed for Arabic tashkeel), spaces, hyphens and
// apostrophes (straight or curly, for names like O'Connor or names
// transliterated with one). Rejects digits-only and punctuation-only
// values without rejecting legitimate Arabic or Latin names.
const NAME_RE = /^(?=.*\p{L})[\p{L}\p{M}\s'’-]{2,60}$/u;

// Deliberately permissive: RFC 5322 in full is not worth the false
// positives it creates. Requires exactly one @, at least one dot in the
// domain part, and no whitespace.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CIVIL_ID_RE = /^\d{12}$/;

// Organization/school/caterer name: not digits-only, contains at least
// one letter, allows numbers as part of a real name ("360 Foods"),
// ampersands, and standard punctuation.
const ORG_NAME_RE = /^(?=.*\p{L})[\p{L}\p{N}\p{M}\s'’&.,\-]{2,80}$/u;

// Grade/section/class: intentionally loose — international schools use
// wildly different formats ("Grade 3", "Year 4", "KG2", "8A", "Section B").
const CLASS_RE = /^[\p{L}\p{N}\s'’.\-]{1,30}$/u;

function isValidName(value) {
  return typeof value === 'string' && NAME_RE.test(value.trim());
}

function isValidEmail(value) {
  return typeof value === 'string' && EMAIL_RE.test(value.trim());
}

function isValidCivilId(value) {
  return typeof value === 'string' && CIVIL_ID_RE.test(value.trim());
}

// Kuwait numbers are commonly 8 digits with no area code; international
// parents/staff may enter a full +<country><number>. 8-15 digits after
// stripping formatting characters covers both without pretending every
// parent must use one exact local format.
function isValidPhone(value) {
  if (typeof value !== 'string') return false;
  if (/[^\d\s+()-]/.test(value.trim())) return false;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15;
}

function isValidOrgName(value) {
  return typeof value === 'string' && ORG_NAME_RE.test(value.trim());
}

function isValidClassSection(value) {
  if (typeof value !== 'string') return true; // optional field
  const trimmed = value.trim();
  if (trimmed.length === 0) return true; // optional field
  return CLASS_RE.test(trimmed);
}

module.exports = {
  NAME_RE, EMAIL_RE, CIVIL_ID_RE, ORG_NAME_RE, CLASS_RE,
  isValidName, isValidEmail, isValidCivilId, isValidPhone, isValidOrgName, isValidClassSection
};
