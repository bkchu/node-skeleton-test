/**
 * Helper to pick a random element from a list
 */
export function pickRandom<T>(list?: T[] | Set<T>) {
  if (!list) return;
  if (!Array.isArray(list)) list = Array.from(list.values());
  return list[Math.floor(Math.random() * list.length)];
}
