import { useEffect, useState } from "react";
import { requestJson } from "./api.js";
import { SHEET_API_URL } from "./config.js";

const EMPTY_ENTRIES = [];

export function useProgressHistory(levelId) {
  const [attempt, setAttempt] = useState(0);
  const [response, setResponse] = useState(null);
  const requestKey = levelId ? `${levelId}:${attempt}` : "";

  useEffect(() => {
    if (!requestKey || !SHEET_API_URL) return;
    const controller = new AbortController();
    const url = new URL(SHEET_API_URL);
    url.searchParams.set("view", "progress-history");
    url.searchParams.set("levelId", levelId);

    async function load() {
      try {
        const data = await requestJson(url.toString(), { signal: controller.signal });
        if (controller.signal.aborted) return;
        if (data.success === false || !Array.isArray(data.entries)) throw new Error();
        setResponse({ requestKey, entries: data.entries });
      } catch {
        if (!controller.signal.aborted) {
          setResponse({ requestKey, error: "Progress history could not be loaded." });
        }
      }
    }

    load();
    return () => controller.abort();
  }, [levelId, requestKey]);

  const current = requestKey && response?.requestKey === requestKey ? response : null;
  return {
    entries: current?.entries || EMPTY_ENTRIES,
    loading: Boolean(requestKey && SHEET_API_URL && !current),
    error: current?.error || "",
    retry: () => setAttempt(value => value + 1)
  };
}
