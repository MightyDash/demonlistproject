import React, { useEffect, useMemo, useState } from "react";
import { SHEET_API_URL } from "./config.js";
import { mockDemons } from "./mockData.js";
import { AdminPanel } from "./components/AdminPanel.jsx";
import { AppHeader } from "./components/AppHeader.jsx";
import { DemonListContent } from "./components/DemonListContent.jsx";
import { DemonModal } from "./components/DemonModal.jsx";
import { LoginModal } from "./components/LoginModal.jsx";
import { LogoutConfirm } from "./components/LogoutConfirm.jsx";
import { RequestPanel } from "./components/RequestPanel.jsx";
import { normalizeDemon, placementNumber, segmentForPlacement } from "./demonUtils.js";

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
  const [viewMode, setViewMode] = useState("grid");
  const [requestView, setRequestView] = useState(false);
  const [requestForm, setRequestForm] = useState({
  levelId: "",
  type: "Classic",
  notes: ""
});
  const [requestSort, setRequestSort] = useState("weight");
  const [requestStatusDrafts, setRequestStatusDrafts] = useState({});
  const [requestStatusSaving, setRequestStatusSaving] = useState(false);
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [requestError, setRequestError] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [adminView, setAdminView] = useState(false);
  const [skillsetOpen, setSkillsetOpen] = useState(false);

  async function loadRequests() {
  setRequestsLoading(true);

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
      }
    } finally {
      setRequestsLoading(false);
    }
  }

    useEffect(() => {
  if (requestView) {
    loadRequests();
  }
}, [requestView]);
  
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
      } else {
        setLoginError("Wrong login");
      }
    } catch {
      setLoginError("Could not reach server.");
    }
  }

  function handleLogout() {
    localStorage.removeItem("admin_token");
    setIsAdmin(false);
    setAdminView(false);
    setShowLogoutConfirm(false);
  }

  async function handleSubmitRequest() {
  setRequestLoading(true);
  setRequestMessage("");
  loadRequests();
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
      setRequestError(data.message || "Request mislukt.");
      return;
    }

    setRequestMessage("Request succesvol verstuurd!");

    setRequestForm({
      levelId: "",
      type: "Classic",
      notes: ""
    });
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
    loadRequests();
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
    loadRequests();
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

        const matchesSegment =
          segment === "all" || segmentForPlacement(demon.placement) === segment;

        const matchesYearView =
          yearView === "all" || Number(demon.year || 0) <= Number(yearView);

        return matchesQuery && matchesDifficulty && matchesSegment && matchesYearView;
      })
      .sort((a, b) => placementNumber(a.placement) - placementNumber(b.placement));
  }, [demons, query, difficulty, segment, yearView]);

  const currentIndex = useMemo(() => {
    if (!selected) return -1;
    return filtered.findIndex(
      d => d.id === selected.id && d.name === selected.name
    );
  }, [selected, filtered]);

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
        onOpenRequests={() => setRequestView(true)}
        onOpenLogin={() => setShowLogin(true)}
        onOpenAdmin={() => setAdminView(true)}
        onCloseAdmin={() => setAdminView(false)}
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
          onBack={() => setAdminView(false)}
          onDataChanged={() => window.location.reload()}
        />
      ) : requestView ? (
        <RequestPanel
          onBack={() => setRequestView(false)}
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
          requestSort={requestSort}
          setRequestSort={setRequestSort}
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
          filtered={filtered}
          apiLatestDemon={apiLatestDemon}
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
    </div>
  );
}
