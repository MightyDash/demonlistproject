export function normalizeDemon(row, index) {
  const id = String(row.id ?? row.ID ?? "");
  const name = row.name ?? row.demon ?? row.Demon ?? "";
  const rawDate = row.date ?? row.Date ?? row.dateBeaten ?? row["Date beaten"] ?? row.year ?? row.Year ?? "";
  const dateLabel = formatDateLabel(rawDate);
  const dateYear = extractDateYear(rawDate);

  return {
    placement: row.placement ?? row.Placement ?? row["#"] ?? `#${index + 1}`,
    name,
    creator: row.creator ?? row.creators ?? row["Creator(s)"] ?? "",
    id,
    difficulty: row.difficulty ?? row.Difficulty ?? "",
    attempts: Number(row.attempts ?? row.Attempts ?? 0),
    year: dateYear,
    date: dateLabel,
    dateYear,
    video: row.video ?? row["Done for Video"] ?? "",
    tier: Number(row.tier ?? row.Tier ?? 0),
    tierChange: Number(row.tierChange ?? row["Tier +/-"] ?? row.tier_change ?? 0),
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

export function extractDateYear(value) {
  if (value === null || value === undefined || value === "") return 0;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.getFullYear();
  }

  const text = String(value).trim();
  if (/^\d{4}$/.test(text)) return Number(text);

  const slashMatch = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/);
  if (slashMatch) {
    const yearText = slashMatch[3];
    const year = Number(yearText.length === 2 ? `20${yearText}` : yearText);
    return year >= 1900 && year <= 2100 ? year : 0;
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getFullYear();
}

export function formatDateLabel(value) {
  if (value === null || value === undefined || value === "") return "";

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Intl.DateTimeFormat("en-GB").format(value);
  }

  const text = String(value).trim();
  if (/^\d{4}$/.test(text)) return text;

  const slashMatch = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/);
  if (slashMatch) {
    const day = slashMatch[1].padStart(2, "0");
    const month = slashMatch[2].padStart(2, "0");
    const year = slashMatch[3].length === 2 ? `20${slashMatch[3]}` : slashMatch[3];
    return `${day}/${month}/${year}`;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return text;

  return new Intl.DateTimeFormat("en-GB").format(parsed);
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

