import React, { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Download, ListOrdered, RotateCcw, RotateCw, Save, X } from "lucide-react";
import { DEVICE_OPTIONS } from "../deviceUtils.js";
import {
  buildBulkEditChanges,
  createDemonEditDraft,
  validateBulkEditChanges
} from "../bulkEditUtils.js";

export function BulkDemonEditor({ demons, saving, onSave, onFetchGDDL, onClose }) {
  const [search, setSearch] = useState("");
  const [openIds, setOpenIds] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [error, setError] = useState("");
  const [fetchingId, setFetchingId] = useState("");
  const [reorderMode, setReorderMode] = useState(false);
  const [orderedIds, setOrderedIds] = useState(() => demons.map(demon => String(demon.id)));
  const [placementTargets, setPlacementTargets] = useState({});

  const originalById = useMemo(
    () => new Map(demons.map(demon => [String(demon.id), createDemonEditDraft(demon)])),
    [demons]
  );
  const orderedDemons = useMemo(() => {
    const byId = new Map(demons.map(demon => [String(demon.id), demon]));
    return orderedIds.map(id => byId.get(id)).filter(Boolean);
  }, [demons, orderedIds]);
  const filteredDemons = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orderedDemons.filter(demon => !query || [demon.name, demon.creator, demon.id]
      .some(value => String(value || "").toLowerCase().includes(query)));
  }, [orderedDemons, search]);
  const completedIds = useMemo(() => orderedDemons
    .filter(demon => String(demon.status || "COMPLETED").toUpperCase() !== "IN PROGRESS")
    .map(demon => String(demon.id)), [orderedDemons]);
  const originalCompletedIds = useMemo(() => demons
    .filter(demon => String(demon.status || "COMPLETED").toUpperCase() !== "IN PROGRESS")
    .map(demon => String(demon.id)), [demons]);
  const changes = useMemo(() => {
    const byId = new Map(buildBulkEditChanges(demons, drafts).map(change => [String(change.levelId), change]));
    const originalPlacement = new Map(originalCompletedIds.map((id, index) => [id, index + 1]));
    completedIds.forEach((id, index) => {
      if (originalPlacement.get(id) === index + 1) return;
      byId.set(id, { ...(byId.get(id) || { levelId: id }), placement: index + 1 });
    });
    return Array.from(byId.values());
  }, [demons, drafts, completedIds, originalCompletedIds]);
  const dirtyIds = useMemo(() => new Set(changes.map(change => String(change.levelId))), [changes]);

  function currentDraft(levelId) {
    return drafts[levelId] || originalById.get(levelId) || createDemonEditDraft(null);
  }

  function toggleDemon(levelId) {
    setOpenIds(current => current.includes(levelId)
      ? current.filter(id => id !== levelId)
      : [...current, levelId]);
  }

  function updateDraft(levelId, field, value) {
    const before = currentDraft(levelId)[field];
    if (String(before ?? "") === String(value ?? "")) return;

    setDrafts(current => ({
      ...current,
      [levelId]: { ...(current[levelId] || originalById.get(levelId)), [field]: value }
    }));
    setUndoStack(current => [...current, { type: "field", levelId, field, before, after: value }]);
    setRedoStack([]);
    setError("");
  }

  function applyHistoryValue(action, value) {
    if (action.type === "order") {
      setOrderedIds(value);
      return;
    }
    setDrafts(current => ({
      ...current,
      [action.levelId]: {
        ...(current[action.levelId] || originalById.get(action.levelId)),
        [action.field]: value
      }
    }));
  }

  function undo() {
    const action = undoStack[undoStack.length - 1];
    if (!action) return;
    applyHistoryValue(action, action.before);
    setUndoStack(current => current.slice(0, -1));
    setRedoStack(current => [...current, action]);
    setError("");
  }

  function redo() {
    const action = redoStack[redoStack.length - 1];
    if (!action) return;
    applyHistoryValue(action, action.after);
    setRedoStack(current => current.slice(0, -1));
    setUndoStack(current => [...current, action]);
    setError("");
  }

  function discardAll() {
    setDrafts({});
    setOrderedIds(demons.map(demon => String(demon.id)));
    setUndoStack([]);
    setRedoStack([]);
    setError("");
  }

  function applyOrder(nextOrder) {
    if (nextOrder.join("|") === orderedIds.join("|")) return;
    setUndoStack(current => [...current, { type: "order", before: orderedIds, after: nextOrder }]);
    setRedoStack([]);
    setOrderedIds(nextOrder);
    setError("");
  }

  function moveDemon(levelId, offset) {
    const completedIndex = completedIds.indexOf(levelId);
    const targetIndex = completedIndex + offset;
    if (completedIndex < 0 || targetIndex < 0 || targetIndex >= completedIds.length) return;

    const otherId = completedIds[targetIndex];
    const nextOrder = [...orderedIds];
    const firstIndex = nextOrder.indexOf(levelId);
    const secondIndex = nextOrder.indexOf(otherId);
    [nextOrder[firstIndex], nextOrder[secondIndex]] = [nextOrder[secondIndex], nextOrder[firstIndex]];
    applyOrder(nextOrder);
  }

  function moveToPlacement(levelId) {
    const requested = Number(placementTargets[levelId]);
    if (!Number.isInteger(requested) || requested < 1 || requested > completedIds.length) {
      setError(`Placement must be between 1 and ${completedIds.length}.`);
      return;
    }

    const currentIndex = completedIds.indexOf(levelId);
    const targetIndex = requested - 1;
    if (currentIndex < 0 || currentIndex === targetIndex) return;
    const reorderedCompleted = [...completedIds];
    reorderedCompleted.splice(currentIndex, 1);
    reorderedCompleted.splice(targetIndex, 0, levelId);
    let completedCursor = 0;
    applyOrder(orderedIds.map(id => completedIds.includes(id) ? reorderedCompleted[completedCursor++] : id));
    setPlacementTargets(current => ({ ...current, [levelId]: "" }));
  }

  async function fetchFromGDDL(levelId) {
    if (!onFetchGDDL || fetchingId) return;
    setFetchingId(levelId);
    setError("");

    try {
      const result = await onFetchGDDL(levelId);
      if (!result?.success || !result.level) {
        setError(result?.message || "Could not load this level from GDDL.");
        return;
      }

      const level = result.level;
      updateDraft(levelId, "name", level.name || currentDraft(levelId).name);
      updateDraft(levelId, "creator", level.creator || currentDraft(levelId).creator);
      updateDraft(levelId, "difficulty", level.difficulty || currentDraft(levelId).difficulty);
    } catch (fetchError) {
      setError(fetchError?.message || "Could not load this level from GDDL.");
    } finally {
      setFetchingId("");
    }
  }

  async function saveAll() {
    const validationError = validateBulkEditChanges(changes);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!changes.length) return;

    const result = await onSave(changes);
    if (result?.success) {
      setDrafts({});
      setUndoStack([]);
      setRedoStack([]);
      setError("");
    }
  }

  return (
    <div className="admin-form bulk-edit-form">
      <div className="bulk-edit-header">
        <div>
          <h3>Edit Demon</h3>
          <p className="admin-form-note">Open demons, edit multiple entries and save every change in one batch.</p>
        </div>
        <div className="bulk-edit-header-actions">
          <button className={`close-button${reorderMode ? " active" : ""}`} type="button" onClick={() => setReorderMode(active => !active)}>
            <ListOrdered size={17} /> {reorderMode ? "Done reordering" : "Reorder list"}
          </button>
          <span>{demons.length} demons</span>
        </div>
      </div>

      <label>
        Search
        <input
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Search demon, creator or ID..."
        />
      </label>

      <div className="bulk-edit-list">
        {filteredDemons.map(demon => {
          const levelId = String(demon.id);
          const draft = currentDraft(levelId);
          const isOpen = openIds.includes(levelId);
          const isDirty = dirtyIds.has(levelId);
          const completedIndex = completedIds.indexOf(levelId);

          return (
            <article className={`bulk-edit-row${isOpen ? " is-open" : ""}${isDirty ? " is-dirty" : ""}`} key={levelId || demon.name}>
              <div className="bulk-edit-summary">
                <button className="bulk-edit-summary-main" type="button" onClick={() => toggleDemon(levelId)}>
                  <img
                    src={`https://levelthumbs.prevter.me/thumbnail/${levelId}`}
                    alt=""
                    onError={event => { event.currentTarget.style.display = "none"; }}
                  />
                  <span className="bulk-edit-identity">
                    <strong>{demon.name}</strong>
                    <small>{completedIndex >= 0 ? `#${completedIndex + 1}` : "Unplaced"} · ID: {levelId} · {demon.creator || "Unknown creator"}</small>
                  </span>
                </button>
                {reorderMode && completedIndex >= 0 && (
                  <span className="bulk-edit-reorder-actions">
                    <button type="button" onClick={() => moveDemon(levelId, -1)} disabled={completedIndex === 0 || saving} aria-label={`Move ${demon.name} up`}><ArrowUp size={17} /></button>
                    <button type="button" onClick={() => moveDemon(levelId, 1)} disabled={completedIndex === completedIds.length - 1 || saving} aria-label={`Move ${demon.name} down`}><ArrowDown size={17} /></button>
                  </span>
                )}
                <span className="bulk-edit-device">{draft.device || "No device"}</span>
                {isDirty && <span className="bulk-edit-unsaved">Unsaved</span>}
                <button className="bulk-edit-expand" type="button" onClick={() => toggleDemon(levelId)} aria-label={`${isOpen ? "Close" : "Open"} ${demon.name} editor`}>
                  {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
              </div>

              {isOpen && (
                <div className="bulk-edit-fields">
                  <div className="bulk-edit-gddl-row">
                    <span>Refresh the public level fields without changing your attempts, date, status or device.</span>
                    <button
                      className="gddl-fetch-button"
                      type="button"
                      onClick={() => fetchFromGDDL(levelId)}
                      disabled={Boolean(fetchingId) || saving}
                    >
                      <Download size={16} /> {fetchingId === levelId ? "Loading..." : "Fetch from GDDL"}
                    </button>
                  </div>
                  <div className="edit-fields-grid">
                    <label>Name<input value={draft.name} onChange={event => updateDraft(levelId, "name", event.target.value)} /></label>
                    <label>Difficulty<input value={draft.difficulty} onChange={event => updateDraft(levelId, "difficulty", event.target.value)} /></label>
                    <label>Maker(s)<input value={draft.creator} onChange={event => updateDraft(levelId, "creator", event.target.value)} /></label>
                    <label>Date<input value={draft.date} onChange={event => updateDraft(levelId, "date", event.target.value)} /></label>
                    <label>Attempts<input type="number" min="0" value={draft.attempts} onChange={event => updateDraft(levelId, "attempts", event.target.value)} /></label>
                    <label>Status
                      <select value={draft.status} onChange={event => updateDraft(levelId, "status", event.target.value)}>
                        <option value="COMPLETED">COMPLETED</option>
                        <option value="IN PROGRESS">IN PROGRESS</option>
                      </select>
                    </label>
                    <label>Device
                      <select value={draft.device} onChange={event => updateDraft(levelId, "device", event.target.value)}>
                        {DEVICE_OPTIONS.map(device => <option key={device} value={device}>{device}</option>)}
                      </select>
                    </label>
                    <label>2-player demon: play mode
                      <select value={draft.twoPlayerMode} onChange={event => updateDraft(levelId, "twoPlayerMode", event.target.value)}>
                        <option value="standard">Not a 2-player demon</option>
                        <option value="solo">Solo</option>
                        <option value="two-player">With two players</option>
                      </select>
                    </label>
                    {draft.status === "IN PROGRESS" && (
                      <label>Progress %<input type="number" min="0" max="100" value={draft.progressPercent} onChange={event => updateDraft(levelId, "progressPercent", event.target.value)} /></label>
                    )}
                  </div>
                  {completedIndex >= 0 && (
                    <div className="bulk-edit-placement-row">
                      <label>Move to placement
                        <input
                          type="number"
                          min="1"
                          max={completedIds.length}
                          value={placementTargets[levelId] ?? ""}
                          placeholder={String(completedIndex + 1)}
                          onChange={event => setPlacementTargets(current => ({ ...current, [levelId]: event.target.value }))}
                        />
                      </label>
                      <button className="close-button" type="button" onClick={() => moveToPlacement(levelId)} disabled={!placementTargets[levelId] || saving}>Move</button>
                    </div>
                  )}
                  <button className="close-button bulk-edit-collapse" type="button" onClick={() => toggleDemon(levelId)}>
                    <X size={16} /> Close editor
                  </button>
                </div>
              )}
            </article>
          );
        })}
        {!filteredDemons.length && <p className="request-empty"><strong>No demons found.</strong></p>}
      </div>

      {error && <p className="admin-error bulk-edit-error">{error}</p>}

      <div className="bulk-edit-toolbar">
        <div className="bulk-edit-history-actions">
          <button className="close-button" type="button" onClick={undo} disabled={!undoStack.length || saving}><RotateCcw size={17} /> Undo</button>
          <button className="close-button" type="button" onClick={redo} disabled={!redoStack.length || saving}><RotateCw size={17} /> Redo</button>
        </div>
        <span>{changes.length} changed</span>
        <button className="close-button" type="button" onClick={discardAll} disabled={!changes.length || saving}>Discard all</button>
        <button className="login-button" type="button" onClick={saveAll} disabled={!changes.length || saving}><Save size={17} /> {saving ? "Saving..." : `Save all changes (${changes.length})`}</button>
        <button className="close-button" type="button" onClick={onClose} disabled={saving}>Close</button>
      </div>
    </div>
  );
}
