export const ROUTES = {
  home: "/",
  requests: "/demon-requests",
  history: "/recent-changes",
  timeline: "/timeline",
  betaList: "/beta-list",
  admin: "/admin-panel"
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

export function normalizeRoute(pathname) {
  const path = pathname.replace(/\/+$/, "") || ROUTES.home;
  if (/^\/timeline\/\d{4}\/[a-z]+$/i.test(path)) {
    const month = path.split("/")[3].toLowerCase();
    return TIMELINE_MONTH_SLUGS.has(month) ? path.toLowerCase() : ROUTES.timeline;
  }
  return Object.values(ROUTES).includes(path) ? path : ROUTES.home;
}

export function parseTimelineRoute(pathname) {
  const path = pathname.replace(/\/+$/, "") || ROUTES.home;
  const match = path.match(/^\/timeline\/(\d{4})\/([a-z]+)$/i);

  if (!match) return { year: null, month: null };

  const month = match[2].toLowerCase();
  return TIMELINE_MONTH_SLUGS.has(month)
    ? { year: Number(match[1]), month }
    : { year: null, month: null };
}
