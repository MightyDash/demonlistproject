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
    tier: Number(row.tier ?? row.Tier ?? 0),
    tierChange: Number(row.tierChange ?? row["Tier +/-"] ?? row.tier_change ?? 0),
    formerTop1Year: FORMER_TOP_1[name] || null,
    skillsets: String(row.skillsets ?? row.Skillsets ?? "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean),
    status: row.status ?? row["Done/Progress?"] ?? "COMPLETED",
    thumbnail: id ? `https://levelthumbs.prevter.me/thumbnail/${id}` : "",
    notes: row.notes ?? ""
  };
}

export function placementNumber(placement) {
  const match = String(placement || "").match(/\d+/);
  return match ? Number(match[0]) : 999999;
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

export function formatTier(value) {
  return Number(value || 0).toLocaleString("nl-NL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

const FORMER_TOP_1 = {
  "Deadlocked": 2019,
  "The Behemoth": 2020,
  "Nine Circles": 2021,
  "Rupture": 2022,
  "Acu": 2023,
  "Make It Drop": 2025
};
