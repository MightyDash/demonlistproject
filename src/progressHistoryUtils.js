const EVENT_LABELS = {
  BASELINE: "Tracking started",
  CURRENT: "Current snapshot",
  COMPLETED: "Completed",
  PROGRESS: "New best",
  UPDATE: "Progress updated",
  STATUS: "Status changed"
};

function numberOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function sameSnapshot(left, right) {
  return numberOrZero(left?.progressPercent) === numberOrZero(right?.progressPercent)
    && numberOrZero(left?.attempts) === numberOrZero(right?.attempts)
    && String(left?.progressCategory || "") === String(right?.progressCategory || "");
}

export function progressCategoryLabel(value) {
  const category = String(value || "IN PROGRESS").trim().toUpperCase();
  if (category === "PLAN TO BEAT") return "Plan to Beat";
  if (category === "ON HOLD") return "On Hold";
  if (category === "DROPPED") return "Dropped";
  return "In Progress";
}

export function buildProgressTimeline(entries, demon) {
  const normalized = (Array.isArray(entries) ? entries : [])
    .map(entry => ({
      ...entry,
      recordedAt: String(entry.recordedAt || entry.updatedAt || ""),
      progressPercent: numberOrZero(entry.progressPercent),
      attempts: numberOrZero(entry.attempts),
      progressCategory: String(entry.progressCategory || "IN PROGRESS").toUpperCase(),
      event: String(entry.event || "UPDATE").toUpperCase()
    }))
    .sort((a, b) => new Date(a.recordedAt || 0) - new Date(b.recordedAt || 0));

  const currentSnapshot = {
    recordedAt: "",
    levelId: String(demon?.id || ""),
    name: String(demon?.name || ""),
    progressPercent: numberOrZero(demon?.progressPercent),
    attempts: numberOrZero(demon?.attempts),
    progressCategory: String(demon?.progressCategory || "IN PROGRESS").toUpperCase(),
    status: String(demon?.status || "IN PROGRESS").toUpperCase(),
    event: "CURRENT"
  };

  if (normalized.length === 0 || !sameSnapshot(normalized[normalized.length - 1], currentSnapshot)) {
    normalized.push(currentSnapshot);
  }

  return normalized.map((entry, index) => {
    const previous = normalized[index - 1];
    const progressDelta = previous ? entry.progressPercent - previous.progressPercent : 0;
    const calculatedAttemptDelta = previous ? entry.attempts - previous.attempts : 0;
    const suppliedAttemptDelta = Number(entry.attemptDelta);
    const attemptDelta = Number.isFinite(suppliedAttemptDelta) && suppliedAttemptDelta !== 0
      ? suppliedAttemptDelta
      : calculatedAttemptDelta;

    return {
      ...entry,
      previousProgressPercent: previous?.progressPercent ?? null,
      previousProgressCategory: previous?.progressCategory ?? null,
      progressDelta,
      attemptDelta,
      label: EVENT_LABELS[entry.event] || "Progress updated",
      categoryLabel: progressCategoryLabel(entry.progressCategory)
    };
  }).reverse();
}

export function formatProgressHistoryDate(value) {
  if (!value) return "Current";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}
