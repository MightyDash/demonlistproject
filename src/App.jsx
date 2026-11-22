import React, { useEffect, useMemo, useRef, useState } from "react";
import { ADMIN_API_URL, SHEET_API_URL } from "./config.js";
import { mockDemons } from "./mockData.js";
import { AppHeader } from "./components/AppHeader.jsx";
import { CollectionsPage } from "./components/CollectionsPage.jsx";
import { DemonListContent } from "./components/DemonListContent.jsx";
import { DemonModal } from "./components/DemonModal.jsx";
import { OfflineScreen } from "./components/OfflineScreen.jsx";
import { RecentChanges } from "./components/RecentChanges.jsx";
import { ProgressTrackerPage } from "./components/ProgressTrackerPage.jsx";
import { ScrollToTopButton } from "./components/ScrollToTopButton.jsx";
import { StatisticsPage } from "./components/StatisticsPage.jsx";
import { TimelinePage } from "./components/TimelineModal.jsx";
import { buildHistoricalRanking, comparePlacements, demonDurationSortValue, isInProgressDemon, normalizeDemon, segmentForPlacement } from "./demonUtils.js";
import { requestJson } from "./api.js";
import { normalizeRoute, parseTimelineRoute, ROUTES } from "./routeUtils.js";
import { matchesAttemptsFilter, pickRandomResult } from "./searchUtils.js";
import { matchesTierFilter } from "./tierFilterUtils.js";

const DEFAULT_SITE_VERSION = "v0.62";
const DEFAULT_SITE_CHANGELOG = [
  "Switched the site to a cleaner fixed grayscale style.",
  "Added skillset distribution on demon detail pages.",
  "Added safer admin tools with previews before heavy actions.",
  "Improved the desktop demon list, request page and list changes layout."
];
const DEMON_DATA_CACHE_KEY = "moiks_demon_list_data_v1";
const MOBILE_MEDIA_QUERY = "(max-width: 640px)";
const MOBILE_DEMON_BATCH_SIZE = 24;

function initialConnectionIssue() {
  return typeof navigator !== "undefined" && navigator.onLine === false
    ? "Your device appears to be offline. Reconnect to load the latest demon list."
    : "";
}

function getInitialMobileView() {
  return typeof window !== "undefined" && window.matchMedia(MOBILE_MEDIA_QUERY).matches;
}

function rowsFromDemonPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.demons)) return payload.demons;
  if (Array.isArray(payload?.data)) return payload.data;
  return null;
}

function normalizeDemonPayload(payload) {
  const rows = rowsFromDemonPayload(payload);
  if (!rows) return null;

  return {
    demons: rows.map(normalizeDemon),
    apiLatestDemon: payload?.latestDemon || "",
    listUpdatedAt: payload?.listUpdatedAt || payload?.updatedAt || "",
    siteVersion: payload?.siteVersion || DEFAULT_SITE_VERSION,
    siteChangelog: Array.isArray(payload?.siteChangelog) ? payload.siteChangelog : DEFAULT_SITE_CHANGELOG,
    futureListIds: Array.isArray(payload?.futureListIds) ? payload.futureListIds.map(String) : [],
    manualPlacementIds: Array.isArray(payload?.manualPlacementIds) ? payload.manualPlacementIds.map(String) : [],
    timelineEntries: Array.isArray(payload?.timelineEntries) ? payload.timelineEntries : [],
    monthlyRecaps: Array.isArray(payload?.monthlyRecaps) ? payload.monthlyRecaps : [],
    monthlyHighlightStyles: Array.isArray(payload?.monthlyHighlightStyles) ? payload.monthlyHighlightStyles : [],
    packs: Array.isArray(payload?.packs) ? payload.packs : []
  };
}

function readCachedDemonData() {
  try {
    const raw = window.localStorage.getItem(DEMON_DATA_CACHE_KEY);
    if (!raw) return null;

    const cached = JSON.parse(raw);
    const normalized = normalizeDemonPayload(cached);
    return normalized && normalized.demons.length > 0 ? normalized : null;
  } catch {
    return null;
  }
}

