import React, { useEffect, useMemo, useRef, useState } from "react";
import { SHEET_API_URL } from "./config.js";
import { mockDemons } from "./mockData.js";
import { AdminPanel } from "./components/AdminPanel.jsx";
import { AppHeader } from "./components/AppHeader.jsx";
import { DemonListContent } from "./components/DemonListContent.jsx";
import { DemonModal } from "./components/DemonModal.jsx";
import { LoginModal } from "./components/LoginModal.jsx";
import { LogoutConfirm } from "./components/LogoutConfirm.jsx";
import { MilestonesModal } from "./components/MilestonesModal.jsx";
import { RecentChanges } from "./components/RecentChanges.jsx";
import { RequestPanel } from "./components/RequestPanel.jsx";
import { TimelinePage } from "./components/TimelineModal.jsx";
import { comparePlacements, isInProgressDemon, normalizeDemon, segmentForPlacement } from "./demonUtils.js";
import { requestJson } from "./api.js";
import { normalizeRoute, parseTimelineRoute, ROUTES } from "./routeUtils.js";

const DEFAULT_SITE_VERSION = "v0.62";
const DEFAULT_SITE_CHANGELOG = [
  "Switched the site to a cleaner fixed grayscale style.",
  "Added skillset distribution on demon detail pages.",
  "Added safer admin tools with previews before heavy actions.",
  "Improved the desktop demon list, request page and list changes layout."
];
const DEMON_DATA_CACHE_KEY = "moiks_demon_list_data_v1";

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
    timelineEntries: Array.isArray(payload?.timelineEntries) ? payload.timelineEntries : []
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
    // Cache is a speed boost only. The live list should keep working without it.
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
  const [difficulty, setDifficulty] = useState("all");
  const [difficultyOpen, setDifficultyOpen] = useState(false);
  const [segment, setSegment] = useState("all");
  const [selected, setSelected] = useState(null);
  const [yearView, setYearView] = useState("all");
  const [apiLatestDemon, setApiLatestDemon] = useState(() => initialDemonData?.apiLatestDemon || "");
  const [listUpdatedAt, setListUpdatedAt] = useState(() => initialDemonData?.listUpdatedAt || "");
  const [siteVersion, setSiteVersion] = useState(() => initialDemonData?.siteVersion || DEFAULT_SITE_VERSION);
  const [siteChangelog, setSiteChangelog] = useState(() => initialDemonData?.siteChangelog || DEFAULT_SITE_CHANGELOG);
  const [futureListIds, setFutureListIds] = useState(() => initialDemonData?.futureListIds || []);
  const [timelineEntries, setTimelineEntries] = useState(() => initialDemonData?.timelineEntries || []);
  const [viewMode, setViewMode] = useState("banner");
  const [requestView, setRequestView] = useState(false);
  const [historyView, setHistoryView] = useState(false);
  const [timelineView, setTimelineView] = useState(false);
  const [timelineRoute, setTimelineRoute] = useState({ year: null, month: null });
  const [requestForm, setRequestForm] = useState({
  levelId: "",
  type: "Classic",
  notes: ""
});
  const [requestSort, setRequestSort] = useState("weight");
  const [requestStatusFilter, setRequestStatusFilter] = useState("all");
  const [selectedRejectedRequests, setSelectedRejectedRequests] = useState([]);
  const [requestStatusDrafts, setRequestStatusDrafts] = useState({});
  const [requestStatusSaving, setRequestStatusSaving] = useState(false);
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [requestError, setRequestError] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [showMilestones, setShowMilestones] = useState(false);
  const [historyChanges, setHistoryChanges] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [adminView, setAdminView] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [visibleDemonCount, setVisibleDemonCount] = useState(60);
  const [demonListError, setDemonListError] = useState("");
  const requestsLoadRef = useRef({ id: 0, controller: null });
  const historyLoadRef = useRef({ id: 0, controller: null });
  const demonDataLoadRef = useRef({ id: 0, controller: null });
  const hasLoadedLiveDemonDataRef = useRef(Boolean(initialDemonData));

  function applyRoute(pathname) {
    const route = normalizeRoute(pathname);

    setRequestView(route === ROUTES.requests);
    setHistoryView(route === ROUTES.history);
    setTimelineView(route === ROUTES.timeline || route.startsWith(`${ROUTES.timeline}/`));
    setTimelineRoute(parseTimelineRoute(route));
    setAdminView(route === ROUTES.admin);
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
    const data = await requestJson(import.meta.env.VITE_APPS_SCRIPT_ADMIN_URL, {
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
        setSelectedRejectedRequests(selected =>
          selected.filter(rowNumber =>
            nextRequests.some(request => request.rowNumber === rowNumber)
          )
        );
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
    if (!requestView) return;

    loadRequests();
    const intervalId = window.setInterval(() => {
      loadRequests({ silent: true });
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
      abortRequestsLoad();
    };
  }, [requestView]);

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
    const mediaQuery = window.matchMedia("(max-width: 640px)");
    const updateMobileView = () => setIsMobileView(mediaQuery.matches);

    updateMobileView();
    mediaQuery.addEventListener("change", updateMobileView);

    return () => mediaQuery.removeEventListener("change", updateMobileView);
  }, []);

  useEffect(() => {
    setVisibleDemonCount(60);
  }, [query, difficulty, segment, yearView, viewMode, isMobileView]);

  useEffect(() => {
    const savedToken = localStorage.getItem("admin_token");
    if (!savedToken) return;

    const adminUrl = import.meta.env.VITE_APPS_SCRIPT_ADMIN_URL;
    if (!adminUrl) return;

    requestJson(adminUrl, {
      method: "POST",
      body: JSON.stringify({ action: "verifyToken", token: savedToken }),
    })
      .then(data => {
        if (data.success) {
          setIsAdmin(true);
        } else if (String(data.message || "").toLowerCase().includes("invalid token")) {
          localStorage.removeItem("admin_token");
        }
      })
      .catch(() => {});
  }, []);

  async function loadDemonData({ silent = false } = {}) {
    if (!SHEET_API_URL) {
      setDemons(mockDemons.map(normalizeDemon));
      setSource("mock");
      setDemonListError("");
      return;
    }

    demonDataLoadRef.current.controller?.abort();
    const controller = new AbortController();
    const requestId = demonDataLoadRef.current.id + 1;
    demonDataLoadRef.current = { id: requestId, controller };

    if (!silent) setSource("loading");

    try {
      const json = await requestJson(SHEET_API_URL, { signal: controller.signal });
      if (json.aborted || demonDataLoadRef.current.id !== requestId) return;
      if (json.success === false) throw new Error(json.message || "Could not load live sheet data.");
      const nextData = normalizeDemonPayload(json);
      if (!nextData) throw new Error("Live demon list response was missing demon rows.");

      setApiLatestDemon(nextData.apiLatestDemon);
      setListUpdatedAt(nextData.listUpdatedAt);
      setSiteVersion(nextData.siteVersion);
      setSiteChangelog(nextData.siteChangelog);
      setFutureListIds(nextData.futureListIds);
      setTimelineEntries(nextData.timelineEntries);
      setDemons(nextData.demons);
      setDemonListError("");
      setSource("live");
      writeCachedDemonData(nextData);
      hasLoadedLiveDemonDataRef.current = true;
    } catch (error) {
      if (demonDataLoadRef.current.id !== requestId) return;
      console.warn("Could not load live sheet data.", error);

      if (!hasLoadedLiveDemonDataRef.current) {
        setDemons([]);
        setSource("error");
        setDemonListError("Live demon list could not be loaded. This might be temporary, so try again or check back later.");
      } else if (!silent) {
        setDemonListError("Live demon list could not be refreshed. The current list is still shown.");
        setSource("live");
      }
    } finally {
      if (demonDataLoadRef.current.id === requestId) {
        demonDataLoadRef.current.controller = null;
      }
    }
  }

  useEffect(() => {
    loadDemonData({ silent: Boolean(initialDemonDataRef.current) });
    return () => abortDemonDataLoad();
  }, []);

  // ✅ FIXED: Login now sends credentials to the server for validation
  // Credentials are never stored in the frontend bundle
  async function handleLogin() {
    setLoginError("");
    const adminUrl = import.meta.env.VITE_APPS_SCRIPT_ADMIN_URL;

    if (!adminUrl) {
      setLoginError("Admin URL not configured.");
      return;
    }

    try {
      const data = await requestJson(adminUrl, {
        method: "POST",
        body: JSON.stringify({
          action: "login",
          username: loginData.username,
          password: loginData.password,
        }),
      });

      if (data.success && data.token) {
        setIsAdmin(true);
        setShowLogin(false);
        localStorage.setItem("admin_token", data.token);
        navigateTo(ROUTES.admin, { replace: true });
      } else {
        setLoginError(data.message || "Wrong login");
      }
    } catch {
      setLoginError("Could not reach server.");
    }
  }

  async function saveDemonNote(demon, note) {
    const adminUrl = import.meta.env.VITE_APPS_SCRIPT_ADMIN_URL;
    const token = localStorage.getItem("admin_token");

    if (!adminUrl || !token) {
      return { success: false, message: "Admin connection is not configured." };
    }

    try {
      const data = await requestJson(adminUrl, {
        method: "POST",
        body: JSON.stringify({
          action: "updateDemonNote",
          token,
          levelId: demon.id,
          note
        })
      });

      if (!data.success) {
        return { success: false, message: data.message || "Could not save note." };
      }

      const savedNote = data.note || "";

      setDemons(previous =>
        previous.map(item =>
          String(item.id) === String(demon.id) ? { ...item, notes: savedNote } : item
        )
      );
      setSelected(previous =>
        previous && String(previous.id) === String(demon.id)
          ? { ...previous, notes: savedNote }
          : previous
      );

      return { success: true, message: data.message || "Note saved." };
    } catch {
      return { success: false, message: "Could not connect." };
    }
  }

  async function saveSiteChangelog(version, changes) {
    const adminUrl = import.meta.env.VITE_APPS_SCRIPT_ADMIN_URL;
    const token = localStorage.getItem("admin_token");

    if (!adminUrl || !token) {
      return { success: false, message: "Admin connection is not configured." };
    }

    try {
      const data = await requestJson(adminUrl, {
        method: "POST",
        body: JSON.stringify({
          action: "setSiteChangelog",
          token,
          version,
          changes
        })
      });

      if (!data.success) {
        return { success: false, message: data.message || "Could not save changelog." };
      }

      setSiteVersion(data.version || version);
      setSiteChangelog(Array.isArray(data.changes) ? data.changes : changes);

      return { success: true, message: data.message || "Changelog saved." };
    } catch {
      return { success: false, message: "Could not connect." };
    }
  }

  async function toggleFutureListDemon(demon) {
    const adminUrl = import.meta.env.VITE_APPS_SCRIPT_ADMIN_URL;
    const token = localStorage.getItem("admin_token");
    const levelId = String(demon?.id || "").trim();

    if (!adminUrl || !token || !levelId) return;

    const enabled = !futureListIds.map(String).includes(levelId);

    setFutureListIds(previous =>
      enabled
        ? Array.from(new Set([...previous.map(String), levelId]))
        : previous.filter(id => String(id) !== levelId)
    );

    try {
      const data = await requestJson(adminUrl, {
        method: "POST",
        body: JSON.stringify({
          action: "setFutureListDemon",
          token,
          levelId,
          enabled
        })
      });

      if (!data.success) {
        setFutureListIds(previous =>
          enabled
            ? previous.filter(id => String(id) !== levelId)
            : Array.from(new Set([...previous.map(String), levelId]))
        );
        return;
      }

      setFutureListIds(Array.isArray(data.futureListIds) ? data.futureListIds.map(String) : []);
    } catch {
      setFutureListIds(previous =>
        enabled
          ? previous.filter(id => String(id) !== levelId)
          : Array.from(new Set([...previous.map(String), levelId]))
      );
    }
  }

  async function addTimelineEntry({ year, month, levelId }) {
    const adminUrl = import.meta.env.VITE_APPS_SCRIPT_ADMIN_URL;
    const token = localStorage.getItem("admin_token");

    if (!adminUrl || !token) {
      return { success: false, message: "Admin connection is not configured." };
    }

    try {
      const data = await requestJson(adminUrl, {
        method: "POST",
        body: JSON.stringify({
          action: "addTimelineEntry",
          token,
          year,
          month,
          levelId
        })
      });

      if (!data.success) {
        return { success: false, message: data.message || "Could not add demon to timeline." };
      }

      setTimelineEntries(Array.isArray(data.timelineEntries) ? data.timelineEntries : []);
      return { success: true, message: data.message || "Demon added to timeline." };
    } catch (error) {
      return {
        success: false,
        message: error?.message
          ? `Could not connect: ${error.message}`
          : "Could not connect."
      };
    }
  }

  async function removeTimelineEntry({ year, month, levelId }) {
    const adminUrl = import.meta.env.VITE_APPS_SCRIPT_ADMIN_URL;
    const token = localStorage.getItem("admin_token");

    if (!adminUrl || !token) {
      return { success: false, message: "Admin connection is not configured." };
    }

    try {
      const data = await requestJson(adminUrl, {
        method: "POST",
        body: JSON.stringify({
          action: "removeTimelineEntry",
          token,
          year,
          month,
          levelId
        })
      });

      if (!data.success) {
        return { success: false, message: data.message || "Could not remove demon from timeline." };
      }

      setTimelineEntries(Array.isArray(data.timelineEntries) ? data.timelineEntries : []);
      return { success: true, message: data.message || "Demon removed from timeline." };
    } catch (error) {
      return {
        success: false,
        message: error?.message
          ? `Could not connect: ${error.message}`
          : "Could not connect."
      };
    }
  }

  function handleLogout() {
    localStorage.removeItem("admin_token");
    setIsAdmin(false);
    setAdminView(false);
    setShowLogoutConfirm(false);
    navigateTo(ROUTES.home);
  }

  async function handleSubmitRequest() {
  setRequestLoading(true);
  setRequestMessage("");
  setRequestError("");

  try {
    abortRequestsLoad();
    const data = await requestJson(import.meta.env.VITE_APPS_SCRIPT_ADMIN_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "submitRequest",
        levelId: requestForm.levelId,
        type: requestForm.type,
        notes: requestForm.notes
      })
    });

    if (!data.success) {
      setRequestError(data.message || "Request failed.");
      return;
    }

    setRequestMessage("Request submitted successfully!");

    setRequestForm({
      levelId: "",
      type: "Classic",
      notes: ""
    });
    await loadRequests({ silent: true });
  } catch {
    setRequestError("Could not connect.");
  } finally {
    setRequestLoading(false);
  }
}
function handleRequestStatusDraft(rowNumber, status) {
  setRequestStatusDrafts(prev => ({
    ...prev,
    [rowNumber]: status
  }));
}

