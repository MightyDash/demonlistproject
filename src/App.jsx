import React, { useEffect, useMemo, useState } from "react";
import { Search, X, Trophy, Target, Film, BarChart3, Trash2 } from "lucide-react";
import { SHEET_API_URL } from "./config.js";
import { mockDemons } from "./mockData.js";

function normalizeDemon(row, index) {
  const id = String(row.id ?? row.ID ?? "");
  const name = row.name ?? row.demon ?? row.Demon ?? "";

  return {
    placement: row.placement ?? row.Placement ?? row["#"] ?? `#${index + 1}`,
    name,
    creator: row.creator ?? row.creators ?? row["Creator(s)"] ?? "",
    id,
    difficulty: row.difficulty ?? row.Difficulty ?? "",
    attempts: Number(row.attempts ?? row.Attempts ?? 0),
    year: Number(row.year ?? row.Year ?? 0),
    video: row.video ?? row["Done for Video"] ?? "",
    tier: Number(row.tier ?? row.Tier ?? 0),
    tierChange: Number(row.tierChange ?? row["Tier +/-"] ?? row.tier_change ?? 0),
    formerTop1Year: FORMER_TOP_1[name] || null,
    skillsets: String(row.skillsets ?? row.Skillsets ?? "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean),
    status: row.status ?? row["Done/Progress?"] ?? "COMPLETED",
    thumbnail: id ? `https://levelthumbs.prevter.me/thumbnail/${id}` : "",
    notes: row.notes ?? ""
  };
}

function placementNumber(placement) {
  const match = String(placement || "").match(/\d+/);
  return match ? Number(match[0]) : 999999;
}

function difficultyClass(diff) {
  const d = String(diff || "").toLowerCase();
  if (d.includes("extreme")) return "extreme";
  if (d.includes("insane")) return "insane";
  if (d.includes("hard")) return "hard";
  if (d.includes("medium")) return "medium";
  if (d.includes("easy")) return "easy";
  return "unknown";
}

function segmentForPlacement(placement) {
  const n = placementNumber(placement);
  if (n <= 100) return "main";
  if (n <= 200) return "extended";
  return "legacy";
}

function formatNumber(value) {
  return new Intl.NumberFormat("nl-NL").format(Number(value || 0));
}

function formatTier(value) {
  return Number(value || 0).toLocaleString("nl-NL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

const FORMER_TOP_1 = {
  "Deadlocked": 2019,
  "The Behemoth": 2020,
  "Nine Circles": 2021,
  "Rupture": 2022,
  "Acu": 2023,
  "Make It Drop": 2025
};

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
    <header className="hero">
      <div>
        <p className="eyebrow">Moik's Geometry Dash Demon Archive</p>
        <h1>{adminView ? "Admin Panel" : "Demon List"}</h1>
        <p className="subtitle">
          {adminView
            ? "Manage your demon list tools and admin actions."
            : "A clean, searchable demon list powered by my Google Spreadsheet."}
        </p>
      </div>

      <div>
        <div className={`source-pill ${source}`}>
          {source === "live" ? "Live Sheet Data" : source === "mock" ? "Mock Data" : "Loading"}
        </div>

        {!adminView && (
          <button className="admin-button panel-button" onClick={() => setRequestView(true)}
          type="button"
          >
    Demon Requests
  </button>
)}

        {!isAdmin && (
          <button className="admin-button" onClick={() => setShowLogin(true)} type="button">
            Admin Login
          </button>
        )}

        {isAdmin && !adminView && (
          <button className="admin-button panel-button" onClick={() => setAdminView(true)} type="button">
            Go to panel
          </button>
        )}

        {isAdmin && adminView && (
          <button className="admin-button panel-button" onClick={() => setAdminView(false)} type="button">
            Back to list
          </button>
        )}

        {isAdmin && (
          <button className="admin-button logout-button" onClick={() => setShowLogoutConfirm(true)} type="button">
            Logout
          </button>
        )}
      </div>
    </header>

    {showLogoutConfirm && (
      <div className="modal-backdrop">
        <div className="confirm-panel">
          <h2>Logout?</h2>
          <p>Weet je zeker dat je wilt uitloggen?</p>

          <div className="confirm-actions">
            <button className="logout-confirm-button" onClick={handleLogout} type="button">
              Ja, log uit
            </button>

            <button className="close-button" onClick={() => setShowLogoutConfirm(false)} type="button">
              Annuleren
            </button>
          </div>
        </div>
      </div>
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
  handleRequestStatusDraft={handleRequestStatusDraft}
  requestStatusDrafts={requestStatusDrafts}
  handleRequestStatusDraft={handleRequestStatusDraft}
  handleSaveRequestStatusChanges={handleSaveRequestStatusChanges}
  requestStatusSaving={requestStatusSaving}
  handleDeleteRequest={handleDeleteRequest}
  requestSort={requestSort}
  setRequestSort={setRequestSort}
/>
) : (
      <>
        <section className="stats-grid">
          <StatCard icon={<Trophy />} label="Total Demons" value={formatNumber(stats.total)} />
          <StatCard icon={<Target />} label="Total Attempts" value={formatNumber(stats.attempts)} />
          <StatCard icon={<BarChart3 />} label="Avg Attempts" value={formatNumber(stats.avgAttempts)} />
          <StatCard icon={<Film />} label="Hardest Demon" value={stats.hardest?.name || "Unknown"} highlight />
        </section>

        {Object.keys(hardestBySkillset).length > 0 && (
          <section className="panel skillset-overview">
            <button
              className="skillset-header"
              onClick={() => setSkillsetOpen(open => !open)}
              type="button"
            >
              <span>Hardest demon by skillset</span>
              <span className={`skillset-arrow ${skillsetOpen ? "open" : ""}`}>⌄</span>
            </button>

            <div className={`skillset-content ${skillsetOpen ? "open" : ""}`}>
              <div className="skillset-overview-grid">
                {Object.entries(hardestBySkillset)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([skill, demon]) => (
                    <button
                      key={skill}
                      className="skillset-overview-card"
                      type="button"
                      onClick={() => setSelected(demon)}
                    >
                      <span>{skill}</span>
                      <strong>{demon.name}</strong>
                      <small>{demon.placement} • Tier {formatTier(demon.tier)}</small>
                    </button>
                  ))}
              </div>
            </div>
          </section>
        )}

        <section className="panel controls">
          <div className="searchbox">
            <Search size={18} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search demon, creator or ID..."
            />
          </div>

          <div className="custom-select">
            <button
              className="custom-select-button"
              onClick={() => setDifficultyOpen(open => !open)}
              type="button"
            >
              <span>{difficulty === "all" ? "All difficulties" : difficulty}</span>
              <span className="custom-select-arrow">⌄</span>
            </button>

            {difficultyOpen && (
              <div className="custom-select-menu">
                {difficulties.map(d => (
                  <button
                    key={d}
                    type="button"
                    className={`custom-select-option ${difficulty === d ? "active" : ""}`}
                    onClick={() => {
                      setDifficulty(d);
                      setDifficultyOpen(false);
                    }}
                  >
                    {d === "all" ? "All difficulties" : d}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="tabs">
            {[
              ["all", "All"],
              ["main", "Main"],
              ["extended", "Extended"],
              ["legacy", "Legacy"]
            ].map(([value, label]) => (
              <button
                key={value}
                className={segment === value ? "active" : ""}
                onClick={() => setSegment(value)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>

          <div className="tabs year-tabs">
            {[
              ["all", "2026"],
              ["2025", "2025"],
              ["2024", "2024"],
              ["2023", "2023"],
              ["2022", "2022"],
              ["2021", "2021"],
              ["2020", "2020"],
              ["2019", "2019"]
            ].map(([value, label]) => (
              <button
                key={value}
                className={yearView === value ? "active" : ""}
                onClick={() => setYearView(value)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>

          <div className="tabs view-tabs">
            {[
              ["list", "List"],
              ["grid", "Grid"]
            ].map(([value, label]) => (
              <button
                key={value}
                className={viewMode === value ? "active" : ""}
                onClick={() => setViewMode(value)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <main className="panel table-panel">
          <div className="table-header">
            <span>{filtered.length} demons shown</span>
            <span>{apiLatestDemon ? `Latest: ${apiLatestDemon}` : ""}</span>
          </div>

          {viewMode === "list" ? (
            <div className="demon-table">
              <div className="row heading">
                <div>#</div>
                <div>Demon</div>
                <div>Creator</div>
                <div>Tier</div>
                <div>Difficulty</div>
                <div>Attempts</div>
                <div>Year</div>
              </div>

              {filtered.map(demon => (
                <button
                  className="row demon-row"
                  key={`${demon.id}-${demon.name}`}
                  onClick={() => setSelected(demon)}
                  type="button"
                >
                  <div className="placement">{demon.placement}</div>
                  <div className="name-cell">
                    <span className="demon-name">{demon.name}</span>
                    <span className="mobile-meta">{demon.creator}</span>
                  </div>
                  <div>{demon.creator}</div>
                  <div className="tier">{formatTier(demon.tier)}</div>
                  <div>
                    <span className={`difficulty ${difficultyClass(demon.difficulty)}`}>
                      {demon.difficulty}
                    </span>
                  </div>
                  <div>{formatNumber(demon.attempts)}</div>
                  <div>{demon.year || ""}</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="demon-grid">
              {filtered.map(demon => (
                <button
                  className="grid-card"
                  key={`${demon.id}-${demon.name}`}
                  onClick={() => setSelected(demon)}
                  type="button"
                >
                  <img
                    src={demon.thumbnail}
                    alt={demon.name}
                    className="grid-thumb"
                    onError={e => {
                      e.currentTarget.style.display = "none";
                    }}
                  />

                  <div className="grid-overlay">
                    <div>
                      <h3>{demon.name}</h3>
                      <p>by {demon.creator || "Unknown creator"}</p>
                    </div>

                    <div className="grid-meta">
                      <span>{demon.placement}</span>
                      <span>Tier {formatTier(demon.tier)}</span>
                      <span>{demon.year || "Unknown"}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </main>
      </>
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
      <div className="modal-backdrop">
        <div className="login-panel">
          <button
            className="login-close-x"
            onClick={() => {
              setShowLogin(false);
              setLoginError("");
            }}
            type="button"
          >
            <X size={20} />
          </button>

          <div className="login-header">
            <p className="login-eyebrow">Admin Area</p>
            <h2>Admin Login</h2>
            <p>Login om toegang te krijgen tot het admin panel.</p>
          </div>

          <div className="login-form">
            <label>
              Username
              <input
                className="login-input"
                placeholder="Enter username"
                value={loginData.username}
                onChange={e =>
                  setLoginData({ ...loginData, username: e.target.value })
                }
              />
            </label>

            <label>
              Password
              <input
                className="login-input"
                type="password"
                placeholder="Enter password"
                value={loginData.password}
                onChange={e =>
                  setLoginData({ ...loginData, password: e.target.value })
                }
                onKeyDown={e => {
                  if (e.key === "Enter") handleLogin();
                }}
              />
            </label>

            {loginError && <p className="login-error">{loginError}</p>}

            <div className="login-actions">
              <button className="login-button" onClick={handleLogin} type="button">
                Login
              </button>

              <button
                className="close-button"
                onClick={() => {
                  setShowLogin(false);
                  setLoginError("");
                }}
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
);
}
function StatCard({ icon, label, value, highlight }) {
  return (
    <div className={`stat-card ${highlight ? "highlight" : ""}`}>
      <div className="stat-icon">{icon}</div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function RequestPanel({
  onBack,
  requestForm,
  setRequestForm,
  requestLoading,
  requestMessage,
  requestError,
  handleSubmitRequest,
  requests,
  requestsLoading,
  isAdmin,
  requestStatusDrafts,
  handleRequestStatusDraft,
  handleSaveRequestStatusChanges,
  requestStatusSaving,
  handleDeleteRequest,
  requestSort,
  setRequestSort
}) {
  const sortedRequests = [...requests].sort((a, b) => {
  if (requestSort === "newest") {
    return new Date(b.timestamp) - new Date(a.timestamp);
  }

  if (requestSort === "oldest") {
    return new Date(a.timestamp) - new Date(b.timestamp);
  }

  if (requestSort === "weight") {
    return Number(b.weight || 1) - Number(a.weight || 1);
  }

  return 0;
});
  return (
    <section className="panel request-panel">
      <div className="admin-panel-header">
        <div>
          <p className="eyebrow">Requests</p>
          <h2>Recommend Demon</h2>
          <p>Recommend me a demon I haven't played yet! Platformers are usually rejected.</p>
        </div>

        <button className="admin-button" onClick={onBack} type="button">
          Back to list
        </button>
      </div>

      <div className="request-form">
        <input
          type="text"
          placeholder="Level ID"
          value={requestForm.levelId}
          onChange={e =>
            setRequestForm({ ...requestForm, levelId: e.target.value })
          }
        />

        <select
          value={requestForm.type}
          onChange={e =>
            setRequestForm({ ...requestForm, type: e.target.value })
          }
        >
          <option value="Classic">Classic</option>
          <option value="Platformer">Platformer</option>
        </select>

        <textarea
          placeholder="Describe this demon in terms of gameplay, decorations and skillsets"
          value={requestForm.notes}
          onChange={e =>
            setRequestForm({ ...requestForm, notes: e.target.value })
          }
        />

        <button
          className="login-button"
          onClick={handleSubmitRequest}
          disabled={requestLoading}
          type="button"
        >
          {requestLoading ? "Submitting..." : "Submit Request"}
        </button>

        {requestMessage && <p className="admin-success">{requestMessage}</p>}
        {requestError && <p className="admin-error">{requestError}</p>}
        <hr className="request-divider" />

<h2>Submissions</h2>

{requestsLoading ? (
  <p className="request-loading">Loading requests...</p>
) : requests.length === 0 ? (
  <p className="request-empty">No requests found.</p>
) : (
  <>
    <div className="request-sort-row">
      <span>Sort by</span>

      <select
        value={requestSort}
        onChange={e => setRequestSort(e.target.value)}
      >
        <option value="weight">Highest weight</option>
        <option value="newest">Newest</option>
        <option value="oldest">Oldest</option>
      </select>
    </div>

    {isAdmin && (
      <div className="request-save-bar">
        <button
          className="login-button"
          type="button"
          onClick={handleSaveRequestStatusChanges}
          disabled={requestStatusSaving || Object.keys(requestStatusDrafts).length === 0}
        >
          {requestStatusSaving
            ? "Saving..."
            : `Save Status Changes (${Object.keys(requestStatusDrafts).length})`}
        </button>
      </div>
    )}

    <div className="request-list">
      {sortedRequests.map((request, index) => (
        <div
          className="request-card"
          key={`${request.levelId}-${index}`}
        >
          <div className="request-thumb-wrap">
            <img
              className="request-thumb"
              src={`https://levelthumbs.prevter.me/thumbnail/${request.levelId}`}
              alt={request.demon || request.levelId}
              onError={e => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>

          <div className="request-card-content">
            <div className="request-card-top">
              <div className="request-card-title">
                <strong>{request.demon || `Level ${request.levelId}`}</strong>
                <span>ID: {request.levelId}</span>
              </div>

              <div className="request-actions">
                {isAdmin ? (
                  <select
                    className={`request-status-select ${String(
                      requestStatusDrafts[request.rowNumber] || request.status || "Pending"
                    ).toLowerCase()}`}
                    value={requestStatusDrafts[request.rowNumber] || request.status || "Pending"}
                    onChange={e => handleRequestStatusDraft(request.rowNumber, e.target.value)}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Dropped">Dropped</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Completed">Completed</option>
                  </select>
                ) : (
                  <span className={`request-status ${String(request.status || "Pending").toLowerCase()}`}>
                    {request.status || "Pending"}
                  </span>
                )}

                {isAdmin && String(request.status || "").toLowerCase() === "rejected" && (
                  <button
                    className="request-delete-button"
                    type="button"
                    onClick={() => handleDeleteRequest(request.rowNumber)}
                    title="Delete request"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>

            <div className="request-meta">
              <span>{request.type || "Classic"}</span>
              <span>Weight: {request.weight || 1}</span>
            </div>

            {request.notes && <p className="request-notes">{request.notes}</p>}
          </div>
        </div>
      ))}
    </div>
  </>
)}
      </div>
    </section>
  );
}

function DemonModal({ demon, onClose, onPrev, onNext, hasPrev, hasNext }) {
  const thumbnailSrc = demon.id
  ? `https://levelthumbs.prevter.me/thumbnail/${demon.id}`
  : "";

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <article className="modal" onMouseDown={e => e.stopPropagation()}>
        <button className="close" onClick={onClose} type="button">
          <X size={20} />
        </button>

        <div className="modal-nav">
          {hasPrev && (
            <button className="nav-button left" onClick={onPrev}>
              ‹
            </button>
          )}
          {hasNext && (
            <button className="nav-button right" onClick={onNext}>
              ›
            </button>
          )}
        </div>

        <div className="modal-cover">
  <img
    src={thumbnailSrc}
    alt={demon.name}
    onError={e => {
      e.currentTarget.style.display = "none";
    }}
  />
</div>

        <div className="modal-content">
          <p className="placement-large">{demon.placement}</p>
          <h2>{demon.name}</h2>
          <p className="creator">by {demon.creator || "Unknown creator"}</p>

          {demon.formerTop1Year && (
            <div className="former-top1-badge">
              🏅 Former Top 1 ({demon.formerTop1Year})
            </div>
          )}

          <div className="detail-grid">
            <Detail label="Level ID" value={demon.id} />
            <Detail label="Tier" value={formatTier(demon.tier)} />
            <Detail label="Difficulty" value={demon.difficulty} />
            <Detail label="Attempts" value={formatNumber(demon.attempts)} />
            <Detail label="Year" value={demon.year || "Unknown"} />
          </div>

          {demon.skillsets?.length > 0 && (
            <div className="skillsets">
              <h3>Skillsets</h3>
              <div className="skillset-list">
                {demon.skillsets.map(skill => (
                  <span key={skill} className="skillset-tag">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {demon.notes && <p className="notes">{demon.notes}</p>}

          {demon.id && (
            <a
              className="external-link"
              href={`https://gdbrowser.com/${encodeURIComponent(demon.id)}`}
              target="_blank"
              rel="noreferrer"
            >
              Open in GDBrowser
            </a>
          )}
        </div>
      </article>
    </div>
  );
}

function Detail({ label, value }) {
  function copy() {
    if (!value) return;
    navigator.clipboard.writeText(String(value));
  }

  return (
    <div className="detail" onClick={copy} style={{ cursor: value ? "pointer" : "default" }}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function AdminPanel({ onBack, onDataChanged }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showRemoveForm, setShowRemoveForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);

  const [addForm, setAddForm] = useState({
    levelId: "",
    attempts: "",
    year: new Date().getFullYear(),
    status: "COMPLETED"
  });

  const [removeLevelId, setRemoveLevelId] = useState("");
  const [removeConfirm, setRemoveConfirm] = useState(false);

  // Edit Demon state
  const [editSearch, setEditSearch] = useState("");
  const [editFound, setEditFound] = useState(null);
  const [editNotFound, setEditNotFound] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    difficulty: "",
    creator: "",
    year: "",
    attempts: "",
    skillsets: ""
  });
  const [editConfirm, setEditConfirm] = useState(false);

  const [adminMessage, setAdminMessage] = useState("");
  const [adminError, setAdminError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSearchEdit() {
    setAdminMessage("");
    setAdminError("");
    setEditFound(null);
    setEditNotFound(false);
    setEditConfirm(false);

    const q = editSearch.trim();
    if (!q) {
      setAdminError("Vul een Level ID of naam in.");
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await sendAdminRequest({ action: "findDemon", query: q });
      if (!data.success || !data.demon) {
        setEditNotFound(true);
        return;
      }
      setEditFound(data.demon);
      setEditForm({
        name: data.demon.name || "",
        difficulty: data.demon.difficulty || "",
        creator: data.demon.creator || "",
        year: String(data.demon.year || ""),
        attempts: String(data.demon.attempts || ""),
        skillsets: Array.isArray(data.demon.skillsets)
          ? data.demon.skillsets.join(", ")
          : (data.demon.skillsets || "")
      });
    } catch (error) {
      setAdminError(error.message || "Kon geen verbinding maken met Apps Script.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEditDemon() {
    setAdminMessage("");
    setAdminError("");

    const year = Number(editForm.year);
    const attempts = Number(editForm.attempts);

    if (!editForm.name.trim()) {
      setAdminError("Naam is verplicht.");
      return;
    }
    if (!Number.isInteger(year) || String(year).length !== 4) {
      setAdminError("Jaar moet een geldig 4-cijferig jaar zijn.");
      return;
    }
    if (!Number.isInteger(attempts) || attempts < 0) {
      setAdminError("Attempts moet een geldig getal zijn.");
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await sendAdminRequest({
        action: "editDemon",
        levelId: editFound.id,
        name: editForm.name.trim(),
        difficulty: editForm.difficulty.trim(),
        creator: editForm.creator.trim(),
        year,
        attempts,
        skillsets: editForm.skillsets
      });

      if (!data.success) {
        setAdminError(data.message || "Bewerken mislukt.");
        return;
      }

      setAdminMessage(data.message || "Demon bijgewerkt.");
      setEditFound(null);
      setEditSearch("");
      setEditConfirm(false);
      setShowEditForm(false);
      if (onDataChanged) onDataChanged();
    } catch (error) {
      setAdminError(error.message || "Kon geen verbinding maken met Apps Script.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function sendAdminRequest(payload) {
    const adminUrl = import.meta.env.VITE_APPS_SCRIPT_ADMIN_URL;
    const token = localStorage.getItem("admin_token");

    if (!adminUrl) {
      throw new Error("VITE_APPS_SCRIPT_ADMIN_URL ontbreekt in Render.");
    }

    if (!token) {
      throw new Error("Je bent niet ingelogd.");
    }

    const response = await fetch(adminUrl, {
      method: "POST",
      body: JSON.stringify({
        ...payload,
        token
      })
    });

    return response.json();
  }

  async function handleAddDemon() {
    setAdminMessage("");
    setAdminError("");

    const levelId = String(addForm.levelId || "").trim();
    const attempts = Number(addForm.attempts);
    const year = Number(addForm.year);
    const status = String(addForm.status || "COMPLETED").trim().toUpperCase();

    if (!levelId) {
      setAdminError("Level ID is verplicht.");
      return;
    }

    if (!Number.isInteger(attempts) || attempts < 0) {
      setAdminError("Attempts moet een geldig getal zijn.");
      return;
    }

    if (!Number.isInteger(year) || String(year).length !== 4) {
      setAdminError("Year moet een geldig 4-cijferig jaartal zijn.");
      return;
    }

    setIsSubmitting(true);

    try {
      const data = await sendAdminRequest({
        action: "addDemon",
        levelId,
        attempts,
        year,
        status
      });

      if (!data.success) {
        setAdminError(data.message || "Demon toevoegen mislukt.");
        return;
      }

      setAdminMessage(data.message || "Demon toegevoegd.");
      setAddForm({
        levelId: "",
        attempts: "",
        year: new Date().getFullYear(),
        status: "COMPLETED"
      });
      setShowAddForm(false);

      if (onDataChanged) onDataChanged();
    } catch (error) {
      setAdminError(error.message || "Kon geen verbinding maken met Apps Script.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemoveDemon() {
    setAdminMessage("");
    setAdminError("");

    const levelId = String(removeLevelId || "").trim();

    if (!levelId) {
      setAdminError("Level ID is verplicht.");
      return;
    }

    setIsSubmitting(true);

    try {
      const data = await sendAdminRequest({
        action: "removeDemon",
        levelId
      });

      if (!data.success) {
        setAdminError(data.message || "Demon verwijderen mislukt.");
        return;
      }

      setAdminMessage(data.message || "Demon verwijderd.");
      setRemoveLevelId("");
      setRemoveConfirm(false);
      setShowRemoveForm(false);

      if (onDataChanged) onDataChanged();
    } catch (error) {
      setAdminError(error.message || "Kon geen verbinding maken met Apps Script.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="panel admin-panel">
      <div className="admin-panel-header">
        <div>
          <p className="eyebrow">Admin Area</p>
          <h2>Admin Panel</h2>
          <p>Beheer hier je demon list acties.</p>
        </div>

        <button className="admin-button" onClick={onBack} type="button">
          Back to list
        </button>
      </div>

      {adminMessage && <p className="admin-success">{adminMessage}</p>}
      {adminError && <p className="admin-error">{adminError}</p>}

      <div className="admin-panel-grid">
        <button
          className="admin-action-card"
          type="button"
          onClick={() => {
            setShowAddForm(open => !open);
            setShowRemoveForm(false);
            setShowEditForm(false);
            setEditFound(null);
            setEditNotFound(false);
            setEditConfirm(false);
            setRemoveConfirm(false);
            setAdminMessage("");
            setAdminError("");
          }}
        >
          <strong>Add Demon</strong>
          <span>Nieuwe demon toevoegen aan je sheet.</span>
        </button>

        <button
          className="admin-action-card"
          type="button"
          onClick={() => {
            setShowRemoveForm(open => !open);
            setShowAddForm(false);
            setShowEditForm(false);
            setEditFound(null);
            setEditNotFound(false);
            setEditConfirm(false);
            setRemoveConfirm(false);
            setAdminMessage("");
            setAdminError("");
          }}
        >
          <strong>Remove Demon</strong>
          <span>Demon verwijderen via Level ID.</span>
        </button>

        <button
          className="admin-action-card"
          type="button"
          onClick={() => {
            setShowEditForm(open => !open);
            setShowAddForm(false);
            setShowRemoveForm(false);
            setEditFound(null);
            setEditNotFound(false);
            setEditConfirm(false);
            setRemoveConfirm(false);
            setAdminMessage("");
            setAdminError("");
          }}
        >
          <strong>Edit Demon</strong>
          <span>Naam, difficulty, makers en meer aanpassen.</span>
        </button>
      </div>

      {showAddForm && (
        <div className="admin-form">
          <h3>Add Demon</h3>

          <label>
            Level ID
            <input
              value={addForm.levelId}
              onChange={e => setAddForm({ ...addForm, levelId: e.target.value })}
              placeholder="Bijv. 10565740"
            />
          </label>

          <label>
            Attempts
            <input
              type="number"
              min="0"
              value={addForm.attempts}
              onChange={e => setAddForm({ ...addForm, attempts: e.target.value })}
              placeholder="Bijv. 20226"
            />
          </label>

          <label>
            Year
            <input
              type="number"
              value={addForm.year}
              onChange={e => setAddForm({ ...addForm, year: e.target.value })}
              placeholder="Bijv. 2026"
            />
          </label>

          <label>
            Status
            <select
              value={addForm.status}
              onChange={e => setAddForm({ ...addForm, status: e.target.value })}
            >
              <option value="COMPLETED">COMPLETED</option>
              <option value="IN PROGRESS">IN PROGRESS</option>
            </select>
          </label>

          <div className="admin-form-actions">
            <button
              className="login-button"
              onClick={handleAddDemon}
              disabled={isSubmitting}
              type="button"
            >
              {isSubmitting ? "Adding..." : "Add Demon"}
            </button>

            <button className="close-button" onClick={() => setShowAddForm(false)} type="button">
              Cancel
            </button>
          </div>
        </div>
      )}

      {showRemoveForm && (
        <div className="admin-form danger-form">
          <h3>Remove Demon</h3>

          <label>
            Level ID
            <input
              value={removeLevelId}
              onChange={e => {
                setRemoveLevelId(e.target.value);
                setRemoveConfirm(false);
              }}
              placeholder="Bijv. 10565740"
            />
          </label>

          {!removeConfirm ? (
            <div className="admin-form-actions">
              <button
                className="logout-confirm-button"
                onClick={() => {
                  if (!String(removeLevelId || "").trim()) {
                    setAdminError("Level ID is verplicht.");
                    return;
                  }
                  setAdminError("");
                  setRemoveConfirm(true);
                }}
                type="button"
              >
                Prepare Remove
              </button>

              <button
                className="close-button"
                onClick={() => {
                  setShowRemoveForm(false);
                  setRemoveConfirm(false);
                  setRemoveLevelId("");
                }}
                type="button"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="remove-confirm-box">
              <p>
                Weet je zeker dat je demon met Level ID{" "}
                <strong>{removeLevelId}</strong> wilt verwijderen?
              </p>

              <div className="admin-form-actions">
                <button
                  className="logout-confirm-button"
                  onClick={handleRemoveDemon}
                  disabled={isSubmitting}
                  type="button"
                >
                  {isSubmitting ? "Removing..." : "Yes, remove"}
                </button>

                <button
                  className="close-button"
                  onClick={() => setRemoveConfirm(false)}
                  type="button"
                >
                  No, go back
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showEditForm && (
        <div className="admin-form">
          <h3>Edit Demon</h3>

          <div className="edit-search-row">
            <input
              value={editSearch}
              onChange={e => {
                setEditSearch(e.target.value);
                setEditFound(null);
                setEditNotFound(false);
                setEditConfirm(false);
              }}
              onKeyDown={e => { if (e.key === "Enter") handleSearchEdit(); }}
              placeholder="Exacte naam of Level ID..."
            />
            <button
              className="login-button edit-search-btn"
              onClick={handleSearchEdit}
              disabled={isSubmitting}
              type="button"
            >
              {isSubmitting ? "Zoeken..." : "Zoek"}
            </button>
          </div>

          <p className="edit-search-hint">
            Typ de exacte naam (hoofdletterongevoelig) of het exacte Level ID.
          </p>

          {editNotFound && (
            <p className="admin-error" style={{ marginTop: "12px" }}>
              Geen demon gevonden. Controleer de naam of het Level ID.
            </p>
          )}

          {editFound && !editConfirm && (
            <>
              <div className="edit-found-badge">
                <span className="edit-found-dot" />
                <span>Gevonden: <strong>{editFound.name}</strong></span>
                <span className="edit-found-id">ID: {editFound.id}</span>
              </div>

              <div className="edit-fields-grid">
                <label>
                  Naam
                  <input
                    value={editForm.name}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Naam van de demon"
                  />
                </label>

                <label>
                  Difficulty
                  <input
                    value={editForm.difficulty}
                    onChange={e => setEditForm({ ...editForm, difficulty: e.target.value })}
                    placeholder="Bijv. Extreme Demon"
                  />
                </label>

                <label>
                  Maker(s)
                  <input
                    value={editForm.creator}
                    onChange={e => setEditForm({ ...editForm, creator: e.target.value })}
                    placeholder="Bijv. Riot & more"
                  />
                </label>

                <label>
                  Jaar
                  <input
                    type="number"
                    value={editForm.year}
                    onChange={e => setEditForm({ ...editForm, year: e.target.value })}
                    placeholder="Bijv. 2024"
                  />
                </label>

                <label>
                  Attempts
                  <input
                    type="number"
                    min="0"
                    value={editForm.attempts}
                    onChange={e => setEditForm({ ...editForm, attempts: e.target.value })}
                    placeholder="Bijv. 5000"
                  />
                </label>

                <label className="edit-field-full">
                  Skillsets
                  <input
                    value={editForm.skillsets}
                    onChange={e => setEditForm({ ...editForm, skillsets: e.target.value })}
                    placeholder="Bijv. Timing, Straight fly (komma gescheiden)"
                  />
                </label>
              </div>

              <div className="admin-form-actions" style={{ marginTop: "8px" }}>
                <button
                  className="login-button"
                  onClick={() => setEditConfirm(true)}
                  type="button"
                >
                  Opslaan
                </button>
                <button
                  className="close-button"
                  onClick={() => {
                    setEditFound(null);
                    setEditSearch("");
                    setEditNotFound(false);
                  }}
                  type="button"
                >
                  Annuleren
                </button>
              </div>
            </>
          )}

          {editFound && editConfirm && (
            <div className="remove-confirm-box" style={{ borderColor: "rgba(94,161,255,0.35)", background: "rgba(94,161,255,0.08)" }}>
              <p style={{ color: "var(--text)" }}>
                Weet je zeker dat je <strong style={{ color: "var(--blue)" }}>{editFound.name}</strong> wilt bijwerken met de nieuwe gegevens?
              </p>
              <div className="admin-form-actions">
                <button
                  className="login-button"
                  onClick={handleEditDemon}
                  disabled={isSubmitting}
                  type="button"
                >
                  {isSubmitting ? "Opslaan..." : "Ja, opslaan"}
                </button>
                <button
                  className="close-button"
                  onClick={() => setEditConfirm(false)}
                  type="button"
                >
                  Terug
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
