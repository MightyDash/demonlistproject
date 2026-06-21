export function normalizeDemon(row, index) {
  const id = String(row.id ?? row.ID ?? "");
  const name = row.name ?? row.demon ?? row.Demon ?? "";

  return {
    placement: row.placement ?? row.Placement ?? row["#"] ?? `#${index + 1}`,
    name,
    creator: row.creator ?? row.creators ?? row["Creator(s)"] ?? "",
    id,
    difficulty: row.difficulty ?? row.Difficulty ?? "",
    attempts: Number(row.attempts ?? row.Attempts ?? 0),
    year: Number(row.year ?? row.Year ?? 0),
    video: row.video ?? row["Done for Video"] ?? "",
    formerTop1Year: FORMER_TOP_1[name] || null,
    skillsetDistribution: Array.isArray(row.skillsetDistribution)
      ? row.skillsetDistribution
      : [],
    status: row.status ?? row["Done/Progress?"] ?? "COMPLETED",
    progressPercent: Number(row.progressPercent ?? row["Progress %"] ?? 0),
    thumbnail: id ? `https://levelthumbs.prevter.me/thumbnail/${id}` : "",
    notes: row.notes ?? ""
  };
}

export function placementNumber(placement) {
  const match = String(placement || "").match(/\d+/);
  return match ? Number(match[0]) : 999999;
}

export function hasPlacement(placement) {
  return /\d+/.test(String(placement || ""));
}

export function isInProgressDemon(demon) {
  const status = String(demon?.status || "").toUpperCase().trim();
  return status === "IN PROGRESS" || !hasPlacement(demon?.placement);
}

export function difficultyClass(diff) {
  const d = String(diff || "").toLowerCase();
  if (d.includes("extreme")) return "extreme";
  if (d.includes("insane")) return "insane";
  if (d.includes("hard")) return "hard";
  if (d.includes("medium")) return "medium";
  if (d.includes("easy")) return "easy";
  return "unknown";
}

export function segmentForPlacement(placement) {
  const n = placementNumber(placement);
  if (n <= 100) return "main";
  if (n <= 200) return "extended";
  return "legacy";
}

export function formatNumber(value) {
  return new Intl.NumberFormat("nl-NL").format(Number(value || 0));
}

const FORMER_TOP_1 = {
  "Deadlocked": 2019,
  "The Behemoth": 2020,
  "Nine Circles": 2021,
  "Rupture": 2022,
  "Acu": 2023,
  "Make It Drop": 2025
};

