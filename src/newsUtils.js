const ALLOWED_TAGS = new Set([
  "A", "B", "BLOCKQUOTE", "BR", "DIV", "EM", "FIGCAPTION", "FIGURE",
  "FONT", "H2", "H3", "H4", "HR", "I", "IMG", "LI", "OL", "P", "SPAN",
  "STRIKE", "STRONG", "U", "UL"
]);

const ALLOWED_CLASSES = new Set([
  "news-embed-card", "news-embed-copy", "news-embed-title", "news-embed-url",
  "news-article-image", "text-align-center", "text-align-right"
]);

export function isSafeNewsUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function sanitizeNewsHtml(html) {
  if (typeof document === "undefined") return String(html || "");

  const parser = new DOMParser();
  const parsed = parser.parseFromString(`<div>${String(html || "")}</div>`, "text/html");
  const root = parsed.body.firstElementChild;

  [...root.querySelectorAll("*")].forEach(element => {
    if (!ALLOWED_TAGS.has(element.tagName)) {
      if (["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "FORM"].includes(element.tagName)) {
        element.remove();
      } else {
        element.replaceWith(...element.childNodes);
      }
      return;
    }

    const textAlign = String(element.getAttribute("style") || "").match(/text-align\s*:\s*(center|right)/i)?.[1]?.toLowerCase();
    if (textAlign === "center") element.classList.add("text-align-center");
    if (textAlign === "right") element.classList.add("text-align-right");

    [...element.attributes].forEach(attribute => {
      const name = attribute.name.toLowerCase();
      const allowed =
        (element.tagName === "A" && ["href", "title", "target", "rel", "class"].includes(name)) ||
        (element.tagName === "IMG" && ["src", "alt", "title", "loading", "class"].includes(name)) ||
        (element.tagName === "FONT" && name === "color") ||
        name === "class";
      if (!allowed) element.removeAttribute(attribute.name);
    });

    if (element.hasAttribute("class")) {
      const cleanClasses = String(element.getAttribute("class") || "")
        .split(/\s+/)
        .filter(className => ALLOWED_CLASSES.has(className));
      if (cleanClasses.length) element.setAttribute("class", cleanClasses.join(" "));
      else element.removeAttribute("class");
    }

    if (element.tagName === "A") {
      const href = element.getAttribute("href");
      if (!isSafeNewsUrl(href)) element.removeAttribute("href");
      else {
        element.setAttribute("target", "_blank");
        element.setAttribute("rel", "noopener noreferrer");
      }
    }

    if (element.tagName === "IMG") {
      if (!isSafeNewsUrl(element.getAttribute("src"))) element.remove();
      else element.setAttribute("loading", "lazy");
    }
  });

  return root.innerHTML;
}

export function normalizeNewsArticle(article) {
  return {
    id: String(article?.id || ""),
    title: String(article?.title || ""),
    excerpt: String(article?.excerpt || ""),
    content: String(article?.content || ""),
    coverImageUrl: isSafeNewsUrl(article?.coverImageUrl) ? article.coverImageUrl : "",
    sourceLabel: String(article?.sourceLabel || ""),
    sourceUrl: isSafeNewsUrl(article?.sourceUrl) ? article.sourceUrl : "",
    status: article?.status === "published" ? "published" : "draft",
    pinned: article?.pinned === true,
    createdAt: String(article?.createdAt || ""),
    updatedAt: String(article?.updatedAt || ""),
    publishedAt: String(article?.publishedAt || "")
  };
}

export function formatNewsDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}
