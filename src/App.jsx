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

  const [showLogin, setShowLogin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [adminView, setAdminView] = useState(false);

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

  function handleLogout() {
  localStorage.removeItem("admin_token");
  setIsAdmin(false);
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

  return (
    <div className="app">
      <header className="hero">
        <div>
          <p className="eyebrow">Moik's Geometry Dash archive</p>
          <h1>Demon List</h1>
          <p className="subtitle">
            A clean, searchable demon list powered by your Google Spreadsheet.
          </p>
        </div>

        <div>
          <div className={`source-pill ${source}`}>
            {source === "live" ? "Live Sheet Data" : source === "mock" ? "Mock Data" : "Loading"}
          </div>

          <button className="admin-button" onClick={() => setShowLogin(true)}>
            Admin Login
          </button>

          {isAdmin && (
  <>
    <button
      className="admin-button panel-button"
      onClick={() => alert("Admin panel coming next")}
      type="button"
    >
      Go to panel
    </button>

    <button
      className="admin-button logout-button"
      onClick={() => setShowLogoutConfirm(true)}
      type="button"
    >
      Logout
    </button>
  </>
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
      <section className="stats-grid">
        <StatCard icon={<Trophy />} label="Total Demons" value={formatNumber(stats.total)} />
        <StatCard icon={<Target />} label="Total Attempts" value={formatNumber(stats.attempts)} />
        <StatCard icon={<BarChart3 />} label="Avg Attempts" value={formatNumber(stats.avgAttempts)} />
        <StatCard icon={<Film />} label="Hardest Demon" value={stats.hardest?.name || "Unknown"} highlight />
      </section>

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

      {selected && (
        <DemonModal demon={selected} onClose={() => setSelected(null)} />
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

function DemonModal({ demon, onClose }) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <article className="modal" onMouseDown={e => e.stopPropagation()}>
        <button className="close" onClick={onClose}>
          <X size={20} />
        </button>

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
function AdminPanel({ onBack }) {
  return (
    <section className="panel admin-panel">
      <div className="admin-panel-header">
        <div>
          <p className="eyebrow">Admin Area</p>
          <h2>Admin Panel</h2>
          <p>Beheer hier later je demon list acties.</p>
        </div>

        <button className="admin-button" onClick={onBack} type="button">
          Back to list
        </button>
      </div>

      <div className="admin-panel-grid">
        <button className="admin-action-card" type="button">
          <strong>Add Demon</strong>
          <span>Nieuwe demon toevoegen aan je sheet.</span>
        </button>

        <button className="admin-action-card" type="button">
          <strong>Edit Demon</strong>
          <span>Bestaande demon aanpassen.</span>
        </button>

        <button className="admin-action-card" type="button">
          <strong>Refresh Data</strong>
          <span>Sheet data opnieuw laden.</span>
        </button>
      </div>
    </section>
  );
}
