const SEGMENTS = new Set(["all", "main", "extended", "legacy"]);
const PROGRESS_CATEGORIES = new Set(["all", "IN PROGRESS", "PLAN TO BEAT", "ON HOLD", "DROPPED", "COMPLETED"]);
const SPECIAL_VIEWS = new Set(["future", "duration", "level-id", "tier"]);

export function parseSharedFilters(search, { progress = false } = {}) {
  const params = new URLSearchParams(search || "");
  const requestedView = String(params.get("view") || "").toLowerCase();
  const requestedYear = String(params.get("year") || "");
  const requestedSegment = String(params.get("segment") || "all").toLowerCase();
  const requestedStatus = String(params.get("status") || "all").toUpperCase();
  const yearView = progress
    ? "progress"
    : /^\d{4}$/.test(requestedYear)
      ? requestedYear
      : SPECIAL_VIEWS.has(requestedView)
        ? requestedView
        : "all";

  return {
    query: params.get("q") || "",
    device: params.get("device") || "all",
    difficulty: params.get("difficulty") || "all",
    segment: SEGMENTS.has(requestedSegment) ? requestedSegment : "all",
    yearView,
    durationSort: params.get("sort") === "shortest" ? "shortest" : "longest",
    levelIdSort: params.get("sort") === "oldest" ? "oldest" : "newest",
    tierFilter: params.get("tier") || "",
    progressCategory: PROGRESS_CATEGORIES.has(requestedStatus) ? requestedStatus : "all"
  };
}

export function buildSharedFilterSearch(filters, { progress = false } = {}) {
  const params = new URLSearchParams();
  const query = String(filters.query || "").trim();
  if (query) params.set("q", query);
  if (filters.device && filters.device !== "all") params.set("device", filters.device);
  if (filters.difficulty && filters.difficulty !== "all") params.set("difficulty", filters.difficulty);
  if (!progress && filters.segment && filters.segment !== "all") params.set("segment", filters.segment);

  if (progress) {
    if (filters.progressCategory && filters.progressCategory !== "all") params.set("status", filters.progressCategory);
  } else if (/^\d{4}$/.test(String(filters.yearView || ""))) {
    params.set("year", String(filters.yearView));
  } else if (SPECIAL_VIEWS.has(filters.yearView)) {
    params.set("view", filters.yearView);
    if (filters.yearView === "duration" && filters.durationSort === "shortest") params.set("sort", "shortest");
    if (filters.yearView === "level-id" && filters.levelIdSort === "oldest") params.set("sort", "oldest");
    if (filters.yearView === "tier" && String(filters.tierFilter || "").trim()) params.set("tier", String(filters.tierFilter).trim());
  }

  const value = params.toString();
  return value ? `?${value}` : "";
}
