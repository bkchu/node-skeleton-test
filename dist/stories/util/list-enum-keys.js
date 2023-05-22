/** Quickly spits out all enum names of a given enum */
export const listEnumKeys = (prefix, e) => {
  try {
    return Object.keys(e)
      .map((i) => `${prefix}.${i}`)
      .join("\n");
  } catch (err) {
    console.log("Failed to generate listEnumKeys", prefix, e);
    return "";
  }
};
