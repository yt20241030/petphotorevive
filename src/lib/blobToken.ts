/**
 * Vercel injects the Blob read-write token as BLOB_READ_WRITE_TOKEN by
 * default, but connecting a store with a custom prefix (Advanced Options)
 * yields names like MYSTORE_READ_WRITE_TOKEN — and the SDK only auto-reads
 * the default name. Resolve whatever *_READ_WRITE_TOKEN exists and pass it
 * to SDK calls explicitly.
 */
export function getBlobToken(): string | undefined {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  for (const [key, value] of Object.entries(process.env)) {
    if (key.endsWith("_READ_WRITE_TOKEN") && value) return value;
  }
  return undefined;
}

/** Name of the env var the token was found under (for diagnostics — never the value). */
export function getBlobTokenKey(): string | undefined {
  if (process.env.BLOB_READ_WRITE_TOKEN) return "BLOB_READ_WRITE_TOKEN";
  for (const [key, value] of Object.entries(process.env)) {
    if (key.endsWith("_READ_WRITE_TOKEN") && value) return key;
  }
  return undefined;
}
