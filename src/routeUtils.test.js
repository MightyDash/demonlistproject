import { describe, expect, it } from "vitest";
import { normalizeRoute, packSlug, parseDetailRoute, parseTimelineRoute, ROUTES } from "./routeUtils.js";

describe("routeUtils", () => {
  it.each([
    ["/", ROUTES.home],
    ["/demon-list", ROUTES.list],
    ["/statistics", ROUTES.statistics],
    ["/progress", ROUTES.progress],
    ["/collections", ROUTES.collections],
    ["/demon-requests/", ROUTES.requests],
    ["/recent-changes", ROUTES.history],
    ["/timeline", ROUTES.timeline],
    ["/beta-list", ROUTES.notFound],
    ["/admin-panel", ROUTES.notFound],
    ["/unknown", ROUTES.notFound],
    ["/demon/34057654", "/demon/34057654"],
    ["/progress/34057654", "/progress/34057654"],
    ["/collections/Nine-Circles-Pack", "/collections/nine-circles-pack"],
    ["/timeline/2024", "/timeline/2024"],
    ["/timeline/2018/january", "/timeline/2018/january"],
    ["/timeline/2018/January", "/timeline/2018/january"],
    ["/timeline/2026/overview", "/timeline/2026/overview"],
    ["/timeline/2026/Overview", "/timeline/2026/overview"],
    ["/timeline/compare", "/timeline/compare"],
    ["/timeline/2018/notamonth", ROUTES.timeline],
    ["/timeline/20a8/january", ROUTES.notFound],
    ["/timeline/2018/january/", "/timeline/2018/january"],
    ["/timeline/2018/january?x=1", ROUTES.notFound]
  ])("normalizes %s", (input, expected) => {
    expect(normalizeRoute(input)).toBe(expected);
  });

  it.each([
    ["/demon/34057654", { type: "demon", id: "34057654" }],
    ["/progress/34057654", { type: "progress", id: "34057654" }],
    ["/collections/nine-circles-pack", { type: "collection", slug: "nine-circles-pack" }],
    ["/timeline/2024", null]
  ])("parses detail route %s", (input, expected) => {
    expect(parseDetailRoute(input)).toEqual(expected);
  });

  it("creates stable readable pack slugs", () => {
    expect(packSlug({ name: "The Big 3!" })).toBe("the-big-3");
  });

  it.each([
    ["/timeline/2018/january", { year: 2018, month: "january", overview: false, compare: false }],
    ["/timeline/2024", { year: 2024, month: null, overview: false, compare: false }],
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
