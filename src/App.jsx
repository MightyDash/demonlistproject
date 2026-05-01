import React, { useEffect, useMemo, useState } from "react";
import { Search, X, Trophy, Target, Film, BarChart3 } from "lucide-react";
import { SHEET_API_URL } from "./config.js";
import { mockDemons } from "./mockData.js";

function normalizeDemon(row, index) {
  return {
    placement: row.placement ?? row.Placement ?? row["#"] ?? `#${index + 1}`,
    name: row.name ?? row.demon ?? row.Demon ?? "",
    creator: row.creator ?? row.creators ?? row["Creator(s)"] ?? "",
    id: String(row.id ?? row.ID ?? ""),
    difficulty: row.difficulty ?? row.Difficulty ?? "",
    attempts: Number(row.attempts ?? row.Attempts ?? 0),
    year: Number(row.year ?? row.Year ?? 0),
    video: row.video ?? row["Done for Video"] ?? "",
    tier: Number(row.tier ?? row.Tier ?? 0),
    tierChange: Number(row.tierChange ?? row["Tier +/-"] ?? row.tier_change ?? 0),
    status: row.status ?? row["Done/Progress?"] ?? "COMPLETED",
    thumbnail: row.thumbnail ?? "",
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
  const [segment, setSegment] = useState("all");
  const [selected, setSelected] = useState(null);
  const [apiLatestDemon, setApiLatestDemon] = useState("");

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
    const latest = completed.slice().sort((a, b) => placementNumber(b.placement) - placementNumber(a.placement))[0];

    return {
      total: completed.length,
      attempts: totalAttempts,
      avgAttempts: completed.length ? Math.round(totalAttempts / completed.length) : 0,
      hardest,
      latest
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

        <div className={`source-pill ${source}`}>
          {source === "live" ? "Live Sheet Data" : source === "mock" ? "Mock Data" : "Loading"}
        </div>
      </header>

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

        <select value={difficulty} onChange={e => setDifficulty(e.target.value)}>
          {difficulties.map(d => (
            <option key={d} value={d}>
              {d === "all" ? "All difficulties" : d}
            </option>
          ))}
        </select>

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
            <img src={demon.thumbnail} alt={demon.name} />
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
            <Detail label="Tier" value={formatTier(demon.tier)} />
            <Detail label="Difficulty" value={demon.difficulty} />
            <Detail label="Attempts" value={formatNumber(demon.attempts)} />
            <Detail label="Video" value={demon.video || "None"} />
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
  return (
    <div className="detail">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
