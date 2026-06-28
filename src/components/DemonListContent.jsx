import React, { useEffect, useState } from "react";
import { BarChart3, Bookmark, Check, Grid3X3, Info, List, MoreHorizontal, Search, SlidersHorizontal, Target, Trophy, X } from "lucide-react";
import { StatCard } from "./StatCard.jsx";
import { difficultyClass, formatNumber, formatTier, isInProgressDemon } from "../demonUtils.js";

export function DemonListContent({
  stats,
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
  totalCount = filtered.length,
  hasMoreDemons,
  onLoadMore,
  apiLatestDemon,
  listUpdatedAt,
  onLatestDemonClick,
  isAdmin,
  futureListIds = [],
  onToggleFutureListDemon
}) {
  const [showProgressInfo, setShowProgressInfo] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const isProgressView = yearView === "progress";
  const isFutureView = yearView === "future";
  const futureIds = new Set(futureListIds.map(id => String(id)));
  const activeFilterCount = [
    query.trim(),
    difficulty !== "all",
    segment !== "all",
    yearView !== "all"
  ].filter(Boolean).length;
  const progressInfoText = "It is not yet clear whether these demons will get beaten in the future. I am certain that some will, but I still have my doubts about others. This is just a reminder to myself";
  const formattedUpdatedAt = listUpdatedAt
    ? new Intl.DateTimeFormat("nl-NL", {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: "Europe/Amsterdam"
      }).format(new Date(listUpdatedAt))
    : "Unknown";
  const yearOptions = [
    ["all", "2026"],
    ["2025", "2025"],
    ["2024", "2024"],
    ["2023", "2023"],
    ["2022", "2022"],
    ["2021", "2021"],
    ["2020", "2020"],
    ["2019", "2019"],
    ["progress", "In Progress"],
    ["future", "Future List"]
  ];

  useEffect(() => {
    if (!filterDrawerOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event) {
      if (event.key === "Escape") setFilterDrawerOpen(false);
    }

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [filterDrawerOpen]);

  function resetFilters() {
    setQuery("");
    setDifficulty("all");
    setSegment("all");
    setYearView("all");
    setViewMode("grid");
  }

  function handleOpenKey(event, demon) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    setSelected(demon);
  }

  function placementTrendClass(demon) {
    if (isProgressView || isFutureView) return "";

    const placement = String(demon.placement || "");
    if (placement.includes("▲")) return "placement-moved-up";
    if (placement.includes("▼")) return "placement-moved-down";
    return "";
  }

  return (
          <>
            <section className="stats-grid">
              <StatCard icon={<Trophy />} label="Total Demons" value={formatNumber(stats.total)} />
              <StatCard icon={<Target />} label="Total Attempts" value={formatNumber(stats.attempts)} />
              <StatCard icon={<BarChart3 />} label="Hardest Demon" value={stats.hardest?.name || "Unknown"} detail={stats.hardest?.difficulty || ""} highlight />
            </section>
    
            <div className={`desktop-list-shell ${isProgressView ? "progress-shell" : ""}`}>
            <div className="mobile-filter-bar">
              <button
                className="mobile-filter-button"
                onClick={() => setFilterDrawerOpen(true)}
                type="button"
                aria-expanded={filterDrawerOpen}
                aria-controls="demon-list-filters"
              >
                <SlidersHorizontal size={18} />
                Filters
                {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
              </button>
              <span>{totalCount} demons</span>
            </div>

            {filterDrawerOpen && (
              <button
                className="mobile-filter-backdrop"
                onClick={() => setFilterDrawerOpen(false)}
                type="button"
                aria-label="Close filters"
              />
            )}

            <section
              id="demon-list-filters"
              className={`panel controls ${filterDrawerOpen ? "mobile-open" : ""}`}
            >
              <div className="filter-title-row">
                <strong>Filters</strong>
                <div className="filter-title-actions">
                  <button type="button" onClick={resetFilters}>Reset all</button>
                  <button
                    className="mobile-filter-close"
                    onClick={() => setFilterDrawerOpen(false)}
                    type="button"
                    aria-label="Close filters"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
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
    
              <span className="filter-section-label">Year</span>
              <div className="tabs year-tabs">
                {yearOptions.map(([value, label]) => (
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
    
              <span className="filter-section-label">View</span>
              <div className="tabs view-tabs">
                {[
                  ["grid", "Grid", <Grid3X3 size={15} />],
                  ["list", "List", <List size={15} />]
                ].map(([value, label, icon]) => (
                  <button
                    key={value}
                    className={viewMode === value ? "active" : ""}
                    onClick={() => setViewMode(value)}
                    type="button"
                  >
                    {icon}
                    {label}
                  </button>
                ))}
              </div>

              <button
                className="mobile-filter-apply"
                onClick={() => setFilterDrawerOpen(false)}
                type="button"
              >
                <Check size={18} />
                Show {totalCount} demons
              </button>
            </section>
    
            <main className="panel table-panel">
          <div className="table-header">
            <span className="table-count">
              {filtered.length === totalCount
                ? `${totalCount} demons shown`
                : `${filtered.length} of ${totalCount} demons shown`}
              {isProgressView && (
                <span className="progress-info-wrap">
                  <button
                    className="progress-info-button"
                    onClick={() => setShowProgressInfo(true)}
                    type="button"
                    aria-label="In progress info"
                  >
                    <Info size={15} />
                  </button>
                </span>
              )}
            </span>
            <div className="list-status-links">
              <span className="list-updated-at">Updated {formattedUpdatedAt}</span>
              {apiLatestDemon && (
                <button className="latest-link" onClick={onLatestDemonClick} type="button">
                  Latest: {apiLatestDemon}
                </button>
              )}
            </div>
          </div>

          {showProgressInfo && (
            <div className="progress-info-backdrop" onClick={() => setShowProgressInfo(false)}>
              <section className="progress-info-modal" onClick={event => event.stopPropagation()}>
                <button
                  className="progress-info-close"
                  onClick={() => setShowProgressInfo(false)}
                  type="button"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
                <p>
                  {progressInfoText}
                </p>
              </section>
            </div>
          )}
    
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
    
                  {filtered.map(demon => {
                    const isInProgress = isInProgressDemon(demon);
                    const renderAsProgress = isInProgress && isProgressView;
                    const progressPercent = Math.max(0, Math.min(100, Number(demon.progressPercent || 0)));
                    const isFuturePick = futureIds.has(String(demon.id));
                    const placementLabel = isFutureView ? (demon.futurePlacement || demon.placement) : demon.placement;
                    const trendClass = placementTrendClass(demon);

                    return (
                    <div
                      className={`row demon-row ${trendClass}`}
                      key={`${demon.id}-${demon.name}`}
                      onClick={() => setSelected(demon)}
                      onKeyDown={event => handleOpenKey(event, demon)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="placement">{renderAsProgress ? `${progressPercent}%` : placementLabel}</div>
                      <div className="name-cell">
                        <span className="demon-name">{demon.name}</span>
                        <span className="mobile-meta">{demon.creator}</span>
                        {isProgressView && isFuturePick && <span className="future-list-badge">Future List</span>}
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
                    </div>
                    );
                  })}
                </div>
              ) : (
                <div className="demon-grid">
                  {filtered.map(demon => {
                    const isInProgress = isInProgressDemon(demon);
                    const renderAsProgress = isInProgress && isProgressView;
                    const progressPercent = Math.max(0, Math.min(100, Number(demon.progressPercent || 0)));
                    const isFuturePick = futureIds.has(String(demon.id));
                    const placementLabel = isFutureView ? (demon.futurePlacement || demon.placement) : demon.placement;
                    const trendClass = placementTrendClass(demon);

                    return (
                    <article
                      className={`grid-card ${renderAsProgress ? "in-progress-card" : ""} ${trendClass}`}
                      key={`${demon.id}-${demon.name}`}
                      data-demon-id={demon.id}
                      onClick={() => setSelected(demon)}
                      onKeyDown={event => handleOpenKey(event, demon)}
                      role="button"
                      tabIndex={0}
                    >
                      <img
                        src={demon.thumbnail}
                        alt={demon.name}
                        className="grid-thumb"
                        loading="lazy"
                        decoding="async"
                        onError={e => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
    
                      <div className="grid-overlay">
                        <div>
                          <h3>{demon.name}</h3>
                          <p>by {demon.creator || "Unknown creator"}</p>
                          {!renderAsProgress && <span className="grid-rank-inline">{placementLabel}</span>}
                        </div>

                        {renderAsProgress ? (
                          <>
                            {isAdmin && (
                              <label className="future-list-toggle" onClick={event => event.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isFuturePick}
                                  onChange={() => onToggleFutureListDemon?.(demon)}
                                />
                                <span>Future List</span>
                              </label>
                            )}
                            {!isAdmin && isFuturePick && <span className="future-list-badge">Future List</span>}
                            <span className={`difficulty ${difficultyClass(demon.difficulty)}`}>
                              {demon.difficulty || "Unknown"}
                            </span>
                            <div className="progress-card-meter" aria-label={`Progress ${progressPercent}%`}>
                              <span>{progressPercent}%</span>
                              {progressPercent === 67 && <small>(shut up)</small>}
                            </div>
                            <div className="progress-bar"><span style={{ width: `${progressPercent}%` }} /></div>
                          </>
                        ) : (
                          <div className="grid-meta">
                            <span className="grid-chip tier-chip">Tier {formatTier(demon.tier)}</span>
                            <span className={`grid-chip difficulty-chip ${difficultyClass(demon.difficulty)}`}>
                              {demon.difficulty || "Unknown"}
                            </span>
                            <span className="grid-chip">{demon.year || "Unknown"}</span>
                          </div>
                        )}
                      </div>
                      <div className="grid-actions" aria-hidden="true">
                        <button type="button" onClick={event => event.stopPropagation()}><Bookmark size={18} /></button>
                        <button type="button" onClick={event => event.stopPropagation()}><BarChart3 size={18} /></button>
                        <button type="button" onClick={event => event.stopPropagation()}><MoreHorizontal size={18} /></button>
                      </div>
                    </article>
                    );
                  })}
                </div>
              )}
              {hasMoreDemons && (
                <div className="load-more-row">
                  <button className="login-button load-more-button" onClick={onLoadMore} type="button">
                    Load more demons
                  </button>
                </div>
              )}
            </main>
            </div>
            <div className="desktop-footer-status" aria-hidden="true">
              <span>Tip: Click a demon card to view more details and stats.</span>
              <span>Data powered by Google Sheets</span>
              <span>Last updated: {formattedUpdatedAt}</span>
            </div>
          </>
  );
}

