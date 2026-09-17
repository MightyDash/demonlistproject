import { describe, expect, it } from "vitest";
import { isSafeNewsUrl, normalizeNewsArticle, sanitizeNewsHtml } from "./newsUtils.js";

describe("news utilities", () => {
  it("only accepts http and https URLs", () => {
    expect(isSafeNewsUrl("https://example.com/post")).toBe(true);
    expect(isSafeNewsUrl("javascript:alert(1)")).toBe(false);
  });

  it("removes scripts, handlers and unsafe links", () => {
    const clean = sanitizeNewsHtml('<p onclick="bad()">Hello <strong>world</strong></p><script>alert(1)</script><a href="javascript:bad()">bad</a>');
    expect(clean).toContain("<strong>world</strong>");
    expect(clean).not.toContain("onclick");
    expect(clean).not.toContain("script");
    expect(clean).not.toContain("javascript:");
  });

  it("normalizes unsafe article media to empty values", () => {
    const article = normalizeNewsArticle({ id: 1, coverImageUrl: "data:text/html,bad", sourceUrl: "https://example.com" });
    expect(article.id).toBe("1");
    expect(article.coverImageUrl).toBe("");
    expect(article.sourceUrl).toBe("https://example.com");
  });
});
