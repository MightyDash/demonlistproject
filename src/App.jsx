import React, { useEffect, useMemo, useState } from "react";
import { Search, X, Trophy, Target, Film, BarChart3 } from "lucide-react";
import { SHEET_API_URL } from "./config.js";
import { mockDemons } from "./mockData.js";

function normalizeDemon(row, index) {
  const id = String(row.id ?? row.ID ?? "");

  return {
    placement: row.placement ?? row.Placement ?? row["#"] ?? `#${index + 1}`,
    name: row.name ?? row.demon ?? row.Demon ?? "",
    creator: row.creator ?? row.creators ?? row["Creator(s)"] ?? "",
    id,
    difficulty: row.difficulty ?? row.Difficulty ?? "",
    attempts: Number(row.attempts ?? row.Attempts ?? 0),
    year: Number(row.year ?? row.Year ?? 0),
    video: row.video ?? row["Done for Video"] ?? "",
    tier: Number(row.tier ?? row.Tier ?? 0),
    tierChange: Number(row.tierChange ?? row["Tier +/-"] ?? row.tier_change ?? 0),
    skillsets: String(row.skillsets ?? row.Skillsets ?? "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean),
    status: row.status ?? row["Done/Progress?"] ?? "COMPLETED",
    thumbnail: row.thumbnail || row.thumbnailUrl || (id ? `/thumbnails/${id}.JPG` : ""),
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

export default function App() {
  const [demons, setDemons] = useState([]);
  const [source, setSource] = useState("loading");
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState("all");
  const [difficultyOpen, setDifficultyOpen] = useState(false);
  const [segment, setSegment] = useState("all");
  const [selected, setSelected] = useState(null);
  const [apiLatestDemon, setApiLatestDemon] = useState("");
  const currentIndex = useMemo(() => {
  if (!selected) return -1;
  return filtered.findIndex(
    d => d.id === selected.id && d.name === selected.name
  );
}, [selected, filtered]);

  const [showLogin, setShowLogin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [adminView, setAdminView] = useState(false);
  const [skillsetOpen, setSkillsetOpen] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem("admin_token");

    if (savedToken) {
      setIsAdmin(true);
    }
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

  async function handleLogin() {
    setLoginError("");

    const adminUsername = import.meta.env.VITE_ADMIN_USERNAME;
    const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD;
    const adminToken = import.meta.env.VITE_ADMIN_TOKEN;

    if (
      loginData.username === adminUsername &&
      loginData.password === adminPassword
    ) {
      setIsAdmin(true);
      setShowLogin(false);
      localStorage.setItem("admin_token", adminToken || "local-admin");
    } else {
      setLoginError("Wrong login");
    }
  }
function goToPrev() {
  if (currentIndex > 0) {
    setSelected(filtered[currentIndex - 1]);
  }
}

function goToNext() {
  if (currentIndex < filtered.length - 1) {
    setSelected(filtered[currentIndex + 1]);
  }
}
  function handleLogout() {
    localStorage.removeItem("admin_token");
    setIsAdmin(false);
    setAdminView(false);
    setShowLogoutConfirm(false);
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

        return matchesQuery && matchesDifficulty && matchesSegment;
      })
      .sort((a, b) => placementNumber(a.placement) - placementNumber(b.placement));
  }, [demons, query, difficulty, segment]);

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

          {!isAdmin && (
            <button className="admin-button" onClick={() => setShowLogin(true)} type="button">
              Admin Login
            </button>
          )}

          {isAdmin && !adminView && (
            <button
              className="admin-button panel-button"
              onClick={() => setAdminView(true)}
              type="button"
            >
              Go to panel
            </button>
          )}

          {isAdmin && adminView && (
            <button
              className="admin-button panel-button"
              onClick={() => setAdminView(false)}
              type="button"
            >
              Back to list
            </button>
          )}

          {isAdmin && (
            <button
              className="admin-button logout-button"
              onClick={() => setShowLogoutConfirm(true)}
              type="button"
            >
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

              <button
                className="close-button"
                onClick={() => setShowLogoutConfirm(false)}
                type="button"
              >
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
      <span className={`skillset-arrow ${skillsetOpen ? "open" : ""}`}>
        ⌄
      </span>
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
          </section>

          <main className="panel table-panel">
            <div className="table-header">
              <span>{filtered.length} demons shown</span>
              <span>{apiLatestDemon ? `Latest: ${apiLatestDemon}` : ""}</span>
            </div>

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

function DemonModal({ demon, onClose, onPrev, onNext, hasPrev, hasNext }) {
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
          {demon.thumbnail ? (
            <img
              src={demon.thumbnail}
              alt={demon.name}
              onError={e => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="thumbnail-placeholder">
              {demon.name.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        <div className="modal-content">
          <p className="placement-large">{demon.placement}</p>
          <h2>{demon.name}</h2>
          <p className="creator">by {demon.creator || "Unknown creator"}</p>

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

  const [addForm, setAddForm] = useState({
    levelId: "",
    attempts: "",
    year: new Date().getFullYear(),
    status: "COMPLETED"
  });

  const [removeLevelId, setRemoveLevelId] = useState("");
  const [removeConfirm, setRemoveConfirm] = useState(false);

  const [adminMessage, setAdminMessage] = useState("");
  const [adminError, setAdminError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
            setRemoveConfirm(false);
            setAdminMessage("");
            setAdminError("");
          }}
        >
          <strong>Remove Demon</strong>
          <span>Demon verwijderen via Level ID.</span>
        </button>

        <button className="admin-action-card" type="button" onClick={onDataChanged}>
          <strong>Refresh Data</strong>
          <span>Sheet data opnieuw laden.</span>
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
    </section>
  );
}
