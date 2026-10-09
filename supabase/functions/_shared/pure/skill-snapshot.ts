/** Mission başında gerçekten kullanılabilecek yetenek ID'lerini sabitler. */
export function normalizeSkillIds(value: unknown, max = 100): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const id = item.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Bot bağlıysa yalnızca o botun istenen/onaylı yeteneklerini; botsuz görevde
 * ise açıkça istenen onaylı yetenekleri korur. Sıra bot ilişkisinden gelir.
 */
export function snapshotSkillIds(input: {
  requested: unknown;
  botSkillIds?: unknown;
  eligibleIds?: unknown;
  botBound?: boolean;
  max?: number;
}): string[] {
  const requested = normalizeSkillIds(input.requested, input.max ?? 100);
  const botSkillIds = normalizeSkillIds(input.botSkillIds, input.max ?? 100);
  const eligible = new Set(normalizeSkillIds(input.eligibleIds, input.max ?? 100));
  const pool = input.botBound
    ? (requested.length ? botSkillIds.filter((id) => requested.includes(id)) : botSkillIds)
    : botSkillIds.length
    ? (requested.length ? botSkillIds.filter((id) => requested.includes(id)) : botSkillIds)
    : requested;
  return pool.filter((id) => eligible.has(id)).slice(0, input.max ?? 100);
}
