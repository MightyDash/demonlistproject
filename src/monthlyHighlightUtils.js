export const DEFAULT_MONTHLY_HIGHLIGHT_STYLE = Object.freeze({
  color: "#f3eaff",
  opacity: 1,
  fontSize: 30,
  fontFamily: "site",
  fontWeight: 800,
  italic: false,
  underline: false,
  letterSpacing: 0,
  outlineColor: "#100d18",
  outlineWidth: 0,
  shadowColor: "#000000",
  shadowOpacity: 0.55,
  shadowBlur: 8,
  shadowX: 0,
  shadowY: 3
});

const FONT_FAMILIES = {
  site: "Inter, ui-sans-serif, system-ui, sans-serif",
  display: '"Arial Black", Inter, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: '"Courier New", ui-monospace, monospace'
};

function boundedNumber(value, fallback, min, max) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function safeColor(value, fallback) {
  return /^#[0-9a-f]{6}$/i.test(String(value || "")) ? String(value).toLowerCase() : fallback;
}

export function normalizeMonthlyHighlightStyle(value = {}) {
  const fontFamily = Object.hasOwn(FONT_FAMILIES, value.fontFamily) ? value.fontFamily : "site";
  const fontWeight = [400, 500, 600, 700, 800, 900].includes(Number(value.fontWeight))
    ? Number(value.fontWeight)
    : DEFAULT_MONTHLY_HIGHLIGHT_STYLE.fontWeight;

  return {
    color: safeColor(value.color, DEFAULT_MONTHLY_HIGHLIGHT_STYLE.color),
    opacity: boundedNumber(value.opacity, 1, 0.2, 1),
    fontSize: boundedNumber(value.fontSize, 30, 18, 44),
    fontFamily,
    fontWeight,
    italic: value.italic === true,
    underline: value.underline === true,
    letterSpacing: boundedNumber(value.letterSpacing, 0, -2, 8),
    outlineColor: safeColor(value.outlineColor, DEFAULT_MONTHLY_HIGHLIGHT_STYLE.outlineColor),
    outlineWidth: boundedNumber(value.outlineWidth, 0, 0, 3),
    shadowColor: safeColor(value.shadowColor, DEFAULT_MONTHLY_HIGHLIGHT_STYLE.shadowColor),
    shadowOpacity: boundedNumber(value.shadowOpacity, 0.55, 0, 1),
    shadowBlur: boundedNumber(value.shadowBlur, 8, 0, 24),
    shadowX: boundedNumber(value.shadowX, 0, -12, 12),
    shadowY: boundedNumber(value.shadowY, 3, -12, 12)
  };
}

export function findMonthlyHighlightStyle(styles, year, month) {
  const saved = (styles || []).find(item =>
    Number(item.year) === Number(year) &&
    String(item.month || "").toLowerCase() === String(month || "").toLowerCase()
  );
  return normalizeMonthlyHighlightStyle(saved || DEFAULT_MONTHLY_HIGHLIGHT_STYLE);
}

function hexToRgba(hex, opacity) {
  const value = safeColor(hex, "#000000").slice(1);
  const channels = value.match(/.{2}/g).map(channel => Number.parseInt(channel, 16));
  return `rgba(${channels[0]}, ${channels[1]}, ${channels[2]}, ${opacity})`;
}

export function monthlyHighlightTextStyle(value) {
  const style = normalizeMonthlyHighlightStyle(value);
  return {
    color: style.color,
    opacity: style.opacity,
    fontSize: `${style.fontSize}px`,
    fontFamily: FONT_FAMILIES[style.fontFamily],
    fontWeight: style.fontWeight,
    fontStyle: style.italic ? "italic" : "normal",
    textDecoration: style.underline ? "underline" : "none",
    letterSpacing: `${style.letterSpacing}px`,
    WebkitTextStroke: `${style.outlineWidth}px ${style.outlineColor}`,
    textShadow: `${style.shadowX}px ${style.shadowY}px ${style.shadowBlur}px ${hexToRgba(style.shadowColor, style.shadowOpacity)}`
  };
}

export function getHardestMonthlyDemon(items) {
  return (items || []).reduce((hardest, item) => {
    const demon = item?.demon || item;
    if (!demon) return hardest;
    if (!hardest) return demon;

    const tierDifference = Number(demon.tier || 0) - Number(hardest.tier || 0);
    if (tierDifference !== 0) return tierDifference > 0 ? demon : hardest;

    const demonPlacement = Number.parseInt(String(demon.placement || "").match(/\d+/)?.[0] || "999999", 10);
    const hardestPlacement = Number.parseInt(String(hardest.placement || "").match(/\d+/)?.[0] || "999999", 10);
    return demonPlacement < hardestPlacement ? demon : hardest;
  }, null);
}
