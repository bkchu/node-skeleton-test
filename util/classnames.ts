/**
 * This takes several arguments and concatenates them into a single css class
 * name compatible string. It will remove any falsy values and will trim any
 * whitespace.
 */
export function classnames(...str: (string | undefined | null)[]): string {
  return str.filter(Boolean).join(" ").trim();
}