function writeCachedDemonData(payload) {
  try {
    window.localStorage.setItem(
      DEMON_DATA_CACHE_KEY,
      JSON.stringify({
        cachedAt: new Date().toISOString(),
        ...payload
      })
    );
  } catch {
    return;
  }
}

export default function App() {
  const initialDemonDataRef = useRef(undefined);
  if (initialDemonDataRef.current === undefined) {
    initialDemonDataRef.current = readCachedDemonData();
  }
  const initialDemonData = initialDemonDataRef.current;

  const [demons, setDemons] = useState(() => initialDemonData?.demons || []);
  const [source, setSource] = useState(() => initialDemonData ? "cache" : "loading");
  const [query, setQuery] = useState("");
  const [device, setDevice] = useState("all");
  const [deviceOpen, setDeviceOpen] = useState(false);
  const [difficulty, setDifficulty] = useState("all");
  const [difficultyOpen, setDifficultyOpen] = useState(false);
  const [segment, setSegment] = useState("all");
  const [selected, setSelected] = useState(null);
  const [yearView, setYearView] = useState("all");
  const [durationSort, setDurationSort] = useState("longest");
  const [levelIdSort, setLevelIdSort] = useState("newest");
  const [tierFilter, setTierFilter] = useState("");
  const [apiLatestDemon, setApiLatestDemon] = useState(() => initialDemonData?.apiLatestDemon || "");
  const [siteVersion, setSiteVersion] = useState(() => initialDemonData?.siteVersion || DEFAULT_SITE_VERSION);
  const [siteChangelog, setSiteChangelog] = useState(() => initialDemonData?.siteChangelog || DEFAULT_SITE_CHANGELOG);
  const [futureListIds, setFutureListIds] = useState(() => initialDemonData?.futureListIds || []);
  const [manualPlacementIds, setManualPlacementIds] = useState(() => initialDemonData?.manualPlacementIds || []);
  const [timelineEntries, setTimelineEntries] = useState(() => initialDemonData?.timelineEntries || []);
  const [monthlyRecaps, setMonthlyRecaps] = useState(() => initialDemonData?.monthlyRecaps || []);
  const [monthlyHighlightStyles, setMonthlyHighlightStyles] = useState(() => initialDemonData?.monthlyHighlightStyles || []);
  const [packs, setPacks] = useState(() => initialDemonData?.packs || []);
  const [isMobileView, setIsMobileView] = useState(getInitialMobileView);
  const [viewMode, setViewMode] = useState(() => getInitialMobileView() ? "grid" : "banner");
  const [requestView, setRequestView] = useState(false);
  const [progressView, setProgressView] = useState(false);
  const [collectionsView, setCollectionsView] = useState(false);
  const [progressCategory, setProgressCategory] = useState("all");
  const [historyView, setHistoryView] = useState(false);
  const [statisticsView, setStatisticsView] = useState(false);
  const [timelineView, setTimelineView] = useState(false);
  const [timelineRoute, setTimelineRoute] = useState({ year: null, month: null, overview: false, compare: false });
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [historyChanges, setHistoryChanges] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [visibleDemonCount, setVisibleDemonCount] = useState(MOBILE_DEMON_BATCH_SIZE);
  const [demonListError, setDemonListError] = useState("");
  const [connectionIssue, setConnectionIssue] = useState(initialConnectionIssue);
  const [reconnecting, setReconnecting] = useState(false);
  const requestsLoadRef = useRef({ id: 0, controller: null });
  const historyLoadRef = useRef({ id: 0, controller: null });
  const demonDataLoadRef = useRef({ id: 0, controller: null });
  const hasLoadedLiveDemonDataRef = useRef(Boolean(initialDemonData));
  const hasReachedLiveDemonDataRef = useRef(false);

  function applyRoute(pathname) {
    const route = normalizeRoute(pathname);
    const isProgressRoute = route === ROUTES.progress;

    setRequestView(route === ROUTES.requests);
    setProgressView(isProgressRoute);
    setCollectionsView(route === ROUTES.collections);
    setYearView(current => isProgressRoute ? "progress" : current === "progress" ? "all" : current);
    if (isProgressRoute) {
      setQuery("");
      setDevice("all");
      setDeviceOpen(false);
      setDifficulty("all");
      setDifficultyOpen(false);
      setSegment("all");
      setProgressCategory("all");
    }
    setHistoryView(route === ROUTES.history);
    setStatisticsView(route === ROUTES.statistics);
    setTimelineView(route === ROUTES.timeline || route.startsWith(`${ROUTES.timeline}/`));
    setTimelineRoute(parseTimelineRoute(route));
  }

  function navigateTo(pathname, { replace = false } = {}) {
    const route = normalizeRoute(pathname);
    const nextUrl = `${route}${window.location.search}${window.location.hash}`;

    if (window.location.pathname !== route) {
      if (replace) {
        window.history.replaceState({}, "", nextUrl);
      } else {
        window.history.pushState({}, "", nextUrl);
      }
    }

    applyRoute(route);
  }

  function abortRequestsLoad() {
    requestsLoadRef.current.controller?.abort();
    requestsLoadRef.current = {
      id: requestsLoadRef.current.id + 1,
      controller: null
    };
    setRequestsLoading(false);
  }

  function abortHistoryLoad() {
    historyLoadRef.current.controller?.abort();
    historyLoadRef.current = {
      id: historyLoadRef.current.id + 1,
      controller: null
    };
  }

  function abortDemonDataLoad() {
    demonDataLoadRef.current.controller?.abort();
    demonDataLoadRef.current = {
      id: demonDataLoadRef.current.id + 1,
      controller: null
    };
  }

  async function loadRequests({ silent = false } = {}) {
  if (silent && requestsLoadRef.current.controller) return;

  requestsLoadRef.current.controller?.abort();
  const controller = new AbortController();
  const requestId = requestsLoadRef.current.id + 1;
  requestsLoadRef.current = { id: requestId, controller };

  if (!silent) setRequestsLoading(true);

  try {
    const data = await requestJson(ADMIN_API_URL, {
      method: "POST",
      signal: controller.signal,
      body: JSON.stringify({
        action: "getRequests"
      })
    });

      if (data.aborted || requestsLoadRef.current.id !== requestId) return;

      if (data.success) {
        const nextRequests = Array.isArray(data.requests) ? data.requests : [];
        setRequests(nextRequests);
      } else if (!silent) {
        setRequestError(data.message || "Could not load requests.");
      }
    } catch {
      if (!silent && requestsLoadRef.current.id === requestId) setRequestError("Could not load requests.");
    } finally {
      if (requestsLoadRef.current.id === requestId) {
        requestsLoadRef.current.controller = null;
        if (!silent) setRequestsLoading(false);
      }
    }
  }

  async function loadHistoryChanges({ silent = false } = {}) {
    if (!SHEET_API_URL) return;
    if (silent && historyLoadRef.current.controller) return;

    historyLoadRef.current.controller?.abort();
    const controller = new AbortController();
    const requestId = historyLoadRef.current.id + 1;
    historyLoadRef.current = { id: requestId, controller };

    if (!silent) {
      setHistoryLoading(true);
      setHistoryError("");
    }

    try {
      const separator = SHEET_API_URL.includes("?") ? "&" : "?";
      const data = await requestJson(`${SHEET_API_URL}${separator}view=history&limit=1000`, {
        signal: controller.signal
      });
      if (data.aborted || historyLoadRef.current.id !== requestId) return;
      if (data.success === false) throw new Error(data.message || "Could not load recent changes.");
      if (data.siteVersion) setSiteVersion(data.siteVersion);
      if (Array.isArray(data.siteChangelog)) setSiteChangelog(data.siteChangelog);
      setHistoryChanges(data.changes || []);
      setHistoryError("");
    } catch {
      if (!silent && historyLoadRef.current.id === requestId) {
        setHistoryError("Could not load recent changes.");
      }
    } finally {
      if (historyLoadRef.current.id === requestId) {
        historyLoadRef.current.controller = null;
        if (!silent) setHistoryLoading(false);
      }
    }
  }

  useEffect(() => {
    applyRoute(window.location.pathname);

    function handlePopState() {
      applyRoute(window.location.pathname);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    loadRequests({ silent: true });
    return () => abortRequestsLoad();
  }, []);

  useEffect(() => {
    if (!historyView) return;

    loadHistoryChanges();
    const intervalId = window.setInterval(() => {
      loadHistoryChanges({ silent: true });
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
      abortHistoryLoad();
    };
  }, [historyView]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
    const updateMobileView = () => setIsMobileView(mediaQuery.matches);

    updateMobileView();
    mediaQuery.addEventListener("change", updateMobileView);

    return () => mediaQuery.removeEventListener("change", updateMobileView);
  }, []);

  useEffect(() => {
    function handleOffline() {
      setConnectionIssue("Your device appears to be offline. Reconnect to load the latest demon list.");
    }

    window.addEventListener("offline", handleOffline);
    return () => window.removeEventListener("offline", handleOffline);
  }, []);

  useEffect(() => {
    if (!requestView || !isMobileView) return;

    window.alert("This page is currently unavailable.");
    navigateTo(ROUTES.home, { replace: true });
  }, [requestView, isMobileView]);

  useEffect(() => {
    setVisibleDemonCount(MOBILE_DEMON_BATCH_SIZE);
  }, [query, difficulty, segment, yearView, tierFilter, viewMode, isMobileView]);

  useEffect(() => {
    const responsiveView = isMobileView ? "grid" : "banner";
    if (viewMode !== responsiveView) setViewMode(responsiveView);
  }, [isMobileView, viewMode]);

  async function loadDemonData({ silent = false } = {}) {
    if (!SHEET_API_URL) {
      setDemons(mockDemons.map(normalizeDemon));
      setSource("mock");
      setDemonListError("");
      setConnectionIssue("");
      return true;
    }

    demonDataLoadRef.current.controller?.abort();
    const controller = new AbortController();
    const requestId = demonDataLoadRef.current.id + 1;
    demonDataLoadRef.current = { id: requestId, controller };

    if (!silent && !hasLoadedLiveDemonDataRef.current) setSource("loading");

    try {
      const json = await requestJson(SHEET_API_URL, { signal: controller.signal });
      if (json.aborted || demonDataLoadRef.current.id !== requestId) return;
      if (json.success === false) {
        const loadError = new Error(json.message || "Could not load live sheet data.");
        loadError.networkError = Boolean(json.networkError);
        throw loadError;
      }
      const nextData = normalizeDemonPayload(json);
      if (!nextData) throw new Error("Live demon list response was missing demon rows.");

      setApiLatestDemon(nextData.apiLatestDemon);
      setSiteVersion(nextData.siteVersion);
      setSiteChangelog(nextData.siteChangelog);
      setFutureListIds(nextData.futureListIds);
      setManualPlacementIds(nextData.manualPlacementIds);
      setTimelineEntries(nextData.timelineEntries);
      setMonthlyRecaps(nextData.monthlyRecaps);
      setMonthlyHighlightStyles(nextData.monthlyHighlightStyles);
      setPacks(nextData.packs);
      setDemons(nextData.demons);
      setDemonListError("");
      setConnectionIssue("");
      setSource("live");
      writeCachedDemonData(nextData);
      hasLoadedLiveDemonDataRef.current = true;
      hasReachedLiveDemonDataRef.current = true;
      return true;
    } catch (error) {
      if (demonDataLoadRef.current.id !== requestId) return;
      console.warn("Could not load live sheet data.", error);

      const offline = error?.networkError || (typeof navigator !== "undefined" && navigator.onLine === false);
      if (offline || !hasLoadedLiveDemonDataRef.current) {
        setConnectionIssue(offline
          ? "The live demon list could not be reached. Check your internet connection and try again."
          : "The live data service is temporarily unavailable. Try reconnecting in a moment.");
      }

      if (!hasLoadedLiveDemonDataRef.current) {
        setDemons([]);
        setSource("error");
        setDemonListError("Live demon list could not be loaded. This might be temporary, so try again or check back later.");
      } else if (!silent) {
        setDemonListError("Live demon list could not be refreshed. The current list is still shown.");
        setSource(hasReachedLiveDemonDataRef.current ? "live" : "cache");
      }
      return false;
    } finally {
      if (demonDataLoadRef.current.id === requestId) {
        demonDataLoadRef.current.controller = null;
      }
    }
  }

  async function handleReconnect() {
    setReconnecting(true);
    setDemonListError("");

    try {
      const connected = await loadDemonData();
      if (connected) {
        setConnectionIssue("");
        loadRequests({ silent: true });
        if (historyView) loadHistoryChanges({ silent: true });
      }
    } finally {
      setReconnecting(false);
    }
  }

  useEffect(() => {
    loadDemonData({ silent: Boolean(initialDemonDataRef.current) });
    return () => abortDemonDataLoad();
  }, []);

  const difficulties = useMemo(() => {
    const unique = new Set(demons.map(d => d.difficulty).filter(Boolean));
    return ["all", ...Array.from(unique)];
  }, [demons]);

  const communityRequestedIds = useMemo(() => {
    return new Set(
      requests
        .map(request => String(request.levelId || "").trim())
        .filter(Boolean)
    );
  }, [requests]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const searchedYear = /^\d{4}$/.test(q) ? Number(q) : null;
    const songIdQuery = q.startsWith("song:") ? q.slice(5).trim() : null;
    const artistQuery = q.startsWith("artist:") ? q.slice(7).trim() : null;
    const tierQuery = q.startsWith("tier:") ? q.slice(5).trim() : null;
    const attemptsQuery = q.startsWith("attempts:") ? q.slice(9).trim() : null;
    const randomQuery = q === "random";
    const futureIds = new Set(futureListIds.map(String));
    const finalizeResults = results => randomQuery ? pickRandomResult(results) : results;

    const matchesSearchAndDifficulty = demon => {
      const matchesQuery = !q || (songIdQuery !== null
        ? Boolean(songIdQuery) && String(demon.song?.id || "").toLowerCase() === songIdQuery
        : artistQuery !== null
          ? Boolean(artistQuery) && String(demon.song?.artist || "").toLowerCase().includes(artistQuery)
          : tierQuery !== null
            ? Boolean(tierQuery) && matchesTierFilter(demon.tier, tierQuery)
            : attemptsQuery !== null
              ? Boolean(attemptsQuery) && matchesAttemptsFilter(demon.attempts, attemptsQuery)
              : randomQuery
                ? true
                : searchedYear
                  ? !isInProgressDemon(demon) && Number(demon.dateYear || demon.year || 0) === searchedYear
                  : demon.name.toLowerCase().includes(q) ||
                    demon.creator.toLowerCase().includes(q) ||
                    demon.id.toLowerCase().includes(q));

      const matchesDifficulty =
        difficulty === "all" || demon.difficulty === difficulty;

      const matchesDevice =
        device === "all" || demon.device === device;

      return matchesQuery && matchesDevice && matchesDifficulty;
    };

    if (yearView === "future") {
      return finalizeResults(demons
        .filter(demon => !isInProgressDemon(demon) || futureIds.has(String(demon.id)))
        .sort((a, b) => {
          const tierDifference = Number(b.tier || 0) - Number(a.tier || 0);
          if (tierDifference !== 0) return tierDifference;

          return String(a.name || "").localeCompare(String(b.name || ""));
        })
        .map((demon, index) => ({
          ...demon,
          futurePlacementNumber: index + 1,
          futurePlacement: `#${index + 1} •`
        }))
        .filter(demon => {
          const matchesSegment =
            segment === "all" || segmentForPlacement(demon.futurePlacement) === segment;

          return matchesSearchAndDifficulty(demon) && matchesSegment;
        }));
    }

    if (yearView === "duration") {
      const direction = durationSort === "shortest" ? 1 : -1;
      return finalizeResults(demons
        .filter(demon => {
          const matchesSegment = segment === "all" || segmentForPlacement(demon.placement) === segment;
          return !isInProgressDemon(demon) && matchesSearchAndDifficulty(demon) && matchesSegment;
        })
        .sort((a, b) => {
          const durationDifference = demonDurationSortValue(a) - demonDurationSortValue(b);
          if (durationDifference !== 0) return durationDifference * direction;
          return String(a.name || "").localeCompare(String(b.name || ""));
        }));
    }

    if (yearView === "level-id") {
      const direction = levelIdSort === "oldest" ? 1 : -1;
      return finalizeResults(demons
        .filter(demon => {
          const matchesSegment = segment === "all" || segmentForPlacement(demon.placement) === segment;
          return !isInProgressDemon(demon) && matchesSearchAndDifficulty(demon) && matchesSegment;
        })
        .sort((a, b) => {
          const firstId = Number(String(a.id || "").replace(/\D/g, ""));
          const secondId = Number(String(b.id || "").replace(/\D/g, ""));
          const firstHasId = Number.isFinite(firstId) && firstId > 0;
          const secondHasId = Number.isFinite(secondId) && secondId > 0;

          if (firstHasId !== secondHasId) return firstHasId ? -1 : 1;
          if (firstHasId && firstId !== secondId) return (firstId - secondId) * direction;
          return String(a.name || "").localeCompare(String(b.name || ""));
        }));
    }

    if (yearView === "tier") {
      return finalizeResults(demons
        .filter(demon => {
          const matchesSegment = segment === "all" || segmentForPlacement(demon.placement) === segment;
          return !isInProgressDemon(demon)
            && matchesSearchAndDifficulty(demon)
            && matchesSegment
            && matchesTierFilter(demon.tier, tierFilter);
        })
        .sort((a, b) => Number(b.tier || 0) - Number(a.tier || 0) || String(a.name || "").localeCompare(String(b.name || ""))));
    }

    const historicalYearSelected = /^\d{4}$/.test(String(yearView));
    if (historicalYearSelected) {
      return finalizeResults(buildHistoricalRanking(demons, yearView)
        .filter(demon => {
          const matchesSegment =
            segment === "all" || segmentForPlacement(demon.historicalPlacement) === segment;

          return matchesSearchAndDifficulty(demon) && matchesSegment;
        }));
    }

    return finalizeResults(demons
      .filter(demon => {
        const isInProgress = isInProgressDemon(demon);
        const showingInProgress = yearView === "progress";

        const matchesStatus = showingInProgress
            ? isInProgress
            : !isInProgress;

        const matchesSegment =
          showingInProgress || segment === "all" || segmentForPlacement(demon.placement) === segment;

        const matchesYearView =
          showingInProgress || yearView === "all" || Number(demon.dateYear || demon.year || 0) <= Number(yearView);

        const matchesProgressCategory = !showingInProgress || progressCategory === "all" || String(demon.progressCategory || "IN PROGRESS") === progressCategory;
        return matchesSearchAndDifficulty(demon) && matchesStatus && matchesSegment && matchesYearView && matchesProgressCategory;
      })
      .sort((a, b) => {
        if (yearView === "progress") {
          return Number(b.progressPercent || 0) - Number(a.progressPercent || 0);
        }

        return comparePlacements(a.placement, b.placement);
      }));
  }, [demons, query, device, difficulty, segment, yearView, futureListIds, durationSort, levelIdSort, tierFilter, progressCategory]);

  const currentIndex = useMemo(() => {
    if (!selected) return -1;
    return filtered.findIndex(
      d => d.id === selected.id && d.name === selected.name
    );
  }, [selected, filtered]);

  const displayedDemons = useMemo(() => {
    if (!isMobileView) return filtered;
    if (viewMode === "banner" || viewMode === "grid") return filtered.slice(0, visibleDemonCount);
    return filtered;
  }, [filtered, isMobileView, viewMode, visibleDemonCount]);

  const hasMoreDemons =
    isMobileView &&
    (viewMode === "banner" || viewMode === "grid") &&
    visibleDemonCount < filtered.length;

  function handleLatestDemonClick() {
    const latestName = String(apiLatestDemon || "").trim();
    if (!latestName) return;

    const latest = demons.find(
      demon => demon.name.toLowerCase() === latestName.toLowerCase()
    );

    if (!latest) return;

    const sortedDemons = demons
      .slice()
      .sort((a, b) => comparePlacements(a.placement, b.placement));
    const latestIndex = sortedDemons.findIndex(
      demon => demon.id === latest.id && demon.name === latest.name
    );

    setQuery("");
    setDevice("all");
    setDifficulty("all");
    setSegment("all");
    setYearView("all");

    if (latestIndex >= 0) {
      setVisibleDemonCount(
        Math.max(
          MOBILE_DEMON_BATCH_SIZE,
          Math.ceil((latestIndex + 1) / MOBILE_DEMON_BATCH_SIZE) * MOBILE_DEMON_BATCH_SIZE
        )
      );
    }

    window.setTimeout(() => {
      const escapedId = window.CSS?.escape ? window.CSS.escape(latest.id) : latest.id;
      const card = document.querySelector(`[data-demon-id="${escapedId}"]`);
      if (!card) return;

      card.scrollIntoView({ behavior: "smooth", block: "center" });
      card.classList.add("grid-card-highlight");
      window.setTimeout(() => card.classList.remove("grid-card-highlight"), 1800);
    }, 80);
  }

  function goToPrev() {
    if (currentIndex > 0) {
      setSelected(filtered[currentIndex - 1]);
    }
  }

  function goToNext() {
    if (currentIndex >= 0 && currentIndex < filtered.length - 1) {
      setSelected(filtered[currentIndex + 1]);
    }
  }

  function getThumbnailSrc(demon) {
  if (!demon?.id) return "";
  return `https://levelthumbs.prevter.me/thumbnail/${demon.id}`;
}

  useEffect(() => {
    if (currentIndex < 0) return;

    [-2, -1, 1, 2].forEach(offset => {
      const src = getThumbnailSrc(filtered[currentIndex + offset]);
      if (!src) return;
      const img = new Image();
      img.src = src;
    });
  }, [currentIndex, filtered]);

  useEffect(() => {
    if (currentIndex < 0) return;

    const preload = src => {
      if (!src) return;
      const img = new Image();
      img.src = src;
    };

    preload(filtered[currentIndex - 1]?.thumbnail);
    preload(filtered[currentIndex + 1]?.thumbnail);
  }, [currentIndex, filtered]);

  useEffect(() => {
    function handleKey(e) {
      if (!selected) return;
      if (e.key === "ArrowLeft") goToPrev();
      if (e.key === "ArrowRight") goToNext();
      if (e.key === "Escape") setSelected(null);
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selected, currentIndex, filtered]);

  const projectedFuturePlacements = useMemo(() => {
    const completedDemons = demons.filter(demon => !isInProgressDemon(demon));
    const comparePlacement = (a, b) => Number(b.tier || 0) - Number(a.tier || 0)
      || String(a.name || "").localeCompare(String(b.name || ""));

    return Object.fromEntries(demons
      .filter(demon => isInProgressDemon(demon) && String(demon.progressCategory || "IN PROGRESS").toUpperCase() === "PLAN TO BEAT")
      .map(demon => [
        String(demon.id),
        completedDemons.filter(completed => comparePlacement(completed, demon) < 0).length + 1
      ]));
  }, [demons]);

  function handleOpenRequests() {
    if (requestView) {
      navigateTo(ROUTES.home);
      return;
    }

    if (isMobileView) {
      window.alert("This page is currently unavailable.");
      return;
    }

    navigateTo(ROUTES.requests);
  }

  const demonListContent = (
    <DemonListContent
      setSelected={setSelected}
      query={query}
      setQuery={setQuery}
      device={device}
      setDevice={setDevice}
      deviceOpen={deviceOpen}
      setDeviceOpen={setDeviceOpen}
      difficulty={difficulty}
      setDifficulty={setDifficulty}
      difficultyOpen={difficultyOpen}
      setDifficultyOpen={setDifficultyOpen}
      difficulties={difficulties}
      segment={segment}
      setSegment={setSegment}
      yearView={yearView}
      setYearView={setYearView}
      durationSort={durationSort}
      setDurationSort={setDurationSort}
      levelIdSort={levelIdSort}
      setLevelIdSort={setLevelIdSort}
      tierFilter={tierFilter}
      setTierFilter={setTierFilter}
      viewMode={viewMode}
      setViewMode={setViewMode}
      filtered={displayedDemons}
      totalCount={filtered.length}
      hasMoreDemons={hasMoreDemons}
      onLoadMore={() => setVisibleDemonCount(count => count + MOBILE_DEMON_BATCH_SIZE)}
      apiLatestDemon={apiLatestDemon}
      onLatestDemonClick={handleLatestDemonClick}
      demonListError={demonListError}
      onRetryDemonList={() => loadDemonData()}
      progressTrackerView={progressView}
      isMobileView={isMobileView}
      futureListIds={futureListIds}
      communityRequestedIds={communityRequestedIds}
    />
  );

  return (
    <div className={`app ${timelineView ? "timeline-app" : ""} ${collectionsView ? "collections-app" : ""} ${statisticsView ? "statistics-app" : ""}`}>
      <AppHeader
          source={source}
          historyView={historyView}
          progressView={progressView}
          collectionsView={collectionsView}
          statisticsView={statisticsView}
          requestView={requestView}
          timelineView={timelineView}
          onOpenList={() => navigateTo(ROUTES.home)}
          onOpenProgress={() => navigateTo(progressView ? ROUTES.home : ROUTES.progress)}
          onOpenCollections={() => navigateTo(collectionsView ? ROUTES.home : ROUTES.collections)}
          onOpenStatistics={() => navigateTo(statisticsView ? ROUTES.home : ROUTES.statistics)}
          onOpenRequests={handleOpenRequests}
          onOpenHistory={() => {
            navigateTo(historyView ? ROUTES.home : ROUTES.history);
          }}
          onOpenTimeline={() => {
            navigateTo(timelineView ? ROUTES.home : ROUTES.timeline);
          }}
          siteVersion={siteVersion}
          siteChangelog={siteChangelog}
        />

      {requestView ? (
        <>
          <div className="requests-under-construction-page" aria-hidden="true">
            {demonListContent}
          </div>
          <div className="requests-under-construction-overlay" role="dialog" aria-modal="true">
            <section className="requests-under-construction-card">
              <p className="login-eyebrow">Demon Requests</p>
              <h2>This page is under construction.</h2>
              <button className="login-button" onClick={() => navigateTo(ROUTES.home)} type="button">
                Back to list
              </button>
            </section>
          </div>
        </>
      ) : historyView ? (
        <RecentChanges
          changes={historyChanges}
          loading={historyLoading}
          error={historyError}
          onBack={() => navigateTo(ROUTES.home)}
        />
      ) : collectionsView ? (
        <CollectionsPage demons={demons} packs={packs} />
      ) : statisticsView ? (
        <StatisticsPage demons={demons} onSelectDemon={setSelected} />
      ) : timelineView ? (
        <TimelinePage
          demons={demons}
          timelineEntries={timelineEntries}
          monthlyRecaps={monthlyRecaps}
          monthlyHighlightStyles={monthlyHighlightStyles}
          routeYear={timelineRoute.year}
          routeMonth={timelineRoute.month}
          routeOverview={timelineRoute.overview}
          routeCompare={timelineRoute.compare}
          onSelectDemon={setSelected}
          onOpenMonth={(year, month) => navigateTo(`${ROUTES.timeline}/${year}/${month}`)}
          onOpenYearOverview={year => navigateTo(`${ROUTES.timeline}/${year}/overview`)}
          onOpenYearComparison={() => navigateTo(`${ROUTES.timeline}/compare`)}
          onBackToTimeline={() => navigateTo(ROUTES.timeline)}
        />
      ) : progressView ? (
        <ProgressTrackerPage demons={demons.filter(isInProgressDemon)} activeFilter={progressCategory} onFilterChange={setProgressCategory} onSelectDemon={setSelected} projectedPlacements={projectedFuturePlacements} />
      ) : demonListContent}

      {selected && (
        <DemonModal
          demon={selected}
          onClose={() => setSelected(null)}
          onPrev={goToPrev}
          onNext={goToNext}
          hasPrev={currentIndex > 0}
          hasNext={currentIndex < filtered.length - 1}
          isCommunityRequested={communityRequestedIds.has(String(selected.id || "").trim())}
        />
      )}

      <ScrollToTopButton />

      {connectionIssue && (
        <OfflineScreen
          message={connectionIssue}
          reconnecting={reconnecting}
          hasCachedData={hasLoadedLiveDemonDataRef.current && demons.length > 0}
          onReconnect={handleReconnect}
          onContinue={() => setConnectionIssue("")}
        />
      )}

    </div>
  );
}
