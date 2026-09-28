/**
 * In-memory client-side cache and safe fetch helpers.
 *
 * Implements Stale-While-Revalidate:
 * - On first page load: fetches from server, caches in memory.
 * - On subsequent visits: instantly returns cached data (0ms delay, no spinner!).
 * - Silently revalidates in the background so updates appear seamlessly.
 * - When data is mutated (e.g. sale logged, dish added), invalidateCache() clears it.
 */

const _cache = new Map();

export function getCached(url) {
  return _cache.get(url) ?? null;
}

export function hasCached(url) {
  return _cache.has(url);
}

export function setCached(url, data) {
  _cache.set(url, data);
}

export function invalidateCache(urlPrefix) {
  if (!urlPrefix) {
    _cache.clear();
    return;
  }
  for (const key of _cache.keys()) {
    if (key.startsWith(urlPrefix)) {
      _cache.delete(key);
    }
  }
}

/**
 * Fetch an array with automatic in-memory caching and cold-start retry.
 * Always returns an array — never throws.
 */
export async function fetchArray(url, options, retries = 2) {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      if (res.status >= 500 && retries > 0) {
        // Neon database was likely waking up from suspend — wait 1.2s and retry
        await new Promise((resolve) => setTimeout(resolve, 1200));
        return fetchArray(url, options, retries - 1);
      }
      return _cache.get(url) || [];
    }
    const data = await res.json();
    const result = Array.isArray(data) ? data : [];
    _cache.set(url, result);
    return result;
  } catch (err) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      return fetchArray(url, options, retries - 1);
    }
    return _cache.get(url) || [];
  }
}

/**
 * Fetch a single object with automatic in-memory caching and cold-start retry.
 * Always returns an object or null — never throws.
 */
export async function fetchOne(url, options, retries = 2) {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      if (res.status >= 500 && retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        return fetchOne(url, options, retries - 1);
      }
      return _cache.get(url) || null;
    }
    const data = await res.json();
    const result = data && !data.error ? data : null;
    if (result) _cache.set(url, result);
    return result;
  } catch (err) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      return fetchOne(url, options, retries - 1);
    }
    return _cache.get(url) || null;
  }
}
