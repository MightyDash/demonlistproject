import React, { useEffect, useMemo, useState } from "react";
import { SHEET_API_URL } from "./config.js";
import { mockDemons } from "./mockData.js";
import { AdminPanel } from "./components/AdminPanel.jsx";
import { AppHeader } from "./components/AppHeader.jsx";
import { DemonListContent } from "./components/DemonListContent.jsx";
import { DemonModal } from "./components/DemonModal.jsx";
import { LoginModal } from "./components/LoginModal.jsx";
import { LogoutConfirm } from "./components/LogoutConfirm.jsx";
import { ProfilePage } from "./components/ProfilePage.jsx";
import { RecentChanges } from "./components/RecentChanges.jsx";
import { RequestPanel } from "./components/RequestPanel.jsx";
import { normalizeDemon, placementNumber, segmentForPlacement } from "./demonUtils.js";
import { isSupabaseConfigured, supabase } from "./supabaseClient.js";

const ROUTES = {
  home: "/",
  requests: "/demon-requests",
  history: "/recent-changes",
  profile: "/profile",
  admin: "/admin-panel"
};

const ACCOUNT_PREVIEW_ITEMS = [
  "Build your own demon list",
  "Save favorites",
  "Track personal progress"
];

function accountStorageKey(user) {
  return user?.email ? `demon_account_${user.email.toLowerCase()}` : "";
}

function createEmptyAccountData() {
  return {
    favorites: [],
    progress: {},
    personalList: null
  };
}

function userFromSupabaseUser(user) {
  if (!user) return null;

  const metadata = user.user_metadata || {};

  return {
    id: user.id,
    name:
      metadata.full_name ||
      metadata.name ||
      metadata.user_name ||
      user.email ||
      "User",
    email: user.email || "",
    picture: metadata.avatar_url || metadata.picture || ""
  };
}

