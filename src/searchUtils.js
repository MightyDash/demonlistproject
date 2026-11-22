export function matchesAttemptsFilter(value, expression) {
  const attempts = Number(value);
  const raw = String(expression || "").trim();
  if (!raw || !Number.isFinite(attempts) || attempts < 0) return false;

  const match = raw.match(/^(<=|>=|<|>|=)?\s*(\d[\d\s.,]*)$/);
  if (!match) return false;

  const requestedAttempts = Number(match[2].replace(/[\s.,]/g, ""));
  if (!Number.isFinite(requestedAttempts)) return false;

  switch (match[1] || "=") {
    case "<":
      return attempts < requestedAttempts;
    case "<=":
      return attempts <= requestedAttempts;
    case ">":
      return attempts > requestedAttempts;
    case ">=":
      return attempts >= requestedAttempts;
    default:
      return attempts === requestedAttempts;
  }
}

export function pickRandomResult(results, random = Math.random) {
  if (!Array.isArray(results) || results.length === 0) return [];
  const index = Math.min(results.length - 1, Math.floor(random() * results.length));
  return [results[index]];
}
