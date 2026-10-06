import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, RotateCcw, RotateCw, Save, X } from "lucide-react";
import { DEVICE_OPTIONS } from "../deviceUtils.js";
import {
  buildBulkEditChanges,
  createDemonEditDraft,
  validateBulkEditChanges
} from "../bulkEditUtils.js";

export function BulkDemonEditor({ demons, saving, onSave, onClose }) {
  const [search, setSearch] = useState("");
  const [openIds, setOpenIds] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [error, setError] = useState("");

  const originalById = useMemo(
    () => new Map(demons.map(demon => [String(demon.id), createDemonEditDraft(demon)])),
    [demons]
  );
  const filteredDemons = useMemo(() => {
    const query = search.trim().toLowerCase();
    return demons.filter(demon => !query || [demon.name, demon.creator, demon.id]
      .some(value => String(value || "").toLowerCase().includes(query)));
  }, [demons, search]);
  const changes = useMemo(() => buildBulkEditChanges(demons, drafts), [demons, drafts]);
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
    setUndoStack(current => [...current, { levelId, field, before, after: value }]);
    setRedoStack([]);
    setError("");
  }

  function applyHistoryValue(action, value) {
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
    setUndoStack([]);
    setRedoStack([]);
    setError("");
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
        <span>{demons.length} demons</span>
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

          return (
            <article className={`bulk-edit-row${isOpen ? " is-open" : ""}${isDirty ? " is-dirty" : ""}`} key={levelId || demon.name}>
              <button className="bulk-edit-summary" type="button" onClick={() => toggleDemon(levelId)}>
                <img
                  src={`https://levelthumbs.prevter.me/thumbnail/${levelId}`}
                  alt=""
                  onError={event => { event.currentTarget.style.display = "none"; }}
                />
                <span className="bulk-edit-identity">
                  <strong>{demon.name}</strong>
                  <small>{demon.placement || "Unplaced"} · ID: {levelId} · {demon.creator || "Unknown creator"}</small>
                </span>
                <span className="bulk-edit-device">{draft.device || "No device"}</span>
                {isDirty && <span className="bulk-edit-unsaved">Unsaved</span>}
                {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>

              {isOpen && (
                <div className="bulk-edit-fields">
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
