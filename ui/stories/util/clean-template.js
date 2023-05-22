/**
 * Cleans up a templayte string that may have extra whitespace per line.
 */
export function cleanTemplate(str) {
  return str
    .split("\n")
    .map((s) => s.trim())
    .join("\n");
}
