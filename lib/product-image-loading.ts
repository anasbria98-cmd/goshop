/** Retry a failed public image without reusing a cached error response. */
export function retryProductImageUrl(source: string) {
  const hashIndex = source.indexOf("#");
  const hash = hashIndex < 0 ? "" : source.slice(hashIndex);
  const url = hashIndex < 0 ? source : source.slice(0, hashIndex);
  return `${url}${url.includes("?") ? "&" : "?"}goelec_image_retry=1${hash}`;
}

export function productImageSources(source: string | null, alternatives: string[] = []) {
  return [...new Set([source, ...alternatives].filter((url): url is string => Boolean(url?.trim())))];
}
