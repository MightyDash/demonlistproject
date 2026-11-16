import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Clock3, Info, Search, SlidersHorizontal, X } from "lucide-react";
import { DeviceLabel } from "./DeviceLabel.jsx";
import { difficultyClass, formatDemonDuration, formatNumber, formatTier, isInProgressDemon } from "../demonUtils.js";
import { DEVICE_OPTIONS } from "../deviceUtils.js";

function displayPlacement(value) {
  return String(value || "").trim() || "Unplaced";
}
export function DemonListContent({
  setSelected,
  query,
  setQuery,
  device,
  setDevice,
  deviceOpen,
  setDeviceOpen,
  difficulty,
  setDifficulty,
  difficultyOpen,
  setDifficultyOpen,
  difficulties,
  segment,
  setSegment,
  yearView,
  setYearView,
  durationSort,
  setDurationSort,
  levelIdSort,
  setLevelIdSort,
  viewMode,
  setViewMode,
  filtered,
  totalCount = filtered.length,
  hasMoreDemons,
  onLoadMore,
  apiLatestDemon,
  onLatestDemonClick,
  demonListError,
  onRetryDemonList,
  progressTrackerView = false,
  isMobileView = false,
  futureListIds = [],
  communityRequestedIds = new Set()
}) {
  const [showProgressInfo, setShowProgressInfo] = useState(false);
  const progressInfoRef = useRef(null);
  const progressInfoButtonRef = useRef(null);
  const progressInfoPopoverRef = useRef(null);
  const [progressInfoPosition, setProgressInfoPosition] = useState({ top: 0, left: 0 });
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [yearMenuOpen, setYearMenuOpen] = useState(false);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const filterMenusRef = useRef(null);
  const isProgressView = progressTrackerView || yearView === "progress";
  const isFutureView = yearView === "future";
  const futureIds = new Set(futureListIds.map(id => String(id)));
  const requestedIds = communityRequestedIds instanceof Set
    ? communityRequestedIds
    : new Set(Array.from(communityRequestedIds || []).map(String));
  const activeFilterCount = [
    query.trim(),
    device !== "all",
    difficulty !== "all",
    segment !== "all",
    yearView !== "all" && !progressTrackerView
  ].filter(Boolean).length;
  const progressInfoText = 'Demons I have progress on. This view will one day be made clearer with types of progresses like "Planned", "Dropped" & "On Hold"';
  const yearOptions = [
    ["all", "2026"],
    ["2025", "2025"],
    ["2024", "2024"],
    ["2023", "2023"],
    ["2022", "2022"],
    ["2021", "2021"],
    ["2020", "2020"],
    ["2019", "2019"],
    ["2018", "2018"],
    ["future", "Future List"],
    ["duration", "Length"],
    ["level-id", "Level ID"]
  ];
  const mainYearOptions = yearOptions.slice(0, 9);
  const extraFilterOptions = yearOptions.slice(9);

  useEffect(() => {
    if (!yearMenuOpen && !moreFiltersOpen) return;
    function closeOnOutside(event) {
      if (!filterMenusRef.current?.contains(event.target)) {
        setYearMenuOpen(false);
        setMoreFiltersOpen(false);
      }
    }
    function closeOnEscape(event) {
      if (event.key === "Escape") {
        setYearMenuOpen(false);
        setMoreFiltersOpen(false);
      }
    }
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [yearMenuOpen, moreFiltersOpen]);

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

  useEffect(() => {
    if (!showProgressInfo) return;

    function handleOutsideClick(event) {
      const clickedTrigger = progressInfoRef.current?.contains(event.target);
      const clickedPopover = progressInfoPopoverRef.current?.contains(event.target);
      if (!clickedTrigger && !clickedPopover) {
        setShowProgressInfo(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") setShowProgressInfo(false);
    }

    function updatePosition() {
      const rect = progressInfoButtonRef.current?.getBoundingClientRect();
      if (!rect) return;

      const popoverWidth = Math.min(320, window.innerWidth - 32);
      const halfWidth = popoverWidth / 2;
      setProgressInfoPosition({
        top: rect.bottom + 10,
        left: Math.max(16 + halfWidth, Math.min(rect.left + rect.width / 2, window.innerWidth - 16 - halfWidth))
      });
    }

    updatePosition();
    document.addEventListener("pointerdown", handleOutsideClick);
    window.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [showProgressInfo]);

  function resetFilters() {
    setYearMenuOpen(false);
    setMoreFiltersOpen(false);
    setQuery("");
    setDevice("all");
    setDifficulty("all");
    setSegment("all");
    setYearView(progressTrackerView ? "progress" : "all");
    setDurationSort("longest");
    setLevelIdSort("newest");
    setViewMode(isMobileView ? "grid" : "banner");
  }

  function handleOpenKey(event, demon) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    setSelected(demon);
  }

  function placementTrendClass(demon) {
    if (isProgressView || isFutureView || demon.historicalPlacement) return "";

    const placement = String(demon.placement || "");
    if (placement.includes("\u25b2")) return "placement-moved-up";
    if (placement.includes("\u25bc")) return "placement-moved-down";
    return "";
  }

  return (
          <>
            <div className={`desktop-list-shell ${isProgressView ? "progress-shell" : ""}`}>
            {!progressTrackerView && <>
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
              ref={filterMenusRef}
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

              <div className="custom-select year-filter-select">
                <button
                  className="custom-select-button"
                  type="button"
                  aria-expanded={yearMenuOpen}
                  onClick={() => {
                    setYearMenuOpen(open => !open);
                    setMoreFiltersOpen(false);
                    setDeviceOpen(false);
                    setDifficultyOpen(false);
                  }}
                >
                  <span>Year: {mainYearOptions.find(([value]) => value === yearView)?.[1] || "2026"}</span>
                  <span className="custom-select-arrow">⌄</span>
                </button>
                {yearMenuOpen && <div className="custom-select-menu year-filter-menu">
                  {mainYearOptions.map(([value, label]) => (
                    <button key={value} type="button" className={`custom-select-option ${yearView === value ? "active" : ""}`}
                      onClick={() => { setYearView(value); setYearMenuOpen(false); }}>{label}</button>
                  ))}
                </div>}
              </div>

              <div className="custom-select device-filter-select">
                <button
                  className="custom-select-button"
                  onClick={() => {
                    setDeviceOpen(open => !open);
                    setDifficultyOpen(false);
                    setYearMenuOpen(false);
                    setMoreFiltersOpen(false);
                  }}
                  type="button"
                >
                  <span>{device === "all" ? "All Devices" : device}</span>
                  <span className="custom-select-arrow">⌄</span>
                </button>

                {deviceOpen && (
                  <div className="custom-select-menu">
                    {["all", ...DEVICE_OPTIONS].map(option => (
                      <button
                        key={option}
                        type="button"
                        className={`custom-select-option ${device === option ? "active" : ""}`}
                        onClick={() => {
                          setDevice(option);
                          setDeviceOpen(false);
                        }}
                      >
                        {option === "all" ? "All Devices" : option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
    
              <div className="custom-select">
                <button
                  className="custom-select-button"
                  onClick={() => {
                    setDifficultyOpen(open => !open);
                    setDeviceOpen(false);
                    setYearMenuOpen(false);
                    setMoreFiltersOpen(false);
                  }}
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
    
              <div className="more-filters-wrap">
                <button className={`more-filters-button ${moreFiltersOpen || extraFilterOptions.some(([value]) => yearView === value) ? "active" : ""}`}
                  type="button" aria-expanded={moreFiltersOpen}
                  onClick={() => { setMoreFiltersOpen(open => !open); setYearMenuOpen(false); setDeviceOpen(false); setDifficultyOpen(false); }}>
                  <SlidersHorizontal size={17} /> More filters <span className="custom-select-arrow">⌄</span>
                </button>
                {moreFiltersOpen && <div className="more-filters-popover">
                  <strong>Advanced filters</strong>
                  {extraFilterOptions.map(([value, label]) => (
                  <button
                    key={value}
                    className={`more-filter-option ${yearView === value ? "active" : ""}`}
                    onClick={() => { setYearView(yearView === value ? "all" : value); if (value === "future") setMoreFiltersOpen(false); }}
                    type="button"
                  >
                    <span className="more-filter-check">{yearView === value && <Check size={13} />}</span>
                    {label}
                  </button>
                ))}
                  {yearView === "duration" && <div className="advanced-sort-options">
                    <span>Sort by length</span>
                    <button type="button" className={durationSort === "longest" ? "active" : ""} onClick={() => setDurationSort("longest")}>Longest to shortest</button>
                    <button type="button" className={durationSort === "shortest" ? "active" : ""} onClick={() => setDurationSort("shortest")}>Shortest to longest</button>
                  </div>}
                  {yearView === "level-id" && <div className="advanced-sort-options">
                    <span>Sort by Level ID</span>
                    <button type="button" className={levelIdSort === "newest" ? "active" : ""} onClick={() => setLevelIdSort("newest")}>Newest to oldest</button>
                    <button type="button" className={levelIdSort === "oldest" ? "active" : ""} onClick={() => setLevelIdSort("oldest")}>Oldest to newest</button>
                  </div>}
                </div>}
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
            </>}
    
            <main className="panel table-panel">
          <div className="table-header">
            <span className="table-count">
              {filtered.length === totalCount
                ? `${totalCount} demons shown`
                : `${filtered.length} of ${totalCount} demons shown`}
              {isProgressView && (
                <span className="progress-info-wrap" ref={progressInfoRef}>
                  <button
                    ref={progressInfoButtonRef}
                    className="progress-info-button"
                    onClick={() => setShowProgressInfo(current => !current)}
                    type="button"
                    aria-label="In progress info"
                    aria-expanded={showProgressInfo}
                  >
                    <Info size={15} />
                  </button>
                  {showProgressInfo && createPortal(
                    <section
                      ref={progressInfoPopoverRef}
                      className="progress-info-popover"
                      role="status"
                      style={{ top: progressInfoPosition.top, left: progressInfoPosition.left }}
                    >
                      <button
                        className="progress-info-popover-close"
                        onClick={() => setShowProgressInfo(false)}
                        type="button"
                        aria-label="Close"
                      >
                        <X size={16} />
                      </button>
                      <p>{progressInfoText}</p>
                    </section>,
                    document.body
                  )}
                </span>
              )}
            </span>
            <div className="list-status-links">
              {!progressTrackerView && apiLatestDemon && (
                <button className="latest-link" onClick={onLatestDemonClick} type="button">
                  Latest: {apiLatestDemon}
                </button>
              )}
            </div>
          </div>

          {demonListError && (
            <div className="admin-error">
              {demonListError}
              {onRetryDemonList && (
                <button className="close-button" onClick={onRetryDemonList} type="button">
                  Try again
                </button>
              )}
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
                    <div>Date</div>
                  </div>
    
                  {filtered.map(demon => {
                    const isInProgress = isInProgressDemon(demon);
                    const renderAsProgress = isInProgress && isProgressView;
                    const progressPercent = Math.max(0, Math.min(100, Number(demon.progressPercent || 0)));
                    const isFuturePick = futureIds.has(String(demon.id));
                    const isCommunityRequested = requestedIds.has(String(demon.id));
                    const placementLabel = displayPlacement(isFutureView ? (demon.futurePlacement || demon.placement) : demon.placement);
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
                      <div className={`placement ${demon.historicalPlacement ? "historical-placement" : ""}`}>
                        {renderAsProgress ? `${progressPercent}%` : demon.historicalPlacement ? (
                          <>
                            <strong>{demon.historicalPlacement}</strong>
                            <small>Current Placement: {displayPlacement(demon.placement)}</small>
                          </>
                        ) : placementLabel}
                      </div>
                      <div className="name-cell">
                        <span className="demon-name">{demon.name}</span>
                        <span className="mobile-meta">{demon.creator}</span>
                        {isCommunityRequested && <span className="community-requested-badge">Community Requested</span>}
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
                      <div>{demon.date || demon.year || ""}</div>
                    </div>
                    );
                  })}
                </div>
              ) : viewMode === "banner" ? (
                <div className="demon-banner-list">
                  {filtered.map(demon => {
                    const isInProgress = isInProgressDemon(demon);
                    const renderAsProgress = isInProgress && isProgressView;
                    const progressPercent = Math.max(0, Math.min(100, Number(demon.progressPercent || 0)));
                    const isFuturePick = futureIds.has(String(demon.id));
                    const isCommunityRequested = requestedIds.has(String(demon.id));
                    const placementLabel = displayPlacement(isFutureView ? (demon.futurePlacement || demon.placement) : demon.placement);
                    const trendClass = placementTrendClass(demon);
                    const durationLabel = formatDemonDuration(demon);

                    return (
                      <article
                        className={`banner-card ${renderAsProgress ? "in-progress-banner" : ""} ${trendClass}`}
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
                          className="banner-thumb"
                          loading="lazy"
                          decoding="async"
                          onError={e => {
                            e.currentTarget.style.display = "none";
                          }}
                        />

                        <div className="banner-shade" />

                        <div className={`banner-placement ${demon.historicalPlacement ? "historical-placement" : ""}`}>
                          {renderAsProgress ? `${progressPercent}%` : demon.historicalPlacement ? (
                            <>
                              <strong>{demon.historicalPlacement}</strong>
                              <small>Current Placement: {displayPlacement(demon.placement)}</small>
                            </>
                          ) : placementLabel}
                        </div>

                        <div className="banner-main">
                          <h3>{demon.name}</h3>
                          <p>by {demon.creator || "Unknown creator"}</p>
                          {isCommunityRequested && <span className="community-requested-badge">Community Requested</span>}
                          {isProgressView && isFuturePick && <span className="future-list-badge">Future List</span>}
                        </div>

                        {renderAsProgress ? (
                          <div className="banner-side progress-side">
                            <span className={`difficulty ${difficultyClass(demon.difficulty)}`}>
                              {demon.difficulty || "Unknown"}
                            </span>
                            <div className="banner-progress-bar">
                              <span style={{ width: `${progressPercent}%` }} />
                            </div>
                          </div>
                        ) : (
                          <div className="banner-side">
                            <DeviceLabel device={demon.device} />
                            <span>Tier {formatTier(demon.tier)}</span>
                            {durationLabel && (
                              <span className="duration-label" title="Level duration">
                                <Clock3 size={15} aria-hidden="true" />
                                {durationLabel}
                              </span>
                            )}
                            <strong className={difficultyClass(demon.difficulty)}>{demon.difficulty || "Unknown"}</strong>
                            <span>{formatNumber(demon.attempts)} {Number(demon.attempts) === 1 ? "attempt" : "attempts"}</span>
                            <span>{demon.date || demon.year || "Unknown"}</span>
                          </div>
                        )}
                      </article>
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
                    const isCommunityRequested = requestedIds.has(String(demon.id));
                    const placementLabel = displayPlacement(isFutureView ? (demon.futurePlacement || demon.placement) : demon.placement);
                    const trendClass = placementTrendClass(demon);
                    const durationLabel = formatDemonDuration(demon);

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
                          {isCommunityRequested && <span className="community-requested-badge">Community Requested</span>}
                          {!renderAsProgress && (
                            <span className={`grid-rank-inline ${demon.historicalPlacement ? "historical-placement" : ""}`}>
                              {demon.historicalPlacement ? (
                                <>
                                  <strong>{demon.historicalPlacement}</strong>
                                  <small>Current Placement: {displayPlacement(demon.placement)}</small>
                                </>
                              ) : placementLabel}
                            </span>
                          )}
                        </div>

                        {renderAsProgress ? (
                          <>
                            {isFuturePick && <span className="future-list-badge">Future List</span>}
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
                            {durationLabel && (
                              <span className="grid-chip duration-chip" title="Level duration">
                                <Clock3 size={15} aria-hidden="true" />
                                {durationLabel}
                              </span>
                            )}
                            <span className={`grid-chip difficulty-chip ${difficultyClass(demon.difficulty)}`}>
                              {demon.difficulty || "Unknown"}
                            </span>
                            <span className="grid-chip">{demon.date || demon.year || "Unknown"}</span>
                          </div>
                        )}
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
          </>
  );
} 
