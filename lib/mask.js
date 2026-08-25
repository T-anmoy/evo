// lib/mask.js — Civil ID display masking, extracted from server.js so it's
// unit-testable and reusable anywhere Civil ID is rendered.

function maskCivilId(id) {
  if (!id || id.length < 4) return id;
  return '•'.repeat(id.length - 4) + id.slice(-4);
}

module.exports = { maskCivilId };
