/**
 * Practice queue order.
 *
 * `?item=` never comes through here. Callers pass a session+day seed so a
 * refresh keeps the same queue, and a new tab (or the next local day) does not.
 * Empty ledger: shuffle the whole pool so id order is not the opener.
 * Ledger with attempts or trap heat: unseen items first, hotter traps first
 * inside that, and a seeded shuffle only inside each tie.
 */

type Orderable = { id: string; traps: { id: string }[] };

export function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const next = items.slice();
  const rand = mulberry32(hashString(seed) || 1);
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const swap = next[i];
    next[i] = next[j];
    next[j] = swap;
  }
  return next;
}

export function orderPracticeItems<T extends Orderable>(
  items: readonly T[],
  opts: {
    seed: string;
    heat?: Record<string, number>;
    seenIds?: Iterable<string>;
  }
): T[] {
  if (items.length <= 1) return items.slice();
  const heat = opts.heat ?? {};
  const seen = new Set(opts.seenIds ?? []);
  const ledgerEmpty = seen.size === 0 && Object.keys(heat).every((id) => !heat[id]);
  if (ledgerEmpty) return seededShuffle(items, opts.seed);

  const heatOf = (item: T) => item.traps.reduce((sum, trap) => sum + (heat[trap.id] ?? 0), 0);
  const groups = new Map<string, { rank: number; items: T[] }>();
  for (const item of items) {
    const seenFlag = seen.has(item.id) ? 1 : 0;
    const itemHeat = heatOf(item);
    const rank = seenFlag * 1_000_000 - itemHeat;
    const key = String(rank);
    const group = groups.get(key);
    if (group) group.items.push(item);
    else groups.set(key, { rank, items: [item] });
  }
  return [...groups.values()]
    .sort((a, b) => a.rank - b.rank)
    .flatMap((group) => seededShuffle(group.items, `${opts.seed}:${group.rank}`));
}