async function handleSaveRequestStatusChanges() {
  setRequestError("");
  setRequestMessage("");

  const changes = Object.entries(requestStatusDrafts);

  if (changes.length === 0) {
    setRequestMessage("There are no status changes to save.");
    return;
  }

  setRequestStatusSaving(true);

  try {
    abortRequestsLoad();
    for (const [rowNumber, status] of changes) {
      const data = await requestJson(import.meta.env.VITE_APPS_SCRIPT_ADMIN_URL, {
        method: "POST",
        body: JSON.stringify({
          action: "updateRequestStatus",
          rowNumber: Number(rowNumber),
          status,
          token: localStorage.getItem("admin_token")
        })
      });

      if (!data.success) {
        setRequestError(data.message || "Could not update the status.");
        return;
      }
    }

    setRequestStatusDrafts({});
    setRequestMessage("Status changes saved.");
    await loadRequests({ silent: true });
  } catch {
    setRequestError("Could not connect.");
  } finally {
    setRequestStatusSaving(false);
  }
}
  async function handleDeleteRequest(rowNumber) {
  setRequestError("");
  setRequestMessage("");

  const confirmDelete = window.confirm("Are you sure you want to delete this rejected request?");
  if (!confirmDelete) return;

  try {
    abortRequestsLoad();
    const data = await requestJson(import.meta.env.VITE_APPS_SCRIPT_ADMIN_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "deleteRequest",
        rowNumber,
        token: localStorage.getItem("admin_token")
      })
    });

    if (!data.success) {
      setRequestError(data.message || "Could not delete the request.");
      return;
    }

    setRequestMessage("Request deleted.");
    await loadRequests({ silent: true });
  } catch {
    setRequestError("Could not connect.");
  }
}
  async function handleAllowWeightIncrease(rowNumber) {
  setRequestError("");
  setRequestMessage("");

  try {
    abortRequestsLoad();
    const data = await requestJson(import.meta.env.VITE_APPS_SCRIPT_ADMIN_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "allowWeightIncrease",
        rowNumber,
        token: localStorage.getItem("admin_token")
      })
    });

    if (!data.success) {
      setRequestError(data.message || "Could not allow the weight increase.");
      return;
    }

    setRequestMessage("Weight increase is now allowed for this request.");
    await loadRequests({ silent: true });
  } catch {
    setRequestError("Could not connect.");
  }
  }
  async function handleAllowWeightIncreaseForAll() {
  setRequestError("");
  setRequestMessage("");

  const confirmOpen = window.confirm("Are you sure you want to allow weight increases for all requests?");
  if (!confirmOpen) return;

  try {
    abortRequestsLoad();
    const data = await requestJson(import.meta.env.VITE_APPS_SCRIPT_ADMIN_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "allowWeightIncreaseForAll",
        token: localStorage.getItem("admin_token")
      })
    });

    if (!data.success) {
      setRequestError(data.message || "Could not allow all weight increases.");
      return;
    }

    setRequestMessage(data.message || "Weight increases are now allowed for all requests.");
    await loadRequests({ silent: true });
  } catch {
    setRequestError("Could not connect.");
  }
}
  function handleToggleRejectedRequest(rowNumber) {
  setSelectedRejectedRequests(prev =>
    prev.includes(rowNumber)
      ? prev.filter(value => value !== rowNumber)
      : [...prev, rowNumber]
  );
}
  function handleSelectAllRejected(rowNumbers) {
  setSelectedRejectedRequests(prev => {
    const allSelected = rowNumbers.length > 0 && rowNumbers.every(rowNumber => prev.includes(rowNumber));
    if (allSelected) {
      return prev.filter(rowNumber => !rowNumbers.includes(rowNumber));
    }

    return Array.from(new Set([...prev, ...rowNumbers]));
  });
}
  async function handleDeleteSelectedRequests() {
  setRequestError("");
  setRequestMessage("");

  if (selectedRejectedRequests.length === 0) {
    setRequestMessage("No rejected requests selected.");
    return;
  }

  const confirmDelete = window.confirm(`Are you sure you want to delete ${selectedRejectedRequests.length} rejected requests?`);
  if (!confirmDelete) return;

  try {
    abortRequestsLoad();
    const data = await requestJson(import.meta.env.VITE_APPS_SCRIPT_ADMIN_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "deleteRequests",
        rowNumbers: selectedRejectedRequests,
        token: localStorage.getItem("admin_token")
      })
    });

    if (!data.success) {
      setRequestError(data.message || "Could not delete the selected requests.");
      return;
    }

    setSelectedRejectedRequests([]);
    setRequestMessage(data.message || "Selected requests deleted.");
    await loadRequests({ silent: true });
  } catch {
    setRequestError("Could not connect.");
  }
}
  const difficulties = useMemo(() => {
    const unique = new Set(demons.map(d => d.difficulty).filter(Boolean));
    return ["all", ...Array.from(unique)];
  }, [demons]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const futureIds = new Set(futureListIds.map(String));

    const matchesSearchAndDifficulty = demon => {
      const matchesQuery =
        !q ||
        demon.name.toLowerCase().includes(q) ||
        demon.creator.toLowerCase().includes(q) ||
        demon.id.toLowerCase().includes(q);

      const matchesDifficulty =
        difficulty === "all" || demon.difficulty === difficulty;

      return matchesQuery && matchesDifficulty;
    };

    if (yearView === "future") {
      return demons
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
        });
    }

    return demons
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

        return matchesSearchAndDifficulty(demon) && matchesStatus && matchesSegment && matchesYearView;
      })
      .sort((a, b) => {
        if (yearView === "progress") {
          return Number(b.progressPercent || 0) - Number(a.progressPercent || 0);
        }

        return comparePlacements(a.placement, b.placement);
      });
  }, [demons, query, difficulty, segment, yearView, futureListIds]);

  const currentIndex = useMemo(() => {
    if (!selected) return -1;
    return filtered.findIndex(
      d => d.id === selected.id && d.name === selected.name
    );
  }, [selected, filtered]);

  const displayedDemons = useMemo(() => {
    if (viewMode === "banner") return filtered.slice(0, visibleDemonCount);
    if (!isMobileView || viewMode !== "grid") return filtered;
    return filtered.slice(0, visibleDemonCount);
  }, [filtered, isMobileView, viewMode, visibleDemonCount]);

  const hasMoreDemons =
    (viewMode === "banner" || (isMobileView && viewMode === "grid")) &&
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
    setDifficulty("all");
    setSegment("all");
    setYearView("all");
    setViewMode("grid");

    if (latestIndex >= 0) {
      setVisibleDemonCount(Math.max(60, Math.ceil((latestIndex + 1) / 60) * 60));
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

  const stats = useMemo(() => {
    const completed = demons.filter(d => !isInProgressDemon(d));
    const totalAttempts = completed.reduce((sum, d) => sum + Number(d.attempts || 0), 0);
    const hardest = completed.slice().sort((a, b) => Number(b.tier) - Number(a.tier))[0];

    return {
      total: completed.length,
      attempts: totalAttempts,
      hardest
    };
  }, [demons]);

  return (
    <div className="app">
      <AppHeader
          adminView={adminView}
          source={source}
          isAdmin={isAdmin}
          historyView={historyView}
          requestView={requestView}
          timelineView={timelineView}
          onOpenRequests={() => {
            navigateTo(ROUTES.requests);
          }}
          onOpenHistory={() => {
            navigateTo(historyView ? ROUTES.home : ROUTES.history);
          }}
          onOpenLogin={() => setShowLogin(true)}
          onOpenAdmin={() => navigateTo(ROUTES.admin)}
          onOpenMilestones={() => setShowMilestones(true)}
          onOpenTimeline={() => {
            navigateTo(timelineView ? ROUTES.home : ROUTES.timeline);
          }}
          onCloseAdmin={() => navigateTo(ROUTES.home)}
          onOpenLogout={() => setShowLogoutConfirm(true)}
          siteVersion={siteVersion}
          siteChangelog={siteChangelog}
          onSaveChangelog={saveSiteChangelog}
        />

      {showLogoutConfirm && (
        <LogoutConfirm
          onConfirm={handleLogout}
          onCancel={() => setShowLogoutConfirm(false)}
        />
      )}

      {adminView ? (
        <AdminPanel
          onBack={() => navigateTo(ROUTES.home)}
          onDataChanged={() => loadDemonData({ silent: true })}
          demons={demons}
          requests={requests}
          onOpenRequests={() => navigateTo(ROUTES.requests)}
          onSaveNote={saveDemonNote}
        />
      ) : requestView ? (
        <RequestPanel
          onBack={() => navigateTo(ROUTES.home)}
          requestForm={requestForm}
          setRequestForm={setRequestForm}
          requestLoading={requestLoading}
          requestMessage={requestMessage}
          requestError={requestError}
          handleSubmitRequest={handleSubmitRequest}
          requests={requests}
          requestsLoading={requestsLoading}
          isAdmin={isAdmin}
          requestStatusDrafts={requestStatusDrafts}
          handleRequestStatusDraft={handleRequestStatusDraft}
          handleSaveRequestStatusChanges={handleSaveRequestStatusChanges}
          requestStatusSaving={requestStatusSaving}
          handleDeleteRequest={handleDeleteRequest}
          handleAllowWeightIncrease={handleAllowWeightIncrease}
          handleAllowWeightIncreaseForAll={handleAllowWeightIncreaseForAll}
          selectedRejectedRequests={selectedRejectedRequests}
          handleToggleRejectedRequest={handleToggleRejectedRequest}
          handleSelectAllRejected={handleSelectAllRejected}
          handleDeleteSelectedRequests={handleDeleteSelectedRequests}
          requestSort={requestSort}
          setRequestSort={setRequestSort}
          requestStatusFilter={requestStatusFilter}
          setRequestStatusFilter={setRequestStatusFilter}
        />
      ) : historyView ? (
        <RecentChanges
          changes={historyChanges}
          loading={historyLoading}
          error={historyError}
          onBack={() => navigateTo(ROUTES.home)}
        />
      ) : timelineView ? (
        <TimelinePage
          demons={demons}
          timelineEntries={timelineEntries}
          routeYear={timelineRoute.year}
          routeMonth={timelineRoute.month}
          isAdmin={isAdmin}
          onSelectDemon={setSelected}
          onOpenMonth={(year, month) => navigateTo(`${ROUTES.timeline}/${year}/${month}`)}
          onBackToTimeline={() => navigateTo(ROUTES.timeline)}
          onAddTimelineEntry={addTimelineEntry}
          onRemoveTimelineEntry={removeTimelineEntry}
        />
      ) : (
        <DemonListContent
          stats={stats}
          setSelected={setSelected}
          query={query}
          setQuery={setQuery}
          difficulty={difficulty}
          setDifficulty={setDifficulty}
          difficultyOpen={difficultyOpen}
          setDifficultyOpen={setDifficultyOpen}
          difficulties={difficulties}
          segment={segment}
          setSegment={setSegment}
          yearView={yearView}
          setYearView={setYearView}
          viewMode={viewMode}
          setViewMode={setViewMode}
          filtered={displayedDemons}
          totalCount={filtered.length}
          hasMoreDemons={hasMoreDemons}
          onLoadMore={() => setVisibleDemonCount(count => count + 60)}
          apiLatestDemon={apiLatestDemon}
          listUpdatedAt={listUpdatedAt}
          onLatestDemonClick={handleLatestDemonClick}
          demonListError={demonListError}
          onRetryDemonList={() => loadDemonData()}
          isAdmin={isAdmin}
          futureListIds={futureListIds}
          onToggleFutureListDemon={toggleFutureListDemon}
        />
      )}

      {selected && (
        <DemonModal
          demon={selected}
          onClose={() => setSelected(null)}
          onPrev={goToPrev}
          onNext={goToNext}
          hasPrev={currentIndex > 0}
          hasNext={currentIndex < filtered.length - 1}
          isAdmin={isAdmin}
          onSaveNote={saveDemonNote}
        />
      )}

      {showLogin && (
        <LoginModal
          loginData={loginData}
          setLoginData={setLoginData}
          loginError={loginError}
          handleLogin={handleLogin}
          onClose={() => {
            setShowLogin(false);
            setLoginError("");
          }}
        />
      )}

      {showMilestones && (
        <MilestonesModal
          demons={demons}
          onClose={() => setShowMilestones(false)}
        />
      )}

    </div>
  );
}
