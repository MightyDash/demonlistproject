export const DEVICE_OPTIONS = ["PC", "Laptop", "Mobile"];

export function normalizeDevice(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "pc") return "PC";
  if (normalized === "laptop") return "Laptop";
  if (normalized === "mobile") return "Mobile";
  return "";
}
