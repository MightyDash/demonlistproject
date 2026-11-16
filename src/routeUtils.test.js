import { describe, expect, it } from "vitest";
import { normalizeRoute, parseTimelineRoute, ROUTES } from "./routeUtils.js";

describe("routeUtils", () => {
  it.each([
    ["/", ROUTES.home],
    ["/progress", ROUTES.progress],
    ["/collections", ROUTES.collections],
    ["/demon-requests/", ROUTES.requests],
    ["/recent-changes", ROUTES.history],
    ["/timeline", ROUTES.timeline],
    ["/beta-list", ROUTES.home],
    ["/admin-panel", ROUTES.home],
    ["/unknown", ROUTES.home],
    ["/timeline/2018/january", "/timeline/2018/january"],
    ["/timeline/2018/January", "/timeline/2018/january"],
    ["/timeline/2026/overview", "/timeline/2026/overview"],
    ["/timeline/2026/Overview", "/timeline/2026/overview"],
    ["/timeline/compare", "/timeline/compare"],
    ["/timeline/2018/notamonth", ROUTES.timeline],
    ["/timeline/20a8/january", ROUTES.home],
    ["/timeline/2018/january/", "/timeline/2018/january"],
    ["/timeline/2018/january?x=1", ROUTES.home]
  ])("normalizes %s", (input, expected) => {
    expect(normalizeRoute(input)).toBe(expected);
  });

  it.each([
    ["/timeline/2018/january", { year: 2018, month: "january", overview: false, compare: false }],
    ["/timeline/2026/december", { year: 2026, month: "december", overview: false, compare: false }],
    ["/timeline/2026/March", { year: 2026, month: "march", overview: false, compare: false }],
    ["/timeline/2026/overview", { year: 2026, month: null, overview: true, compare: false }],
    ["/timeline/compare", { year: null, month: null, overview: false, compare: true }],
    ["/timeline/2026/notamonth", { year: null, month: null, overview: false, compare: false }],
    ["/timeline/january", { year: null, month: null, overview: false, compare: false }],
    ["/timeline/year/january", { year: null, month: null, overview: false, compare: false }],
    ["/timeline", { year: null, month: null, overview: false, compare: false }],
    ["/whatever", { year: null, month: null, overview: false, compare: false }]
  ])("parses %s", (input, expected) => {
    expect(parseTimelineRoute(input)).toEqual(expected);
  });
});
