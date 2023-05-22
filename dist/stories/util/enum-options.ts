export const enumOptions = (prefix: string, e: any) => {
  try {
    const out: Record<string, any> = {};
    Object.keys(e).forEach((key) => {
      // Filter out storybook crud
      if (key !== "displayName" && key !== "__docgenInfo") {
        out[`${prefix}.${key}`] = e[key];
      }
    });

    return out;
  } catch (err) {
    console.warn("Failed to generate enumOptions", prefix, e);
    return {};
  }
};
