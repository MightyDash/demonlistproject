export function matchesTierFilter(value, expression) {
  const tier = Number(value);
  const raw = String(expression || "").trim();
  if (!raw) return true;
  if (!Number.isFinite(tier) || tier <= 0) return false;

  const normalized = raw.replaceAll(",", ".");
  const range = normalized.match(/^(\d+(?:\.\d+)?)\s*(?:>|-|–|to)\s*(\d+(?:\.\d+)?)$/i);
  if (range) {
    const first = Number(range[1]);
    const second = Number(range[2]);
    const lower = Math.min(first, second);
    const upper = Math.max(first, second);
    const upperToken = first >= second ? range[1] : range[2];
    const upperLimit = upperToken.includes(".") ? upper + 0.005 : upper + 1;
    return tier >= lower && tier < upperLimit;
  }

  if (normalized.includes("/")) {
    const choices = normalized.split("/").map(choice => choice.trim()).filter(Boolean);
    return choices.length > 0 && choices.every(choice => /^\d+(?:\.\d+)?$/.test(choice))
      && choices.some(choice => matchesTierFilter(tier, choice));
  }

  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return false;
  const requestedTier = Number(normalized);
  return normalized.includes(".")
    ? Math.abs(tier - requestedTier) < 0.005
    : Math.floor(tier) === requestedTier;
}
