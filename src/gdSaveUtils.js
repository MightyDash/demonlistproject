const XOR_KEY = 11;

const STAT_KEYS = [
  ["6", "Stars"],
  ["5", "Demons"],
  ["8", "Secret coins"],
  ["12", "User coins"],
  ["13", "Diamonds"],
  ["14", "Orbs"],
  ["2", "Attempts"],
  ["1", "Jumps"],
  ["3", "Completed levels"],
  ["4", "Completed online levels"],
  ["7", "Map packs"],
  ["15", "Daily levels"]
];

export async function analyzeGdSaveFile(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const base64Text = xorDecode(bytes).replace(/\0/g, "").trim();
  const compressedBytes = base64ToBytes(base64Text);
  const xmlText = await gunzipBytes(compressedBytes);
  const parsed = parsePlist(xmlText);
  const flatEntries = flattenObject(parsed);
  const stats = collectStats(flatEntries);

  return {
    fileName: file.name,
    fileSize: file.size,
    xmlSize: xmlText.length,
    playerName: findFirstValue(flatEntries, ["GJA_001", "playerName"]) || "Unknown player",
    accountId: findFirstValue(flatEntries, ["GJA_003", "accountID", "accountId"]) || "",
    stats,
    entries: flatEntries.slice(0, 80)
  };
}

function xorDecode(bytes) {
  const decoded = new Uint8Array(bytes.length);
  for (let index = 0; index < bytes.length; index += 1) {
    decoded[index] = bytes[index] ^ XOR_KEY;
  }
  return new TextDecoder("utf-8").decode(decoded);
}

function base64ToBytes(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = window.atob(padded);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

async function gunzipBytes(bytes) {
  if (!("DecompressionStream" in window)) {
    throw new Error("This browser cannot unpack Geometry Dash saves yet.");
  }

  const stream = new Blob([bytes]).stream().pipeThrough(new window.DecompressionStream("gzip"));
  return await new Response(stream).text();
}

function parsePlist(xmlText) {
  const document = new DOMParser().parseFromString(xmlText, "application/xml");
  const parserError = document.querySelector("parsererror");
  if (parserError) {
    throw new Error("The save file was decoded, but the XML could not be read.");
  }

  const root = document.querySelector("plist > dict, d");
  if (!root) {
    throw new Error("No readable Geometry Dash data was found in this save.");
  }

  return readDict(root);
}

function readDict(dictNode) {
  const output = {};
  const children = Array.from(dictNode.children);

  for (let index = 0; index < children.length; index += 1) {
    const keyNode = children[index];
    if (!isKeyNode(keyNode)) continue;

    const valueNode = children[index + 1];
    if (!valueNode) continue;

    output[keyNode.textContent] = readValue(valueNode);
    index += 1;
  }

  return output;
}

function readArray(arrayNode) {
  return Array.from(arrayNode.children).map(readValue);
}

function readValue(node) {
  const tag = node.tagName.toLowerCase();
  if (tag === "d" || tag === "dict") return readDict(node);
  if (tag === "a" || tag === "array") return readArray(node);
  if (tag === "i" || tag === "integer") return Number(node.textContent || 0);
  if (tag === "r" || tag === "real") return Number(node.textContent || 0);
  if (tag === "t" || tag === "true") return true;
  if (tag === "f" || tag === "false") return false;
  return node.textContent || "";
}

function isKeyNode(node) {
  const tag = node.tagName.toLowerCase();
  return tag === "k" || tag === "key";
}

function flattenObject(value, prefix = "") {
  if (value === null || value === undefined) return [];
  if (typeof value !== "object") {
    return [{ key: prefix, value }];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => flattenObject(item, prefix ? `${prefix}.${index}` : String(index)));
  }

  return Object.entries(value).flatMap(([key, item]) => {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    return flattenObject(item, nextPrefix);
  });
}

function collectStats(entries) {
  return STAT_KEYS.map(([key, label]) => {
    const match = entries.find(entry => entry.key === `GS_value.${key}` || entry.key.endsWith(`.GS_value.${key}`));
    const value = Number(match?.value ?? 0);
    return { key, label, value: Number.isFinite(value) ? value : 0 };
  }).filter(stat => stat.value > 0);
}

function findFirstValue(entries, keys) {
  const lowered = keys.map(key => key.toLowerCase());
  const match = entries.find(entry => lowered.includes(entry.key.split(".").pop().toLowerCase()));
  return match?.value ? String(match.value) : "";
}
