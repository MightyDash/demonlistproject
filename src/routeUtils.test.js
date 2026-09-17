import { describe, expect, it } from "vitest";
import { normalizeRoute, parseNewsRoute, parseTimelineRoute, ROUTES } from "./routeUtils.js";

describe("routeUtils", () => {
  it.each([
    ["/", ROUTES.home],
    ["/demon-requests/", ROUTES.requests],
    ["/recent-changes", ROUTES.history],
    ["/news", ROUTES.news],
    ["/news/abc-123", "/news/abc-123"],
    ["/timeline", ROUTES.timeline],
    ["/beta-list", ROUTES.home],
    ["/admin-panel", ROUTES.admin],
    ["/unknown", ROUTES.home],
    ["/timeline/2018/january", "/timeline/2018/january"],
    ["/timeline/2018/January", "/timeline/2018/january"],
    ["/timeline/2018/notamonth", ROUTES.timeline],
    ["/timeline/20a8/january", ROUTES.home],
    ["/timeline/2018/january/", "/timeline/2018/january"],
    ["/timeline/2018/january?x=1", ROUTES.home]
  ])("normalizes %s", (input, expected) => {
    expect(normalizeRoute(input)).toBe(expected);
  });

  it.each([
    ["/timeline/2018/january", { year: 2018, month: "january" }],
    ["/timeline/2026/december", { year: 2026, month: "december" }],
    ["/timeline/2026/March", { year: 2026, month: "march" }],
    ["/timeline/2026/notamonth", { year: null, month: null }],
    ["/timeline/january", { year: null, month: null }],
    ["/timeline/year/january", { year: null, month: null }],
    ["/timeline", { year: null, month: null }],
    ["/whatever", { year: null, month: null }]
  ])("parses %s", (input, expected) => {
    expect(parseTimelineRoute(input)).toEqual(expected);
  });
});

describe("parseNewsRoute", () => {
  it("returns an article id only for news detail routes", () => {
    expect(parseNewsRoute("/news/abc-123")).toBe("abc-123");
    expect(parseNewsRoute("/news")).toBeNull();
    expect(parseNewsRoute("/timeline")).toBeNull();
  });
});
