/** Resolve logical, private and local asset locations for the current runtime. */
export function resolveAssetUrl(
  value: string | undefined,
  manifest?: Record<string, string>,
): string {
  if (!value) return "";
  const resolved = manifest?.[value] || value;
  if (/^(?:s3|local):\/\//i.test(resolved)) {
    return `/api/assets/preview?uri=${encodeURIComponent(resolved)}`;
  }
  return resolved;
}