function normalizeRoute(pathname) {
  const path = pathname.replace(/\/+$/, "") || ROUTES.home;
  return Object.values(ROUTES).includes(path) ? path : ROUTES.home;
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
  const [viewMode, setViewMode] = useState("grid");
  const [requestView, setRequestView] = useState(false);
  const [historyView, setHistoryView] = useState(false);
  const [profileView, setProfileView] = useState(false);
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
  const [currentUser, setCurrentUser] = useState(null);
  const [accountData, setAccountData] = useState(createEmptyAccountData);
  const [historyChanges, setHistoryChanges] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [adminView, setAdminView] = useState(false);
  const [skillsetOpen, setSkillsetOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [visibleDemonCount, setVisibleDemonCount] = useState(60);

  function applyRoute(pathname) {
    const route = normalizeRoute(pathname);

    setRequestView(route === ROUTES.requests);
    setHistoryView(route === ROUTES.history);
    setProfileView(route === ROUTES.profile);
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

  async function syncSupabaseProfile(user) {
    if (!supabase || !user) return;

    await supabase.from("profiles").upsert({
      id: user.id,
      display_name: user.name,
      avatar_url: user.picture,
      updated_at: new Date().toISOString()
    });
  }

  async function loadSupabaseFavorites(user) {
    if (!supabase || !user?.id) return;

    const { data, error } = await supabase
      .from("favorites")
      .select("level_id")
      .eq("user_id", user.id);

    if (error) {
      console.warn("Could not load Supabase favorites.", error);
      return;
    }

    setAccountData(prev => ({
      ...prev,
      favorites: (data || []).map(row => String(row.level_id))
    }));
  }

  async function handleSupabaseLogin() {
    setLoginError("");

    if (!supabase) {
      setLoginError("Supabase login is nog niet geconfigureerd.");
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}${ROUTES.profile}`
      }
    });

    if (error) {
      setLoginError(error.message || "Google login kon niet worden gestart.");
    }
  }

  function updateAccountData(updater) {
    if (!currentUser) {
      navigateTo(ROUTES.profile);
      setShowLogin(true);
      return;
    }

    setAccountData(prev => {
      const nextData = updater(prev);
      const key = accountStorageKey(currentUser);
      if (key) localStorage.setItem(key, JSON.stringify(nextData));
      return nextData;
    });
  }

  async function toggleFavorite(demon) {
    if (!currentUser) {
      navigateTo(ROUTES.profile);
      setShowLogin(true);
      return;
    }

    const levelId = String(demon.id);
    const exists = accountData.favorites.map(id => String(id)).includes(levelId);

    updateAccountData(prev => ({
      ...prev,
      favorites: exists
        ? prev.favorites.filter(id => String(id) !== levelId)
        : Array.from(new Set([...prev.favorites.map(id => String(id)), levelId]))
    }));

    if (!supabase || !currentUser.id) return;

    const result = exists
      ? await supabase
          .from("favorites")
          .delete()
          .eq("user_id", currentUser.id)
          .eq("level_id", levelId)
      : await supabase
          .from("favorites")
          .insert({
            user_id: currentUser.id,
            level_id: levelId
          });

    if (result.error) {
      console.warn("Could not update Supabase favorite.", result.error);
      setAccountData(prev => ({
        ...prev,
        favorites: exists
          ? Array.from(new Set([...prev.favorites.map(id => String(id)), levelId]))
          : prev.favorites.filter(id => String(id) !== levelId)
      }));
    }
  }

  function setDemonProgress(demon, status) {
    updateAccountData(prev => {
      const progress = { ...prev.progress };

      if (!status) {
        delete progress[demon.id];
      } else {
        progress[demon.id] = {
          status,
          updatedAt: new Date().toISOString()
        };
      }

      return { ...prev, progress };
    });
  }

  function createPersonalList() {
    updateAccountData(prev => {
      if (prev.personalList) return prev;

      return {
        ...prev,
        personalList: {
          id: `personal-${Date.now()}`,
          name: `${currentUser?.name || "My"}'s Demon List`,
          createdAt: new Date().toISOString()
        }
      };
    });
  }

  function openPersonalList() {
    window.alert("Your personal Demon List page is coming next.");
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

      console.log("getRequests response:", data);

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
      const response = await fetch(`${SHEET_API_URL}${separator}view=history&limit=60`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
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
    if (profileView && !currentUser) {
      setShowLogin(true);
    }
  }, [profileView, currentUser]);

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
    if (!supabase) return;

    let mounted = true;

    async function loadSupabaseSession() {
      const { data } = await supabase.auth.getSession();
      const user = userFromSupabaseUser(data.session?.user);

      if (!mounted) return;

      setCurrentUser(user);
      if (user) {
        syncSupabaseProfile(user).catch(error => {
          console.warn("Could not sync Supabase profile.", error);
        });
        loadSupabaseFavorites(user);
      }
    }

    loadSupabaseSession();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      const user = userFromSupabaseUser(session?.user);
      setCurrentUser(user);
      setShowLogin(false);

      if (user) {
        syncSupabaseProfile(user).catch(error => {
          console.warn("Could not sync Supabase profile.", error);
        });
        loadSupabaseFavorites(user);
        if (event === "SIGNED_IN") {
          navigateTo(ROUTES.profile, { replace: true });
        }
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setAccountData(createEmptyAccountData());
      return;
    }

    try {
      const savedData = JSON.parse(localStorage.getItem(accountStorageKey(currentUser)) || "null");
      setAccountData({
        ...createEmptyAccountData(),
        ...(savedData || {}),
        favorites: supabase && currentUser.id
          ? []
          : (savedData?.favorites || []).map(id => String(id))
      });
    } catch {
      setAccountData(createEmptyAccountData());
    }
  }, [currentUser]);

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
        return { success: false, message: data.message || "Could not save memory." };
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

      return { success: true, message: data.message || "Memory saved." };
    } catch {
      return { success: false, message: "Kon geen verbinding maken." };
    }
  }

  function handleLogout() {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("site_user");
    if (supabase) {
      supabase.auth.signOut();
    }
    setIsAdmin(false);
    setCurrentUser(null);
    setAccountData(createEmptyAccountData());
    setAdminView(false);
    setProfileView(false);
    setShowLogoutConfirm(false);
    navigateTo(ROUTES.home);
  }

  async function handleSubmitRequest() {
  setRequestLoading(true);
  setRequestMessage("");
  setRequestError("");

  if (!currentUser) {
    setRequestLoading(false);
    setRequestError("Log in met je account om een demon te submitten.");
    setShowLogin(true);
    return;
  }

  try {
    const response = await fetch(import.meta.env.VITE_APPS_SCRIPT_ADMIN_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "submitRequest",
        levelId: requestForm.levelId,
        type: requestForm.type,
        notes: requestForm.notes,
        submittedBy: currentUser.name,
        submittedEmail: currentUser.email
      })
    });

    const data = await response.json();

    if (!data.success) {
      setRequestError(data.message || "Request mislukt.");
      return;
    }

    setRequestMessage("Request succesvol verstuurd!");

    setRequestForm({
      levelId: "",
      type: "Classic",
      notes: ""
    });
    await loadRequests({ silent: true });
  } catch (error) {
    setRequestError("Kon geen verbinding maken.");
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
    setRequestMessage("Geen status wijzigingen om op te slaan.");
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
        setRequestError(data.message || "Status wijzigen mislukt.");
        return;
      }
    }

    setRequestStatusDrafts({});
    setRequestMessage("Status wijzigingen opgeslagen.");
    await loadRequests({ silent: true });
  } catch (error) {
    setRequestError("Kon geen verbinding maken.");
  } finally {
    setRequestStatusSaving(false);
  }
}
  async function handleDeleteRequest(rowNumber) {
  setRequestError("");
  setRequestMessage("");

  const confirmDelete = window.confirm("Weet je zeker dat je deze rejected request wilt verwijderen?");
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
      setRequestError(data.message || "Request verwijderen mislukt.");
      return;
    }

    setRequestMessage("Request verwijderd.");
    await loadRequests({ silent: true });
  } catch {
    setRequestError("Kon geen verbinding maken.");
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
      setRequestError(data.message || "Weight increase toestaan mislukt.");
      return;
    }

    setRequestMessage("Weight Increase staat nu open voor deze request.");
    await loadRequests({ silent: true });
  } catch {
    setRequestError("Kon geen verbinding maken.");
  }
  }
  async function handleAllowWeightIncreaseForAll() {
  setRequestError("");
  setRequestMessage("");

  const confirmOpen = window.confirm("Weet je zeker dat je Weight Increase voor alle requests wilt openzetten?");
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
      setRequestError(data.message || "Alle Weight Increases openzetten mislukt.");
      return;
    }

    setRequestMessage(data.message || "Alle requests staan open voor Weight Increase.");
    await loadRequests({ silent: true });
  } catch {
    setRequestError("Kon geen verbinding maken.");
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
    setRequestMessage("Geen rejected requests geselecteerd.");
    return;
  }

  const confirmDelete = window.confirm(`Weet je zeker dat je ${selectedRejectedRequests.length} rejected requests wilt verwijderen?`);
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
      setRequestError(data.message || "Geselecteerde requests verwijderen mislukt.");
      return;
    }

    setSelectedRejectedRequests([]);
    setRequestMessage(data.message || "Geselecteerde requests verwijderd.");
    await loadRequests({ silent: true });
  } catch {
    setRequestError("Kon geen verbinding maken.");
  }
}
  const difficulties = useMemo(() => {
    const unique = new Set(demons.map(d => d.difficulty).filter(Boolean));
    return ["all", ...Array.from(unique)];
  }, [demons]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return demons
      .filter(demon => {
        const matchesQuery =
          !q ||
          demon.name.toLowerCase().includes(q) ||
          demon.creator.toLowerCase().includes(q) ||
          demon.id.toLowerCase().includes(q);

        const matchesDifficulty =
          difficulty === "all" || demon.difficulty === difficulty;

        const isInProgress = String(demon.status || "COMPLETED").toUpperCase().trim() === "IN PROGRESS";
        const showingInProgress = yearView === "progress";

        const matchesStatus = showingInProgress ? isInProgress : !isInProgress;

        const matchesSegment =
          showingInProgress || segment === "all" || segmentForPlacement(demon.placement) === segment;

        const matchesYearView =
          showingInProgress || yearView === "all" || Number(demon.year || 0) <= Number(yearView);

        return matchesQuery && matchesDifficulty && matchesStatus && matchesSegment && matchesYearView;
      })
      .sort((a, b) => {
        if (yearView === "progress") {
          return Number(b.progressPercent || 0) - Number(a.progressPercent || 0);
        }

        return placementNumber(a.placement) - placementNumber(b.placement);
      });
  }, [demons, query, difficulty, segment, yearView]);

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

  const favoriteDemons = useMemo(() => {
    const favoriteSet = new Set(accountData.favorites.map(id => String(id)));
    return demons
      .filter(demon => favoriteSet.has(String(demon.id)))
      .sort((a, b) => placementNumber(a.placement) - placementNumber(b.placement));
  }, [demons, accountData.favorites]);

  const progressDemons = useMemo(() => {
    return Object.entries(accountData.progress)
      .map(([id, progress]) => {
        const demon = demons.find(item => item.id === id);
        return demon ? { demon, progress } : null;
      })
      .filter(Boolean)
      .sort((a, b) => placementNumber(a.demon.placement) - placementNumber(b.demon.placement));
  }, [demons, accountData.progress]);

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
    const completed = demons.filter(d => String(d.status).toUpperCase() === "COMPLETED");
    const totalAttempts = completed.reduce((sum, d) => sum + Number(d.attempts || 0), 0);
    const hardest = completed.slice().sort((a, b) => Number(b.tier) - Number(a.tier))[0];

    return {
      total: completed.length,
      attempts: totalAttempts,
      avgAttempts: completed.length ? Math.round(totalAttempts / completed.length) : 0,
      hardest
    };
  }, [demons]);

  const hardestBySkillset = useMemo(() => {
    const result = {};

    demons.forEach(demon => {
      const status = String(demon.status || "COMPLETED").toUpperCase().trim();
      if (status !== "COMPLETED") return;
      if (!demon.skillsets || demon.skillsets.length === 0) return;

      const primarySkill = demon.skillsets[0];
      const demonPlacement = placementNumber(demon.placement);

      if (!result[primarySkill]) {
        result[primarySkill] = demon;
        return;
      }

      const currentPlacement = placementNumber(result[primarySkill].placement);
      if (demonPlacement < currentPlacement) {
        result[primarySkill] = demon;
      }
    });

    return result;
  }, [demons]);

  return (
    <div className="app">
      <AppHeader
        adminView={adminView}
        source={source}
        isAdmin={isAdmin}
        currentUser={currentUser}
        historyView={historyView}
        onOpenRequests={() => {
          navigateTo(ROUTES.requests);
        }}
        onOpenHistory={() => {
          navigateTo(historyView ? ROUTES.home : ROUTES.history);
        }}
        onOpenProfile={() => {
          navigateTo(ROUTES.profile);
        }}
        onOpenLogin={() => {
          navigateTo(ROUTES.profile);
          setShowLogin(true);
        }}
        onOpenAdmin={() => navigateTo(ROUTES.admin)}
        onCloseAdmin={() => navigateTo(ROUTES.home)}
        onOpenLogout={() => setShowLogoutConfirm(true)}
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
        />
      ) : profileView && currentUser ? (
        <ProfilePage
          user={currentUser}
          favoriteDemons={favoriteDemons}
          progressDemons={progressDemons}
          personalList={accountData.personalList}
          onCreatePersonalList={createPersonalList}
          onOpenPersonalList={openPersonalList}
          onOpenDemon={setSelected}
          onBack={() => navigateTo(ROUTES.home)}
        />
      ) : profileView ? (
        <section className="panel profile-panel account-gate-panel">
          <div className="profile-hero">
            <div>
              <p className="eyebrow">Account</p>
              <h2>Login</h2>
              <p className="subtitle">
                Log in met je Google account om je profiel en toekomstige accountfuncties te gebruiken.
              </p>
            </div>

            <button className="admin-button" onClick={() => navigateTo(ROUTES.home)} type="button">
              Back to list
            </button>
          </div>

          <div className="build-list-panel">
            <div>
              <p className="eyebrow">Coming next</p>
              <h3>Your account hub</h3>
              <p>
                Je profiel wordt de plek waar persoonlijke demon lists en extra accountfuncties komen.
              </p>
            </div>

            <button className="login-button build-list-button" onClick={() => setShowLogin(true)} type="button">
              Login with Google
            </button>
          </div>

          <div className="profile-feature-grid">
            {ACCOUNT_PREVIEW_ITEMS.map(item => (
              <article className="profile-feature-card" key={item}>
                <strong>{item}</strong>
                <span>Available after account setup.</span>
              </article>
            ))}
          </div>
        </section>
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
          currentUser={currentUser}
          onOpenLogin={() => setShowLogin(true)}
        />
      ) : historyView ? (
        <RecentChanges
          changes={historyChanges}
          loading={historyLoading}
          error={historyError}
          onBack={() => navigateTo(ROUTES.home)}
        />
      ) : (
        <DemonListContent
          stats={stats}
          hardestBySkillset={hardestBySkillset}
          skillsetOpen={skillsetOpen}
          setSkillsetOpen={setSkillsetOpen}
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
          onLatestDemonClick={handleLatestDemonClick}
          currentUser={currentUser}
          favoriteIds={accountData.favorites}
          progressById={accountData.progress}
          onToggleFavorite={toggleFavorite}
          onSetProgress={setDemonProgress}
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
          supabaseConfigured={isSupabaseConfigured}
          onSupabaseLogin={handleSupabaseLogin}
          onClose={() => {
            setShowLogin(false);
            setLoginError("");
          }}
        />
      )}
    </div>
  );
}

