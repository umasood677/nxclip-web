import { isUsableBrandImage, protectedBrandMediaPath } from '../../BrandKits/lib/secureBrandMedia';

/** Short-lived, memory-only image bytes. Never cache URLs containing credentials. */
export function createBrandMediaLoader(fetcher: typeof fetch, now = Date.now) {
  type Entry = { promise: Promise<Blob>; expires: number; bytes: number };
  const entries = new Map<string, Entry>();
  let scope = '';
  const clear = () => { entries.clear(); scope = ''; };
  const trim = () => {
    for (const [key, value] of entries) if (value.expires <= now()) entries.delete(key);
    let bytes = [...entries.values()].reduce((total, entry) => total + entry.bytes, 0);
    for (const [key, value] of entries) {
      if (entries.size <= 24 && bytes <= 32 * 1024 * 1024) break;
      if (value.expires === Infinity) continue;
      entries.delete(key); bytes -= value.bytes;
    }
  };
  function load(brandId: string, url: string, token: string, gateway: string): Promise<Blob> {
    const path = protectedBrandMediaPath(url, brandId);
    if (!token || !path) return Promise.reject(new Error('Authorized Brand Kit media is required.'));
    const nextScope = gateway + '\0' + token;
    if (nextScope !== scope) { clear(); scope = nextScope; }
    trim();
    const cached = entries.get(path);
    if (cached) return cached.promise;
    const entry: Entry = { promise: Promise.resolve(new Blob()), expires: Infinity, bytes: 0 };
    entries.set(path, entry);
    entry.promise = (async () => {
      try {
        const response = await fetcher('/api/gateway-proxy' + path, {
          headers: { Authorization: 'Bearer ' + token, 'X-Target-Gateway-Url': gateway },
          redirect: 'error', cache: 'no-store',
        });
        if (!response.ok) {
          entry.expires = now() + (response.status === 429 ? 60_000 : 5_000);
          throw new Error('Brand image unavailable (HTTP ' + response.status + ').');
        }
        const blob = await response.blob();
        if (!isUsableBrandImage(blob)) throw new Error('Unsupported Brand Kit image.');
        entry.bytes = blob.size; entry.expires = now() + 120_000;
        if (entries.get(path) === entry) trim();
        return blob;
      } catch (error) {
        if (entry.expires === Infinity) entry.expires = now() + 5_000;
        throw error;
      }
    })();
    return entry.promise;
  }
  return { load, clear };
}
export const brandMediaLoader = createBrandMediaLoader((input, init) => fetch(input, init));
