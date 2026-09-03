import { describe, expect, it } from "vitest";
import { normalizeRoute, parseTimelineRoute, ROUTES } from "./routeUtils.js";

describe("routeUtils", () => {
  it.each([
    ["/", ROUTES.home],
    ["/demon-requests/", ROUTES.requests],
    ["/recent-changes", ROUTES.history],
    ["/timeline", ROUTES.timeline],
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
