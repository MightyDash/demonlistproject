import React from "react";
import { Search, Trophy, Target, Film, BarChart3 } from "lucide-react";
import { StatCard } from "./StatCard.jsx";
import { difficultyClass, formatNumber, formatTier } from "../demonUtils.js";

export function DemonListContent({
  stats,
  hardestBySkillset,
  skillsetOpen,
  setSkillsetOpen,
  setSelected,
  query,
  setQuery,
  difficulty,
  setDifficulty,
  difficultyOpen,
  setDifficultyOpen,
  difficulties,
  segment,
  setSegment,
  yearView,
  setYearView,
  viewMode,
  setViewMode,
  filtered,
  apiLatestDemon
}) {
  return (
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
                  type="search"
                  name="search"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck="false"
                  data-lpignore="true"
                  data-1p-ignore="true"
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
                      <span className="grid-rank-badge">{demon.placement}</span>
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
                          <span className="grid-chip tier-chip">Tier {formatTier(demon.tier)}</span>
                          <span className={`grid-chip difficulty-chip ${difficultyClass(demon.difficulty)}`}>
                            {demon.difficulty || "Unknown"}
                          </span>
                          <span className="grid-chip">{demon.year || "Unknown"}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </main>
          </>
  );
}

