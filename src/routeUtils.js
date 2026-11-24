export const ROUTES = {
  home: "/",
  list: "/demon-list",
  statistics: "/statistics",
  progress: "/progress",
  collections: "/collections",
  requests: "/demon-requests",
  history: "/recent-changes",
  timeline: "/timeline",
  notFound: "/not-found"
};

export const TIMELINE_MONTH_SLUGS = new Set([
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december"
]);

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}

export function normalizeRoute(pathname) {
  const path = pathname.replace(/\/+$/, "") || ROUTES.home;
  if (/^\/demon\/[^/]+$/i.test(path)) return path;
  if (/^\/progress\/[^/]+$/i.test(path)) return path;
  if (/^\/collections\/[^/]+$/i.test(path)) return path.toLowerCase();
  if (/^\/timeline\/compare$/i.test(path)) return `${ROUTES.timeline}/compare`;
  if (/^\/timeline\/\d{4}$/i.test(path)) return path.toLowerCase();
  if (/^\/timeline\/\d{4}\/overview$/i.test(path)) return path.toLowerCase();
  if (/^\/timeline\/\d{4}\/[a-z]+$/i.test(path)) {
    const month = path.split("/")[3].toLowerCase();
    return TIMELINE_MONTH_SLUGS.has(month) ? path.toLowerCase() : ROUTES.timeline;
  }
  return Object.values(ROUTES).includes(path) ? path : ROUTES.notFound;
}

export function parseDetailRoute(pathname) {
  const path = pathname.replace(/\/+$/, "") || ROUTES.home;
  const demonMatch = path.match(/^\/demon\/([^/]+)$/i);
  if (demonMatch) return { type: "demon", id: safeDecode(demonMatch[1]) };

  const progressMatch = path.match(/^\/progress\/([^/]+)$/i);
  if (progressMatch) return { type: "progress", id: safeDecode(progressMatch[1]) };

  const collectionMatch = path.match(/^\/collections\/([^/]+)$/i);
  if (collectionMatch) return { type: "collection", slug: safeDecode(collectionMatch[1]).toLowerCase() };

  return null;
}

export function packSlug(pack) {
  const name = String(pack?.name || pack?.id || "pack")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return name || "pack";
}

export function parseTimelineRoute(pathname) {
  const path = pathname.replace(/\/+$/, "") || ROUTES.home;
  if (path.toLowerCase() === `${ROUTES.timeline}/compare`) {
    return { year: null, month: null, overview: false, compare: true };
  }
  const yearMatch = path.match(/^\/timeline\/(\d{4})$/i);
  if (yearMatch) {
    return { year: Number(yearMatch[1]), month: null, overview: false, compare: false };
  }
  const match = path.match(/^\/timeline\/(\d{4})\/([a-z]+)$/i);

  if (!match) return { year: null, month: null, overview: false, compare: false };

  const month = match[2].toLowerCase();
  if (month === "overview") {
    return { year: Number(match[1]), month: null, overview: true, compare: false };
  }

  return TIMELINE_MONTH_SLUGS.has(month)
    ? { year: Number(match[1]), month, overview: false, compare: false }
    : { year: null, month: null, overview: false, compare: false };
}
