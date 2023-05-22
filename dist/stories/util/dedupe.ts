export function dedupe<T>(values: T[], getValue: (val: T) => any): T[] {
  const out = new Map<any, T>();
  values.forEach((v) => {
    const key = getValue(v);
    out.set(key, v);
  });

  return Array.from(out.values());
}
