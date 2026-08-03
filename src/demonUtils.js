export function normalizeDemon(row) {
  const id = String(row.id ?? row.ID ?? "");
  const name = row.name ?? row.demon ?? row.Demon ?? "";
  const rawDate = row.date ?? row.Date ?? row.dateBeaten ?? row["Date beaten"] ?? row.year ?? row.Year ?? "";
  const dateLabel = formatDateLabel(rawDate);
  const dateYear = extractDateYear(rawDate);
  const placement = normalizePlacement(row.placement ?? row.Placement ?? row["#"]);

  return {
    placement,
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

  return parseSupportedDate(value)?.year || 0;
}

export function formatDateLabel(value) {
  if (value === null || value === undefined || value === "") return "";

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatCalendarDate(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }

  const parsed = parseSupportedDate(value);
  if (!parsed) return "";
  if (parsed.yearOnly) return String(parsed.year);
  return formatCalendarDate(parsed.year, parsed.month, parsed.day);
}

export function placementNumber(placement) {
  return parsePlacementNumber(placement);
}

export function placementSortValue(placement) {
  return parsePlacementNumber(placement) ?? Number.POSITIVE_INFINITY;
}

export function comparePlacements(a, b) {
  const first = placementSortValue(a);
  const second = placementSortValue(b);
  if (first === second) return 0;
  return first - second;
}

export function hasPlacement(placement) {
  return parsePlacementNumber(placement) !== null;
}

export function isInProgressDemon(demon) {
  const status = String(demon?.status || "").toUpperCase().trim();
  return status === "IN PROGRESS";
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
  if (n === null) return null;
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

export function parseDemonDate(value) {
  return parseSupportedDate(value);
}

const FORMER_TOP_1 = {
  "Deadlocked": 2019,
  "The Behemoth": 2020,
  "Nine Circles": 2021,
  "Rupture": 2022,
  "Acu": 2023,
  "Make It Drop": 2025
};

function normalizePlacement(value) {
  if (value === null || value === undefined) return "";
  if (typeof value !== "string" && typeof value !== "number") return "";

  const text = String(value).trim();
  return parsePlacementNumber(value) === null ? "" : text;
}

function parsePlacementNumber(value) {
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0 ? value : null;
  }

  if (typeof value !== "string") return null;

  const text = value.trim();
  if (!text) return null;

  const match = text.match(/^#?\s*(\d+)(?:\s*[\u2022\u25b2\u25bc])?$/u);
  if (!match) return null;

  const placement = Number(match[1]);
  return Number.isInteger(placement) && placement > 0 ? placement : null;
}

function parseSupportedDate(value) {
  if (value === null || value === undefined) return null;

  if (typeof value === "number") {
    if (Number.isInteger(value) && value >= 1900 && value <= 2100) {
      return { year: value, month: null, day: null, yearOnly: true, timestamp: null };
    }

    if (Number.isFinite(value) && value > 0) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) {
        return {
          year: date.getUTCFullYear(),
          month: date.getUTCMonth() + 1,
          day: date.getUTCDate(),
          yearOnly: false,
          timestamp: date.getTime()
        };
      }
    }

    return null;
  }

  if (typeof value !== "string") return null;

  const text = String(value).trim();
  if (!text) return null;
  if (/^\d{4}$/.test(text)) {
    const year = Number(text);
    return year >= 1900 && year <= 2100
      ? { year, month: null, day: null, yearOnly: true, timestamp: null }
      : null;
  }

  const dayMonthYear = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dayMonthYear) {
    return buildCalendarDate(Number(dayMonthYear[3]), Number(dayMonthYear[2]), Number(dayMonthYear[1]));
  }

  const isoDate = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDate) {
    return buildCalendarDate(Number(isoDate[1]), Number(isoDate[2]), Number(isoDate[3]));
  }

  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return null;
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      yearOnly: false,
      timestamp: date.getTime()
    };
  }

  return null;
}

function buildCalendarDate(year, month, day) {
  if (year < 1900 || year > 2100) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;

  return {
    year,
    month,
    day,
    yearOnly: false,
    timestamp: new Date(year, month - 1, day).getTime()
  };
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function formatCalendarDate(year, month, day) {
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

