import React, { useEffect, useMemo, useState } from "react";
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
import { isInProgressDemon, normalizeDemon, placementNumber, segmentForPlacement } from "./demonUtils.js";

const ROUTES = {
  home: "/",
  requests: "/demon-requests",
  history: "/recent-changes",
  timeline: "/timeline",
  admin: "/admin-panel"
};

const DEFAULT_SITE_VERSION = "v0.62";
const DEFAULT_SITE_CHANGELOG = [
  "Added multiple site themes and theme-aware admin styling.",
  "Added skillset distribution on demon detail pages.",
  "Added safer admin tools with previews before heavy actions.",
  "Improved the desktop demon list, request page and list changes layout."
];

function normalizeRoute(pathname) {
  const path = pathname.replace(/\/+$/, "") || ROUTES.home;
  return Object.values(ROUTES).includes(path) ? path : ROUTES.home;
}

function themeSlug(theme) {
  return String(theme || "Basic").trim().toLowerCase().replace(/\s+/g, "-");
}

function getInitialSiteTheme() {
  if (typeof window === "undefined") return "Basic";

  try {
    return localStorage.getItem("site_theme") || "Basic";
  } catch {
    return "Basic";
  }
}

export default function App() {
  const [demons, setDemons] = useState([]);
  const [source, setSource] = useState("loading");
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState("all");
  const [difficultyOpen, setDifficultyOpen] = useState(false);
  const [segment, setSegment] = useState("all");
  const [selected, setSelected] = useState(null);
  const [yearView, setYearView] = useState("all");
  const [apiLatestDemon, setApiLatestDemon] = useState("");
  const [apiNextDemon, setApiNextDemon] = useState(null);
  const [listUpdatedAt, setListUpdatedAt] = useState("");
  const [siteTheme, setSiteTheme] = useState(getInitialSiteTheme);
  const [siteVersion, setSiteVersion] = useState(DEFAULT_SITE_VERSION);
  const [siteChangelog, setSiteChangelog] = useState(DEFAULT_SITE_CHANGELOG);
  const [futureListIds, setFutureListIds] = useState([]);
  const [viewMode, setViewMode] = useState("grid");
  const [requestView, setRequestView] = useState(false);
  const [historyView, setHistoryView] = useState(false);
  const [timelineView, setTimelineView] = useState(false);
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

  function applyRoute(pathname) {
    const route = normalizeRoute(pathname);

    setRequestView(route === ROUTES.requests);
    setHistoryView(route === ROUTES.history);
    setTimelineView(route === ROUTES.timeline);
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

  async function loadRequests({ silent = false } = {}) {
  if (!silent) setRequestsLoading(true);

  try {
    const response = await fetch(import.meta.env.VITE_APPS_SCRIPT_ADMIN_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "getRequests"
      })
    });

    const data = await response.json();

      if (data.success) {
        setRequests(data.requests || []);
        setSelectedRejectedRequests(selected =>
          selected.filter(rowNumber =>
            (data.requests || []).some(request => request.rowNumber === rowNumber)
          )
        );
      }
    } finally {
      if (!silent) setRequestsLoading(false);
    }
  }

  async function loadHistoryChanges({ silent = false } = {}) {
    if (!SHEET_API_URL) return;
    if (!silent) {
      setHistoryLoading(true);
      setHistoryError("");
    }

    try {
      const separator = SHEET_API_URL.includes("?") ? "&" : "?";
      const response = await fetch(`${SHEET_API_URL}${separator}view=history&limit=1000`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (data.siteTheme) setSiteTheme(data.siteTheme);
      if (data.siteVersion) setSiteVersion(data.siteVersion);
      if (Array.isArray(data.siteChangelog)) setSiteChangelog(data.siteChangelog);
      setHistoryChanges(data.changes || []);
    } catch (error) {
      setHistoryError("Could not load recent changes.");
    } finally {
      if (!silent) setHistoryLoading(false);
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

    return () => window.clearInterval(intervalId);
  }, [requestView]);

  useEffect(() => {
    if (!historyView) return;

    loadHistoryChanges();
    const intervalId = window.setInterval(() => {
      loadHistoryChanges({ silent: true });
    }, 30000);

    return () => window.clearInterval(intervalId);
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
    const theme = siteTheme || "Basic";
    document.documentElement.dataset.theme = themeSlug(theme);

    try {
      localStorage.setItem("site_theme", theme);
    } catch {
      // Ignore storage failures; backend theme still wins after loading.
    }
  }, [siteTheme]);

  useEffect(() => {
    const savedToken = localStorage.getItem("admin_token");
    if (!savedToken) return;

    const adminUrl = import.meta.env.VITE_APPS_SCRIPT_ADMIN_URL;
    if (!adminUrl) return;

    fetch(adminUrl, {
      method: "POST",
      body: JSON.stringify({ action: "verifyToken", token: savedToken }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setIsAdmin(true);
        } else {
          localStorage.removeItem("admin_token");
        }
      })
      .catch(() => localStorage.removeItem("admin_token"));
  }, []);

  useEffect(() => {
    async function loadData() {
      if (!SHEET_API_URL) {
        setDemons(mockDemons.map(normalizeDemon));
        setSource("mock");
        return;
      }

      try {
        const response = await fetch(SHEET_API_URL);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const json = await response.json();
        const rows = Array.isArray(json) ? json : json.demons || json.data || [];

        setApiLatestDemon(json.latestDemon || "");
        setApiNextDemon(json.nextDemon || null);
        setListUpdatedAt(json.listUpdatedAt || json.updatedAt || "");
        setSiteTheme(json.siteTheme || "Basic");
        setSiteVersion(json.siteVersion || DEFAULT_SITE_VERSION);
        setSiteChangelog(Array.isArray(json.siteChangelog) ? json.siteChangelog : DEFAULT_SITE_CHANGELOG);
        setFutureListIds(Array.isArray(json.futureListIds) ? json.futureListIds.map(String) : []);
        setDemons(rows.map(normalizeDemon));
        setSource("live");
      } catch (error) {
        console.warn("Could not load live sheet data. Using mock data.", error);
        setDemons(mockDemons.map(normalizeDemon));
        setSource("mock");
      }
    }

    loadData();
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
      const response = await fetch(adminUrl, {
        method: "POST",
        body: JSON.stringify({
          action: "login",
          username: loginData.username,
          password: loginData.password,
        }),
      });
      const data = await response.json();

      if (data.success && data.token) {
        setIsAdmin(true);
        setShowLogin(false);
        localStorage.setItem("admin_token", data.token);
        navigateTo(ROUTES.admin, { replace: true });
      } else {
        setLoginError("Wrong login");
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
      const response = await fetch(adminUrl, {
        method: "POST",
        body: JSON.stringify({
          action: "updateDemonNote",
          token,
          levelId: demon.id,
          note
        })
      });

      const data = await response.json();
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
      const response = await fetch(adminUrl, {
        method: "POST",
        body: JSON.stringify({
          action: "setSiteChangelog",
          token,
          version,
          changes
        })
      });

      const data = await response.json();
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
      const response = await fetch(adminUrl, {
        method: "POST",
        body: JSON.stringify({
          action: "setFutureListDemon",
          token,
          levelId,
          enabled
        })
      });
      const data = await response.json();

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
    const response = await fetch(import.meta.env.VITE_APPS_SCRIPT_ADMIN_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "submitRequest",
        levelId: requestForm.levelId,
        type: requestForm.type,
        notes: requestForm.notes
      })
    });

    const data = await response.json();

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
  } catch (error) {
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
    for (const [rowNumber, status] of changes) {
      const response = await fetch(import.meta.env.VITE_APPS_SCRIPT_ADMIN_URL, {
        method: "POST",
        body: JSON.stringify({
          action: "updateRequestStatus",
          rowNumber: Number(rowNumber),
          status,
          token: localStorage.getItem("admin_token")
        })
      });

      const data = await response.json();

      if (!data.success) {
        setRequestError(data.message || "Could not update the status.");
        return;
      }
    }

    setRequestStatusDrafts({});
    setRequestMessage("Status changes saved.");
    await loadRequests({ silent: true });
  } catch (error) {
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
    const response = await fetch(import.meta.env.VITE_APPS_SCRIPT_ADMIN_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "deleteRequest",
        rowNumber,
        token: localStorage.getItem("admin_token")
      })
    });

    const data = await response.json();

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
    const response = await fetch(import.meta.env.VITE_APPS_SCRIPT_ADMIN_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "allowWeightIncrease",
        rowNumber,
        token: localStorage.getItem("admin_token")
      })
    });

    const data = await response.json();

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
    const response = await fetch(import.meta.env.VITE_APPS_SCRIPT_ADMIN_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "allowWeightIncreaseForAll",
        token: localStorage.getItem("admin_token")
      })
    });

    const data = await response.json();

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
    const response = await fetch(import.meta.env.VITE_APPS_SCRIPT_ADMIN_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "deleteRequests",
        rowNumbers: selectedRejectedRequests,
        token: localStorage.getItem("admin_token")
      })
    });

    const data = await response.json();

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

        return placementNumber(a.placement) - placementNumber(b.placement);
      });
  }, [demons, query, difficulty, segment, yearView, futureListIds]);

  const currentIndex = useMemo(() => {
    if (!selected) return -1;
    return filtered.findIndex(
      d => d.id === selected.id && d.name === selected.name
    );
  }, [selected, filtered]);

  const displayedDemons = useMemo(() => {
    if (!isMobileView || viewMode !== "grid") return filtered;
    return filtered.slice(0, visibleDemonCount);
  }, [filtered, isMobileView, viewMode, visibleDemonCount]);

  const hasMoreMobileDemons =
    isMobileView && viewMode === "grid" && visibleDemonCount < filtered.length;

  function handleLatestDemonClick() {
    const latestName = String(apiLatestDemon || "").trim();
    if (!latestName) return;

    const latest = demons.find(
      demon => demon.name.toLowerCase() === latestName.toLowerCase()
    );

    if (!latest) return;

    const sortedDemons = demons
      .slice()
      .sort((a, b) => placementNumber(a.placement) - placementNumber(b.placement));
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

  function handleNextDemonClick() {
    const nextLevelId = String(apiNextDemon?.levelId || "").trim();
    const nextName = String(apiNextDemon?.name || "").trim();
    if (!nextLevelId && !nextName) return;

    const next = demons.find(demon =>
      (nextLevelId && String(demon.id) === nextLevelId) ||
      (nextName && demon.name.toLowerCase() === nextName.toLowerCase())
    );

    if (!next) return;

    setQuery("");
    setDifficulty("all");
    setSegment("all");
    setYearView("all");
    setViewMode("grid");

    window.setTimeout(() => {
      const escapedId = window.CSS?.escape ? window.CSS.escape(next.id) : next.id;
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
    <div className="app" data-theme={themeSlug(siteTheme)}>
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
          onDataChanged={() => window.location.reload()}
          siteTheme={siteTheme}
          onThemeChanged={setSiteTheme}
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
          onSelectDemon={setSelected}
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
          hasMoreDemons={hasMoreMobileDemons}
          onLoadMore={() => setVisibleDemonCount(count => count + 60)}
          apiLatestDemon={apiLatestDemon}
          listUpdatedAt={listUpdatedAt}
          onLatestDemonClick={handleLatestDemonClick}
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
