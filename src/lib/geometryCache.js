const MAX_ENTRIES = 80;

// relPath -> { geometry, dimensions, triangleCount }
const cache = new Map();

export function getCached(relPath) {
  const entry = cache.get(relPath);
  if (!entry) return null;
  // Touch for LRU: re-insert so it's considered most-recently-used.
  cache.delete(relPath);
  cache.set(relPath, entry);
  return entry;
}

export function setCached(relPath, entry) {
  if (cache.has(relPath)) cache.delete(relPath);
  cache.set(relPath, entry);
  while (cache.size > MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    const oldest = cache.get(oldestKey);
    oldest.geometry.dispose();
    cache.delete(oldestKey);
  }
}

export function invalidateCached(relPath) {
  const entry = cache.get(relPath);
  if (entry) {
    entry.geometry.dispose();
    cache.delete(relPath);
  }
}

export function rekeyCached(oldRelPath, newRelPath) {
  if (oldRelPath === newRelPath) return;
  const entry = cache.get(oldRelPath);
  if (!entry) return;
  cache.delete(oldRelPath);
  cache.set(newRelPath, entry);
}
