// Ссылка после входа никогда не может вести на чужой домен.
export function returnPath(value: unknown) {
  return typeof value === "string" && /^(?:\/|\/sites(?:\/[a-z0-9-]+)?)$/.test(value) ? value : "/sites";
}
