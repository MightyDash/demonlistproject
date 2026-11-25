export const GDDL_SHEET_ID = "1qKlWKpDkOpU1ZF6V6xGfutDY2NvcA8MNPnsv6GBkKPQ";
export const MAX_FINDER_TIER = 39;

function clampNumber(value, minimum, maximum, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

function queryNumber(value) {
  return Number(value).toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

export function getFinderTierBounds(tier) {
  const includesMax = tier === MAX_FINDER_TIER;
  return {
    min: Math.max(1, tier - 0.5),
    max: includesMax ? MAX_FINDER_TIER : tier + 0.5,
    includesMax
  };
}

export function normalizeFinderFilters(filters) {
  const tier = Math.round(clampNumber(filters.tier, 1, MAX_FINDER_TIER, 1));
  const enjoymentMin = clampNumber(filters.enjoymentMin, 0, 10, 0);
  const enjoymentMax = clampNumber(filters.enjoymentMax, 0, 10, 10);

  return {
    useTier: Boolean(filters.useTier),
    tier,
    useEnjoyment: Boolean(filters.useEnjoyment),
    enjoymentMin: Math.min(enjoymentMin, enjoymentMax),
    enjoymentMax: Math.max(enjoymentMin, enjoymentMax)
  };
}

export function buildGddlFinderQuery(filters) {
  const normalized = normalizeFinderFilters(filters);
  const clauses = [];

  if (normalized.useTier) {
    const { min, max, includesMax } = getFinderTierBounds(normalized.tier);
    clauses.push("F is not null");
    clauses.push(`F >= ${min}`);
    clauses.push(`F ${includesMax ? "<=" : "<"} ${max}`);
  }

  if (normalized.useEnjoyment) {
    clauses.push("G is not null");
    clauses.push(`G >= ${queryNumber(normalized.enjoymentMin)}`);
    clauses.push(`G <= ${queryNumber(normalized.enjoymentMax)}`);
  }

  if (!clauses.length) throw new Error("Choose at least one filter.");
  return `select A, B, C, D, E, F, G where ${clauses.join(" and ")}`;
}

export function rowsFromGddlResponse(payload) {
  if (payload?.status !== "ok" || !Array.isArray(payload?.table?.rows)) {
    throw new Error("The GDDL spreadsheet returned an invalid response.");
  }

  return payload.table.rows.map(row => {
    const cells = Array.isArray(row?.c) ? row.c : [];
    const value = index => cells[index]?.v ?? null;
    const formatted = index => cells[index]?.f ?? value(index);

    return {
      id: String(formatted(0) ?? "").trim(),
      name: String(value(1) ?? "Unknown level").trim(),
      creator: String(value(2) ?? "Unknown").trim() || "Unknown",
      song: String(value(3) ?? "Unknown song").trim() || "Unknown song",
      difficulty: String(value(4) ?? "Demon").trim() || "Demon",
      tier: Number.isFinite(Number(value(5))) ? Number(value(5)) : null,
      enjoyment: Number.isFinite(Number(value(6))) ? Number(value(6)) : null
    };
  }).filter(level => level.id && level.name);
}

export function pickRandomGddlDemon(levels, previousId = "", random = Math.random) {
  if (!Array.isArray(levels) || levels.length === 0) return null;
  const alternatives = levels.length > 1
    ? levels.filter(level => String(level.id) !== String(previousId))
    : levels;
  const pool = alternatives.length ? alternatives : levels;
  return pool[Math.floor(random() * pool.length)] || pool[0];
}

export function loadGddlDemons(filters, { timeoutMs = 20000 } = {}) {
  const query = buildGddlFinderQuery(filters);
  const callbackName = `__gddlFinder_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const params = new URLSearchParams({
    gid: "0",
    tqx: `out:json;responseHandler:${callbackName}`,
    tq: query
  });
  const source = `https://docs.google.com/spreadsheets/d/${GDDL_SHEET_ID}/gviz/tq?${params}`;

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    let settled = false;

    const cleanup = () => {
      window.clearTimeout(timer);
      script.remove();
      delete window[callbackName];
    };

    const finish = callback => value => {
      if (settled) return;
      settled = true;
      cleanup();
      callback(value);
    };

    const succeed = finish(payload => {
      try {
        resolve(rowsFromGddlResponse(payload));
      } catch (error) {
        reject(error);
      }
    });
    const fail = finish(() => reject(new Error("The GDDL spreadsheet could not be reached.")));
    const timer = window.setTimeout(fail, timeoutMs);

    window[callbackName] = succeed;
    script.async = true;
    script.src = source;
    script.onerror = fail;
    document.head.appendChild(script);
  });
}
