type Entry = {
  windowStartMs: number;
  count: number;
};

const globalStore = globalThis as unknown as { __speckyaiRateLimit?: Map<string, Entry> };

function getStore() {
  if (!globalStore.__speckyaiRateLimit) globalStore.__speckyaiRateLimit = new Map();
  return globalStore.__speckyaiRateLimit;
}

export function rateLimit(params: {
  key: string;
  max: number;
  windowMs: number;
}): { ok: boolean; remaining: number; resetInMs: number } {
  const store = getStore();
  const now = Date.now();
  const existing = store.get(params.key);

  if (!existing || now - existing.windowStartMs >= params.windowMs) {
    store.set(params.key, { windowStartMs: now, count: 1 });
    return { ok: true, remaining: params.max - 1, resetInMs: params.windowMs };
  }

  const nextCount = existing.count + 1;
  existing.count = nextCount;
  store.set(params.key, existing);

  const ok = nextCount <= params.max;
  const remaining = Math.max(0, params.max - nextCount);
  const resetInMs = Math.max(0, params.windowMs - (now - existing.windowStartMs));

  return { ok, remaining, resetInMs };
}

