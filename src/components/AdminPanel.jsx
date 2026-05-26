import React, { useState } from "react";

const SKILLSET_CATALOG = [
  ["Cube", "This level has cube sections that make up a large portion of its difficulty."],
  ["Ship", "This level has ship sections that make up a large portion of its difficulty."],
  ["Ball", "This level has ball sections that make up a large portion of its difficulty."],
  ["UFO", "This level has UFO sections that make up a large portion of its difficulty."],
  ["Wave", "This level has wave sections that make up a large portion of its difficulty."],
  ["Robot", "This level has robot sections that make up a large portion of its difficulty."],
  ["Spider", "This level has spider sections that make up a large portion of its difficulty."],
  ["Nerve Control", "This level tests your consistency and ability to handle stress near the end of the level."],
  ["Gimmicky", "This level primarily focuses on developing an experimental, unorthodox gameplay type."],
  ["Memory", "This level requires remembering a complex path to complete, usually with several fakes, potential routes, and/or visual obscurity."],
  ["Learny", "This level needs a significant time investment in order to understand its complex/unintuitive gameplay."],
  ["Duals", "This level has duals that make up a large portion of its difficulty. Generally refers to asymmetrical duals."],
  ["Fast-Paced", "This level has fast-moving sections (3x or 4x speed) for the majority of the level."],
  ["Chokepoints", "This level contains parts with very condensed difficulty in relation to the rest of the level."],
  ["High CPS", "This level has several sections that require very fast (usually controlled) inputs."],
  ["Timings", "This level tests your ability to perform many very precise inputs."],
  ["Overall", "This level has no specific skillset it tests, instead drawing on multiple skillsets in smaller proportion for its difficulty."],
  ["Slow-Paced", "This level has slower-moving sections (0.5x) for a large part of the level."],
  ["Swing", "This level has swing copter sections that make up a large portion of its difficulty."],
  ["Flow", "This level has many dynamic gameplay transitions throughout the level, forming a smooth and flowy type of gameplay."]
].map(([name, description]) => ({ name, description }));

const SKILLSET_NAMES = SKILLSET_CATALOG.map(skillset => skillset.name);

function parseSkillsets(value) {
  return String(value || "")
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);
}

