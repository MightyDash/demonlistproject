export const BULK_EDIT_FIELDS = [
  "name",
  "difficulty",
  "creator",
  "date",
  "attempts",
  "status",
  "device",
  "twoPlayerMode",
  "progressPercent"
];

export function createDemonEditDraft(demon) {
  return {
    name: String(demon?.name || ""),
    difficulty: String(demon?.difficulty || ""),
    creator: String(demon?.creator || ""),
    date: String(demon?.date || demon?.year || ""),
    attempts: String(demon?.attempts ?? ""),
    status: String(demon?.status || "COMPLETED"),
    device: String(demon?.device || "PC"),
    twoPlayerMode: String(demon?.twoPlayerMode || "standard"),
    progressPercent: String(demon?.progressPercent ?? "")
  };
}

export function buildBulkEditChanges(demons, drafts) {
  const originalById = new Map(
    demons.map(demon => [String(demon.id), createDemonEditDraft(demon)])
  );

  return Object.entries(drafts).flatMap(([levelId, draft]) => {
    const original = originalById.get(String(levelId));
    if (!original) return [];

    const change = { levelId: String(levelId) };
    BULK_EDIT_FIELDS.forEach(field => {
      if (String(draft[field] ?? "") !== String(original[field] ?? "")) {
        change[field] = draft[field];
      }
    });

    if (change.status !== undefined && String(draft.status) === "IN PROGRESS") {
      change.progressPercent = draft.progressPercent;
    }

    return Object.keys(change).length > 1 ? [change] : [];
  });
}

export function validateBulkEditChanges(changes) {
  for (const change of changes) {
    if (change.name !== undefined && !String(change.name).trim()) return "Name is required.";
    if (change.date !== undefined && !/^\d{4}$|^\d{1,2}[/-]\d{1,2}[/-](?:\d{2}|\d{4})$/.test(String(change.date).trim())) {
      return "Date must be a four-digit year or dd/mm/yyyy.";
    }
    if (change.attempts !== undefined && (!Number.isInteger(Number(change.attempts)) || Number(change.attempts) < 0)) {
      return "Attempts must be a valid whole number.";
    }
    if (change.status !== undefined && !["COMPLETED", "IN PROGRESS"].includes(change.status)) {
      return "Status must be COMPLETED or IN PROGRESS.";
    }
    if (change.status === "IN PROGRESS" || change.progressPercent !== undefined) {
      const progress = Number(change.progressPercent);
      if (!Number.isInteger(progress) || progress < 0 || progress > 100) {
        return "Progress must be a whole percentage between 0 and 100.";
      }
    }
  }

  return "";
}
