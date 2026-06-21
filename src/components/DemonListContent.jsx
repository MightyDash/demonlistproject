import React, { useEffect, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Grid3X3,
  Info,
  List,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Target,
  Trophy,
  X
} from "lucide-react";
import { StatCard } from "./StatCard.jsx";
import { difficultyClass, formatNumber, isInProgressDemon } from "../demonUtils.js";

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
  onLatestDemonClick,
  isAdmin,
  futureListIds = [],
  onToggleFutureListDemon,
  editListMode = false,
  hasUnsavedListChanges = false,
  onToggleEditList,
  onAddManualDemon,
  onEditManualDemon,
  onMoveDemon,
  onSaveListChanges
}) {
  const [showProgressInfo, setShowProgressInfo] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [showAddDemon, setShowAddDemon] = useState(false);
  const [showEditDemon, setShowEditDemon] = useState(false);
  const [editDemonId, setEditDemonId] = useState("");
  const [editForm, setEditForm] = useState({ attempts: "", note: "", progressPercent: "" });
  const [editState, setEditState] = useState({ saving: false, error: "" });
  const [addForm, setAddForm] = useState({ levelId: "", attempts: "", note: "", placement: "" });
  const [addState, setAddState] = useState({ saving: false, message: "", error: "" });
  const [movingId, setMovingId] = useState("");
  const [saveState, setSaveState] = useState({ saving: false, message: "", error: "" });
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

  async function handleMove(event, demon, direction) {
    event.stopPropagation();
    setMovingId(String(demon.id));
    setAddState({ saving: false, message: "", error: "" });

    const result = await onMoveDemon?.(demon, direction);
    if (!result?.success) {
      setAddState({ saving: false, message: "", error: result?.message || "Placement wijzigen mislukt." });
    }
    setMovingId("");
  }

  async function handleSaveChanges() {
    setSaveState({ saving: true, message: "", error: "" });
    const result = await onSaveListChanges?.();

    if (result?.success) {
      setSaveState({
        saving: false,
        message: result.message || "Changes saved.",
        error: ""
      });
    } else {
      setSaveState({
        saving: false,
        message: "",
        error: result?.message || "Changes could not be saved."
      });
    }
  }

  async function handleAddDemon(event) {
    event.preventDefault();
    setAddState({ saving: false, message: "", error: "" });

    const levelId = addForm.levelId.trim();
    const attempts = Number(addForm.attempts);
    const placement = Number(addForm.placement);

    if (!levelId || !Number.isInteger(attempts) || attempts < 0 || !Number.isInteger(placement) || placement < 1) {
      setAddState({
        saving: false,
        message: "",
        error: "Vul een Level ID, geldige attempts en een geldige placement in."
      });
      return;
    }

    setAddState({ saving: true, message: "", error: "" });
    const result = await onAddManualDemon?.({ ...addForm, levelId, attempts, placement });

    if (!result?.success) {
      setAddState({ saving: false, message: "", error: result?.message || "Demon toevoegen mislukt." });
    }
  }

  function openDemonEditor() {
    const demon = filtered.find(item => String(item.id) === String(editDemonId)) || filtered[0];
    if (demon) {
      setEditDemonId(String(demon.id));
      setEditForm({
        attempts: String(demon.attempts || 0),
        note: demon.notes || "",
        progressPercent: isInProgressDemon(demon) ? String(demon.progressPercent || 0) : ""
      });
    }
    setEditState({ saving: false, error: "" });
    setShowEditDemon(true);
  }

  function selectEditDemon(levelId) {
    const demon = filtered.find(item => String(item.id) === String(levelId));
    setEditDemonId(levelId);
    if (!demon) return;
    setEditForm({
      attempts: String(demon.attempts || 0),
      note: demon.notes || "",
      progressPercent: isInProgressDemon(demon) ? String(demon.progressPercent || 0) : ""
    });
  }

  async function handleEditDemon(event) {
    event.preventDefault();
    const demon = filtered.find(item => String(item.id) === String(editDemonId));
    if (!demon) return;

    const attempts = Number(editForm.attempts);
    const progressPercent = editForm.progressPercent === "" ? "" : Number(editForm.progressPercent);
    if (!Number.isInteger(attempts) || attempts < 0 ||
        (isInProgressDemon(demon) && (!Number.isInteger(progressPercent) || progressPercent < 0 || progressPercent > 100))) {
      setEditState({ saving: false, error: "Controleer attempts en het percentage." });
      return;
    }

    setEditState({ saving: true, error: "" });
    const result = await onEditManualDemon?.(demon, { ...editForm, attempts, progressPercent });
    if (!result?.success) {
      setEditState({ saving: false, error: result?.message || "Demon bewerken mislukt." });
    }
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
              <StatCard icon={<Trophy />} label="Hardest Demon" value={stats.hardest?.name || "Unknown"} detail={stats.hardest?.difficulty || ""} highlight />
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
              {isAdmin && (
                <>
                  <button
                    className={`edit-list-button ${editListMode ? "active" : ""}`}
                    onClick={onToggleEditList}
                    type="button"
                  >
                    {editListMode ? <X size={16} /> : <Pencil size={16} />}
                    {editListMode ? "Done editing" : "Edit List"}
                  </button>
                </>
              )}
              {apiLatestDemon && (
                <button className="latest-link" onClick={onLatestDemonClick} type="button">
                  Latest: {apiLatestDemon}
                </button>
              )}
            </div>
          </div>
          {saveState.message && <p className="manual-save-message success">{saveState.message}</p>}
          {saveState.error && <p className="manual-save-message error">{saveState.error}</p>}

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
                <div className={`demon-table ${editListMode ? "edit-mode" : ""}`}>
                  <div className="row heading">
                    <div>#</div>
                    <div>Demon</div>
                    <div>Creator</div>
                    <div>Difficulty</div>
                    <div>Attempts</div>
                    <div>Year</div>
                    {editListMode && <div>Move</div>}
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
                      <div>
                        <span className={`difficulty ${difficultyClass(demon.difficulty)}`}>
                          {demon.difficulty}
                        </span>
                      </div>
                      <div>{formatNumber(demon.attempts)}</div>
                      <div>{demon.year || ""}</div>
                      {editListMode && (
                        <div className="manual-row-controls">
                          <button
                            onClick={event => handleMove(event, demon, "up")}
                            disabled={isInProgress || movingId === String(demon.id)}
                            type="button"
                            aria-label={`Move ${demon.name} up`}
                          >
                            <ChevronUp size={17} />
                          </button>
                          <button
                            onClick={event => handleMove(event, demon, "down")}
                            disabled={isInProgress || movingId === String(demon.id)}
                            type="button"
                            aria-label={`Move ${demon.name} down`}
                          >
                            <ChevronDown size={17} />
                          </button>
                        </div>
                      )}
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
                            <span className={`grid-chip difficulty-chip ${difficultyClass(demon.difficulty)}`}>
                              {demon.difficulty || "Unknown"}
                            </span>
                            <span className="grid-chip">{demon.year || "Unknown"}</span>
                          </div>
                        )}
                      </div>
                      {editListMode && !renderAsProgress && (
                        <div className="manual-card-controls">
                          <div className="manual-card-arrows">
                            <button
                              onClick={event => handleMove(event, demon, "up")}
                              disabled={movingId === String(demon.id)}
                              type="button"
                              aria-label={`Move ${demon.name} up`}
                            >
                              <ChevronUp size={19} />
                            </button>
                            <button
                              onClick={event => handleMove(event, demon, "down")}
                              disabled={movingId === String(demon.id)}
                              type="button"
                              aria-label={`Move ${demon.name} down`}
                            >
                              <ChevronDown size={19} />
                            </button>
                          </div>
                          <span>{movingId === String(demon.id) ? "Moving..." : "Change placement"}</span>
                        </div>
                      )}
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
            {editListMode && (
              <div className="manual-floating-actions">
                <button
                  className="save-list-button"
                  onClick={handleSaveChanges}
                  disabled={!hasUnsavedListChanges || saveState.saving}
                  type="button"
                >
                  <Check size={18} />
                  {saveState.saving ? "Saving..." : "Save Changes"}
                </button>
                <div className="manual-round-actions">
                  <button
                    className="manual-edit-button"
                    onClick={openDemonEditor}
                    type="button"
                    aria-label="Edit demon"
                    title="Edit demon"
                  >
                    <Pencil size={21} />
                  </button>
                  <button
                    className="manual-add-button"
                    onClick={() => {
                      setAddState({ saving: false, message: "", error: "" });
                      setShowAddDemon(true);
                    }}
                    type="button"
                    aria-label="Add demon"
                    title="Add demon"
                  >
                    <Plus size={25} />
                  </button>
                </div>
              </div>
            )}
            {addState.error && !showAddDemon && <p className="manual-list-toast error">{addState.error}</p>}
            {showAddDemon && (
              <div className="manual-add-backdrop" onMouseDown={() => !addState.saving && setShowAddDemon(false)}>
                <form className="manual-add-modal" onSubmit={handleAddDemon} onMouseDown={event => event.stopPropagation()}>
                  <button
                    className="manual-add-close"
                    onClick={() => setShowAddDemon(false)}
                    disabled={addState.saving}
                    type="button"
                    aria-label="Close"
                  >
                    <X size={20} />
                  </button>
                  <div>
                    <p className="eyebrow">Manual placement</p>
                    <h2>Add Demon</h2>
                  </div>
                  <label>
                    Level ID
                    <input
                      value={addForm.levelId}
                      onChange={event => setAddForm(current => ({ ...current, levelId: event.target.value }))}
                      placeholder="10565740"
                      autoFocus
                    />
                  </label>
                  <div className="manual-add-grid">
                    <label>
                      Attempts
                      <input
                        type="number"
                        min="0"
                        value={addForm.attempts}
                        onChange={event => setAddForm(current => ({ ...current, attempts: event.target.value }))}
                        placeholder="20226"
                      />
                    </label>
                    <label>
                      Placement
                      <input
                        type="number"
                        min="1"
                        max={stats.total + 1}
                        value={addForm.placement}
                        onChange={event => setAddForm(current => ({ ...current, placement: event.target.value }))}
                        placeholder={`1-${stats.total + 1}`}
                      />
                    </label>
                  </div>
                  <label>
                    Note
                    <textarea
                      value={addForm.note}
                      onChange={event => setAddForm(current => ({ ...current, note: event.target.value }))}
                      placeholder="Optional note..."
                      rows={4}
                    />
                  </label>
                  {addState.error && <p className="admin-error">{addState.error}</p>}
                  <button className="login-button" disabled={addState.saving} type="submit">
                    <Plus size={18} />
                    {addState.saving ? "Adding..." : "Add to list"}
                  </button>
                </form>
              </div>
            )}
            {showEditDemon && (
              <div className="manual-add-backdrop" onMouseDown={() => !editState.saving && setShowEditDemon(false)}>
                <form className="manual-add-modal" onSubmit={handleEditDemon} onMouseDown={event => event.stopPropagation()}>
                  <button className="manual-add-close" onClick={() => setShowEditDemon(false)} type="button">
                    <X size={20} />
                  </button>
                  <div>
                    <p className="eyebrow">Edit List</p>
                    <h2>Edit Demon</h2>
                  </div>
                  <label>
                    Demon
                    <select value={editDemonId} onChange={event => selectEditDemon(event.target.value)}>
                      {filtered.map(demon => (
                        <option key={demon.id} value={demon.id}>
                          {demon.name}{isInProgressDemon(demon) ? ` (${demon.progressPercent || 0}%)` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Attempts
                    <input
                      type="number"
                      min="0"
                      value={editForm.attempts}
                      onChange={event => setEditForm(current => ({ ...current, attempts: event.target.value }))}
                    />
                  </label>
                  {isInProgressDemon(filtered.find(item => String(item.id) === String(editDemonId))) && (
                    <label>
                      Progress %
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editForm.progressPercent}
                        onChange={event => setEditForm(current => ({ ...current, progressPercent: event.target.value }))}
                      />
                    </label>
                  )}
                  <label>
                    Note
                    <textarea
                      value={editForm.note}
                      onChange={event => setEditForm(current => ({ ...current, note: event.target.value }))}
                      rows={4}
                    />
                  </label>
                  {editState.error && <p className="admin-error">{editState.error}</p>}
                  <button className="login-button" disabled={editState.saving} type="submit">
                    <Check size={18} />
                    {editState.saving ? "Saving..." : "Save Demon"}
                  </button>
                </form>
              </div>
            )}
            <div className="desktop-footer-status" aria-hidden="true">
              <span>Tip: Click a demon card to view more details and stats.</span>
              <span>Data powered by Google Sheets</span>
              <span>Last updated: live</span>
            </div>
          </>
  );
}