export function AdminPanel({ onBack, onDataChanged }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showRemoveForm, setShowRemoveForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);

  const [addForm, setAddForm] = useState({
    levelId: "",
    attempts: "",
    year: new Date().getFullYear(),
    status: "COMPLETED",
    progressPercent: ""
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
  const [draggingSkillset, setDraggingSkillset] = useState("");

  const [adminMessage, setAdminMessage] = useState("");
  const [adminError, setAdminError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function selectedSkillsets() {
    return parseSkillsets(editForm.skillsets);
  }

  function setSelectedSkillsets(skillsets) {
    const cleanSkillsets = skillsets.filter((skillset, index) =>
      skillset && skillsets.indexOf(skillset) === index
    );

    setEditForm({
      ...editForm,
      skillsets: cleanSkillsets.join(", ")
    });
  }

  function addSkillset(skillset) {
    if (!SKILLSET_NAMES.includes(skillset)) return;
    const current = selectedSkillsets();
    if (current.includes(skillset)) return;
    setSelectedSkillsets([...current, skillset]);
  }

  function removeSkillset(skillset) {
    setSelectedSkillsets(selectedSkillsets().filter(item => item !== skillset));
  }

  function toggleSkillset(skillset) {
    const current = selectedSkillsets();
    if (current.includes(skillset)) {
      removeSkillset(skillset);
    } else {
      addSkillset(skillset);
    }
  }

  function createSkillsetDragImage(skillset) {
    const dragImage = document.createElement("div");
    dragImage.textContent = skillset;
    dragImage.className = "skillset-drag-preview";
    document.body.appendChild(dragImage);

    window.setTimeout(() => {
      dragImage.remove();
    }, 0);

    return dragImage;
  }

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
    const progressPercent = Number(addForm.progressPercent);

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

    if (status === "IN PROGRESS" && (!Number.isInteger(progressPercent) || progressPercent < 0 || progressPercent > 100)) {
      setAdminError("Progress moet een percentage tussen 0 en 100 zijn.");
      return;
    }

    setIsSubmitting(true);

    try {
      const data = await sendAdminRequest({
        action: "addDemon",
        levelId,
        attempts,
        year,
        status,
        progressPercent: status === "IN PROGRESS" ? progressPercent : ""
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
        status: "COMPLETED",
        progressPercent: ""
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
              onChange={e => setAddForm({
                ...addForm,
                status: e.target.value,
                progressPercent: e.target.value === "IN PROGRESS" ? addForm.progressPercent : ""
              })}
            >
              <option value="COMPLETED">COMPLETED</option>
              <option value="IN PROGRESS">IN PROGRESS</option>
            </select>
          </label>

          {addForm.status === "IN PROGRESS" && (
            <label>
              Progress %
              <input
                type="number"
                min="0"
                max="100"
                value={addForm.progressPercent}
                onChange={e => setAddForm({ ...addForm, progressPercent: e.target.value })}
                placeholder="Bijv. 72"
              />
            </label>
          )}

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

              {(() => {
                const currentSkillsets = selectedSkillsets();
                const availableSkillsets = SKILLSET_CATALOG.filter(
                  skillset => !currentSkillsets.includes(skillset.name)
                );

                return (
                  <div className="skillset-picker">
                    <div className="skillset-picker-header">
                      <div>
                        <span>Skillsets</span>
                        <strong>Drag skillsets to this demon</strong>
                      </div>
                      <small>{currentSkillsets.length} selected</small>
                    </div>

                    <div className="skillset-drag-layout">
                      <div className="skillset-bank">
                        <span className="skillset-picker-label">Available</span>
                        <div className="skillset-chip-grid">
                          {availableSkillsets.map(skillset => (
                            <button
                              className="skillset-choice"
                              key={skillset.name}
                              type="button"
                              draggable
                              onClick={() => addSkillset(skillset.name)}
                              onDragStart={event => {
                                event.dataTransfer.setData("text/plain", skillset.name);
                                event.dataTransfer.effectAllowed = "copy";
                                event.dataTransfer.setDragImage(
                                  createSkillsetDragImage(skillset.name),
                                  12,
                                  12
                                );
                                setDraggingSkillset(skillset.name);
                              }}
                              onDragEnd={() => {
                                setDraggingSkillset("");
                              }}
                            >
                              {skillset.name}
                              <span className="skillset-tooltip">{skillset.description}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div
                        className={`skillset-drop-zone ${draggingSkillset ? "dragging" : ""}`}
                        onDragOver={event => {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "copy";
                        }}
                        onDragEnter={event => {
                          event.preventDefault();
                        }}
                        onDrop={event => {
                          event.preventDefault();
                          addSkillset(event.dataTransfer.getData("text/plain"));
                          setDraggingSkillset("");
                        }}
                      >
                        <span className="skillset-picker-label">Selected for {editFound.name}</span>
                        {currentSkillsets.length > 0 ? (
                          <div className="skillset-selected-list">
                            {currentSkillsets.map(skillset => (
                              <button
                                className="skillset-selected-chip"
                                key={skillset}
                                type="button"
                                onClick={() => removeSkillset(skillset)}
                              >
                                {skillset}
                                <span>Remove</span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p>Drop skillsets here or click available skillsets to add them.</p>
                        )}
                      </div>
                    </div>

                    <div className="skillset-mobile-checks">
                      {SKILLSET_CATALOG.map(skillset => (
                        <label key={skillset.name}>
                          <input
                            type="checkbox"
                            checked={currentSkillsets.includes(skillset.name)}
                            onChange={() => toggleSkillset(skillset.name)}
                          />
                          <span>
                            <strong>{skillset.name}</strong>
                            <small>{skillset.description}</small>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })()}

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

                <label className="edit-field-full skillset-hidden-field">
                  Skillsets
                  <input value={editForm.skillsets} readOnly />
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

