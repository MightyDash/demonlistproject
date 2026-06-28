import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Download,
  FileText,
  Inbox,
  Paintbrush,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2
} from "lucide-react";

const SITE_THEMES = [
  "Basic",
  "Cyber Neon",
  "Dark Ember",
  "Crystal Void",
  "Rusted Machine",
  "Solar Flare",
  "Toxic Core",
  "Dreamscape",
  "Monochrome Legacy",
  "Golden Trophy",
  "Blood Moon"
];

export function AdminPanel({
  onBack,
  onDataChanged,
  siteTheme = "Basic",
  onThemeChanged,
  demons = [],
  requests = [],
  onOpenRequests,
  onSaveNote
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showRemoveForm, setShowRemoveForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showThemeForm, setShowThemeForm] = useState(false);
  const [showRefreshTokenForm, setShowRefreshTokenForm] = useState(false);
  const [showNoteManager, setShowNoteManager] = useState(false);
  const [noteSearch, setNoteSearch] = useState("");
  const [noteDrafts, setNoteDrafts] = useState({});
  const [noteSavingId, setNoteSavingId] = useState("");

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
    status: "COMPLETED",
    progressPercent: ""
  });
  const [editConfirm, setEditConfirm] = useState(false);

  const [adminMessage, setAdminMessage] = useState("");
  const [adminError, setAdminError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [themeDraft, setThemeDraft] = useState(siteTheme);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [refreshListToken, setRefreshListToken] = useState("");
  const [pendingAdminPreview, setPendingAdminPreview] = useState(null);
  const [tierUpdateCheck, setTierUpdateCheck] = useState({
    loading: true,
    error: "",
    data: null
  });

  useEffect(() => {
    handleCheckTierUpdates();
  }, []);

  const noteManagerDemons = useMemo(() => {
    const query = noteSearch.trim().toLowerCase();

    return demons.filter(demon => {
      if (!query) return true;
      return (
        String(demon.name || "").toLowerCase().includes(query) ||
        String(demon.creator || "").toLowerCase().includes(query) ||
        String(demon.id || "").toLowerCase().includes(query)
      );
    });
  }, [demons, noteSearch]);

  function resetOpenTools() {
    setShowAddForm(false);
    setShowRemoveForm(false);
    setShowEditForm(false);
    setShowThemeForm(false);
    setShowRefreshTokenForm(false);
    setShowNoteManager(false);
    setEditFound(null);
    setEditNotFound(false);
    setEditConfirm(false);
    setRemoveConfirm(false);
    setPendingAdminPreview(null);
    setAdminMessage("");
    setAdminError("");
  }

  function showAdminPreview(type, title, details, warning) {
    setAdminMessage("");
    setAdminError("");
    setPendingAdminPreview({ type, title, details, warning });
  }

  function handleConfirmAdminPreview() {
    const type = pendingAdminPreview?.type;
    setPendingAdminPreview(null);

    if (type === "addDemon") return handleAddDemon({ skipPreview: true });
    if (type === "removeDemon") return handleRemoveDemon({ skipPreview: true });
    if (type === "editDemon") return handleEditDemon({ skipPreview: true });
    if (type === "refreshList") return handleRefreshList({ skipPreview: true });
    if (type === "revertRefresh") return handleRevertRefresh({ skipPreview: true });
  }

  function openNoteManager() {
    const drafts = {};
    demons.forEach(demon => {
      drafts[demon.id] = demon.notes || "";
    });

    resetOpenTools();
    setNoteDrafts(drafts);
    setNoteSearch("");
    setShowNoteManager(true);
  }

  async function handleSaveManagedNote(demon) {
    if (!onSaveNote) {
      setAdminError("Note Manager is niet gekoppeld.");
      return;
    }

    setAdminMessage("");
    setAdminError("");
    setNoteSavingId(String(demon.id));

    try {
      const result = await onSaveNote(demon, noteDrafts[demon.id] || "");
      if (!result?.success) {
        setAdminError(result?.message || "Note opslaan mislukt.");
        return;
      }

      setAdminMessage(result.message || `Note voor ${demon.name} opgeslagen.`);
    } finally {
      setNoteSavingId("");
    }
  }

  async function handleBackupExport() {
    setAdminMessage("");
    setAdminError("");

    try {
      let requestBackup = requests;

      try {
        const requestData = await sendAdminRequest({ action: "getRequests" });
        if (requestData.success && Array.isArray(requestData.requests)) {
          requestBackup = requestData.requests;
        }
      } catch {
        // Keep current in-memory requests if the extra fetch is unavailable.
      }

      const backup = {
        exportedAt: new Date().toISOString(),
        siteTheme,
        counts: {
          demons: demons.length,
          requests: requestBackup.length,
          notes: demons.filter(demon => String(demon.notes || "").trim()).length
        },
        demons,
        requests: requestBackup
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json"
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);

      link.href = url;
      link.download = `moiks-demon-list-backup-${date}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      setAdminMessage("Backup export gemaakt.");
    } catch (error) {
      setAdminError(error.message || "Backup export mislukt.");
    }
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
        status: data.demon.status || "COMPLETED",
        progressPercent: data.demon.progressPercent === undefined || data.demon.progressPercent === null
          ? ""
          : String(data.demon.progressPercent)
      });
    } catch (error) {
      setAdminError(error.message || "Kon geen verbinding maken met Apps Script.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEditDemon({ skipPreview = false } = {}) {
    setAdminMessage("");
    setAdminError("");

    const year = Number(editForm.year);
    const attempts = Number(editForm.attempts);
    const progressPercent = Number(editForm.progressPercent);

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
    if (editForm.status !== "COMPLETED" && editForm.status !== "IN PROGRESS") {
      setAdminError("Status moet COMPLETED of IN PROGRESS zijn.");
      return;
    }
    if (editForm.status === "IN PROGRESS" && (!Number.isInteger(progressPercent) || progressPercent < 0 || progressPercent > 100)) {
      setAdminError("Progress moet een percentage tussen 0 en 100 zijn.");
      return;
    }

    if (!skipPreview) {
      showAdminPreview(
        "editDemon",
        `Edit ${editForm.name.trim()}`,
        [
          ["Level ID", editFound.id],
          ["Difficulty", editForm.difficulty.trim()],
          ["Creator(s)", editForm.creator.trim()],
          ["Year", year],
          ["Attempts", attempts],
          ["Status", editForm.status],
          ["Progress", editForm.status === "IN PROGRESS" ? `${progressPercent}%` : "Not in progress"]
        ],
        "This will update the demon row in the spreadsheet."
      );
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
        status: editForm.status,
        progressPercent: editForm.status === "IN PROGRESS" ? progressPercent : ""
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

  async function handleAddDemon({ skipPreview = false } = {}) {
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

    if (!skipPreview) {
      showAdminPreview(
        "addDemon",
        "Add demon",
        [
          ["Level ID", levelId],
          ["Attempts", attempts],
          ["Year", year],
          ["Status", status],
          ["Progress", status === "IN PROGRESS" ? `${progressPercent}%` : "Completed"]
        ],
        "This will fetch the demon and add it to the spreadsheet."
      );
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

  async function handleRemoveDemon({ skipPreview = false } = {}) {
    setAdminMessage("");
    setAdminError("");

    const levelId = String(removeLevelId || "").trim();

    if (!levelId) {
      setAdminError("Level ID is verplicht.");
      return;
    }

    if (!skipPreview) {
      showAdminPreview(
        "removeDemon",
        "Remove demon",
        [["Level ID", levelId]],
        "This cannot be undone from the website. Make sure this is the correct level."
      );
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

  async function handleRefreshList({ skipPreview = false } = {}) {
    setAdminMessage("");
    setAdminError("");

    const cleanRefreshToken = String(refreshListToken || "").trim();
    if (!cleanRefreshToken) {
      setAdminError("Refresh List token is verplicht.");
      return;
    }

    if (!skipPreview) {
      showAdminPreview(
        "refreshList",
        "Refresh list",
        [
          ["Refresh token", "Filled in"],
          ["Tier changes", tierUpdateCheck.data?.tierChanges ?? "Checking required"],
          ["Placement changes", tierUpdateCheck.data?.placementChanges ?? "Checking required"],
          ["Matched IDs", tierUpdateCheck.data?.matched ?? "Checking required"],
          ["Action", "Update existing demons and sort by tier"]
        ],
        "A backup is created before writing. In Progress demons and IDs without a valid tier are left unchanged."
      );
      return;
    }

    setEditFound(null);
    setEditNotFound(false);
    setEditConfirm(false);
    setRemoveConfirm(false);
    setIsSubmitting(true);

    try {
      const data = await sendAdminRequest({
        action: "refreshList",
        refreshToken: cleanRefreshToken
      });

      if (!data.success) {
        setAdminError(data.message || "List refresh mislukt.");
        return;
      }

      setAdminMessage(data.message || "List refreshed.");
      setRefreshListToken("");
      setShowRefreshTokenForm(false);
      if (onDataChanged) onDataChanged();
    } catch (error) {
      setAdminError(error.message || "Kon geen verbinding maken met Apps Script.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCheckTierUpdates() {
    setTierUpdateCheck({ loading: true, error: "", data: null });

    try {
      const data = await sendAdminRequest({ action: "checkTierUpdates" });
      if (!data.success) {
        setTierUpdateCheck({
          loading: false,
          error: data.message || "Updatecontrole mislukt.",
          data: null
        });
        return;
      }

      setTierUpdateCheck({ loading: false, error: "", data });
    } catch (error) {
      setTierUpdateCheck({
        loading: false,
        error: error.message || "Kon tier-updates niet controleren.",
        data: null
      });
    }
  }

  async function handleRevertRefresh({ skipPreview = false } = {}) {
    setAdminMessage("");
    setAdminError("");

    if (!skipPreview) {
      showAdminPreview(
        "revertRefresh",
        "Revert refresh",
        [
          ["Action", "Restore latest pre-refresh backup"],
          ["Applies to", "Refresh List or Update All backups"]
        ],
        "This replaces the current demon rows with the latest refresh backup. Only continue if the latest refresh/update was wrong."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const data = await sendAdminRequest({ action: "revertRefresh" });

      if (!data.success) {
        setAdminError(data.message || "Refresh terugzetten mislukt.");
        return;
      }

      setAdminMessage(data.message || "Refresh teruggezet.");
      if (onDataChanged) onDataChanged();
    } catch (error) {
      setAdminError(error.message || "Kon geen verbinding maken met Apps Script.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSaveTheme() {
    setAdminMessage("");
    setAdminError("");
    setIsSubmitting(true);

    try {
      const data = await sendAdminRequest({
        action: "setSiteTheme",
        theme: themeDraft
      });

      if (!data.success) {
        setAdminError(data.message || "Theme wijzigen mislukt.");
        return;
      }

      setAdminMessage(data.message || "Theme updated.");
      if (onThemeChanged) onThemeChanged(data.theme || themeDraft);
      setThemeMenuOpen(false);
      setShowThemeForm(false);
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
          <p className="eyebrow">Moik's Geometry Dash Demon Archive</p>
          <h2>Admin Panel</h2>
          <p>Manage your demon list tools and admin actions.</p>
        </div>

        <button className="admin-button" onClick={onBack} type="button">
          Back to list
        </button>
      </div>

      {adminMessage && <p className="admin-success">{adminMessage}</p>}
      {adminError && <p className="admin-error">{adminError}</p>}
      {pendingAdminPreview && (
        <section className="admin-preview-card">
          <div>
            <p className="admin-preview-eyebrow">Preview mode</p>
            <h3>{pendingAdminPreview.title}</h3>
            <p>{pendingAdminPreview.warning}</p>
          </div>

          <dl>
            {pendingAdminPreview.details.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>

          <div className="admin-preview-actions">
            <button
              className="login-button"
              onClick={handleConfirmAdminPreview}
              disabled={isSubmitting}
              type="button"
            >
              {isSubmitting ? "Running..." : "Confirm action"}
            </button>
            <button
              className="close-button"
              onClick={() => setPendingAdminPreview(null)}
              type="button"
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      <div className="admin-panel-grid">
        <button
          className="admin-action-card"
          type="button"
          onClick={() => {
            setShowAddForm(open => !open);
            setShowRemoveForm(false);
            setShowEditForm(false);
            setShowThemeForm(false);
            setShowRefreshTokenForm(false);
            setShowNoteManager(false);
            setEditFound(null);
            setEditNotFound(false);
            setEditConfirm(false);
            setRemoveConfirm(false);
            setAdminMessage("");
            setAdminError("");
          }}
        >
          <span className="admin-action-icon add"><Plus size={28} /></span>
          <strong>Add Demon</strong>
          <span>Nieuwe demon toevoegen aan je sheet.</span>
          <ArrowRight className="admin-action-arrow" size={22} />
        </button>

        <button
          className="admin-action-card"
          type="button"
          onClick={() => {
            setShowRemoveForm(open => !open);
            setShowAddForm(false);
            setShowEditForm(false);
            setShowThemeForm(false);
            setShowRefreshTokenForm(false);
            setShowNoteManager(false);
            setEditFound(null);
            setEditNotFound(false);
            setEditConfirm(false);
            setRemoveConfirm(false);
            setAdminMessage("");
            setAdminError("");
          }}
        >
          <span className="admin-action-icon remove"><Trash2 size={24} /></span>
          <strong>Remove Demon</strong>
          <span>Demon verwijderen via Level ID.</span>
          <ArrowRight className="admin-action-arrow" size={22} />
        </button>

        <button
          className="admin-action-card"
          type="button"
          onClick={() => {
            setShowEditForm(open => !open);
            setShowAddForm(false);
            setShowRemoveForm(false);
            setShowThemeForm(false);
            setShowRefreshTokenForm(false);
            setShowNoteManager(false);
            setEditFound(null);
            setEditNotFound(false);
            setEditConfirm(false);
            setRemoveConfirm(false);
            setAdminMessage("");
            setAdminError("");
          }}
        >
          <span className="admin-action-icon edit"><Pencil size={24} /></span>
          <strong>Edit Demon</strong>
          <span>Naam, difficulty, makers en meer aanpassen.</span>
          <ArrowRight className="admin-action-arrow" size={22} />
        </button>

        <button
          className="admin-action-card"
          type="button"
          onClick={() => {
            setShowThemeForm(open => !open);
            setThemeMenuOpen(false);
            setThemeDraft(siteTheme);
            setShowAddForm(false);
            setShowRemoveForm(false);
            setShowEditForm(false);
            setShowRefreshTokenForm(false);
            setShowNoteManager(false);
            setEditFound(null);
            setEditNotFound(false);
            setEditConfirm(false);
            setRemoveConfirm(false);
            setAdminMessage("");
            setAdminError("");
          }}
        >
          <span className="admin-action-icon theme"><Paintbrush size={24} /></span>
          <strong>Site Theme</strong>
          <span>Stel het thema voor alle bezoekers in.</span>
          <ArrowRight className="admin-action-arrow" size={22} />
        </button>

        <button
          className="admin-action-card"
          type="button"
          onClick={() => {
            setShowRefreshTokenForm(open => !open);
            setShowAddForm(false);
            setShowRemoveForm(false);
            setShowEditForm(false);
            setShowThemeForm(false);
            setShowNoteManager(false);
            setEditFound(null);
            setEditNotFound(false);
            setEditConfirm(false);
            setRemoveConfirm(false);
            setAdminMessage("");
            setAdminError("");
          }}
          disabled={isSubmitting}
        >
          <span className="admin-action-icon refresh"><RefreshCw size={24} /></span>
          <strong>{isSubmitting ? "Refreshing..." : "Refresh List"}</strong>
          <span>
            {tierUpdateCheck.loading
              ? "Checking the GDDL tier spreadsheet..."
              : tierUpdateCheck.error
                ? "Update check unavailable. Open to retry."
                : tierUpdateCheck.data?.available
                  ? `${tierUpdateCheck.data.tierChanges} tier and ${tierUpdateCheck.data.placementChanges} placement changes available.`
                  : "Your list matches the latest tier spreadsheet."}
          </span>
          <ArrowRight className="admin-action-arrow" size={22} />
        </button>

        <button
          className="admin-action-card"
          type="button"
          onClick={() => handleRevertRefresh()}
          disabled={isSubmitting}
        >
          <span className="admin-action-icon revert"><RotateCcw size={24} /></span>
          <strong>Revert Refresh</strong>
          <span>Zet de laatste Refresh List of Update All backup terug.</span>
          <ArrowRight className="admin-action-arrow" size={22} />
        </button>

        <button
          className="admin-action-card"
          type="button"
          onClick={openNoteManager}
        >
          <span className="admin-action-icon notes"><FileText size={24} /></span>
          <strong>Note Manager</strong>
          <span>Alle demon notes snel bekijken en bewerken.</span>
          <ArrowRight className="admin-action-arrow" size={22} />
        </button>

        <button
          className="admin-action-card"
          type="button"
          onClick={handleBackupExport}
          disabled={isSubmitting}
        >
          <span className="admin-action-icon backup"><Download size={24} /></span>
          <strong>Backup Export</strong>
          <span>Download demons, notes, requests en settings als JSON.</span>
          <ArrowRight className="admin-action-arrow" size={22} />
        </button>

        <button
          className="admin-action-card"
          type="button"
          onClick={onOpenRequests}
        >
          <span className="admin-action-icon requests"><Inbox size={24} /></span>
          <strong>Demon Requests</strong>
          <span>Ga direct naar de request pagina.</span>
          <ArrowRight className="admin-action-arrow" size={22} />
        </button>
      </div>

      {showNoteManager && (
        <div className="admin-form note-manager-form">
          <div className="note-manager-header">
            <div>
              <h3>Note Manager</h3>
              <p className="admin-form-note">
                Bewerk je persoonlijke demon notes zonder elke demonkaart los te openen.
              </p>
            </div>
            <span>{noteManagerDemons.length} demons</span>
          </div>

          <label>
            Search
            <input
              value={noteSearch}
              onChange={event => setNoteSearch(event.target.value)}
              placeholder="Search demon, creator or ID..."
            />
          </label>

          <div className="note-manager-list">
            {noteManagerDemons.map(demon => (
              <article className="note-manager-row" key={demon.id || demon.name}>
                <div className="note-manager-demon">
                  <img
                    src={`https://levelthumbs.prevter.me/thumbnail/${demon.id}`}
                    alt={demon.name}
                    onError={event => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                  <div>
                    <strong>{demon.name}</strong>
                    <span>{demon.placement || "Unplaced"} · ID: {demon.id}</span>
                  </div>
                </div>

                <textarea
                  value={noteDrafts[demon.id] ?? demon.notes ?? ""}
                  onChange={event =>
                    setNoteDrafts(previous => ({
                      ...previous,
                      [demon.id]: event.target.value
                    }))
                  }
                  placeholder="Write a note for this demon..."
                  rows={4}
                />

                <button
                  className="login-button note-manager-save"
                  onClick={() => handleSaveManagedNote(demon)}
                  disabled={noteSavingId === String(demon.id)}
                  type="button"
                >
                  {noteSavingId === String(demon.id) ? "Saving..." : "Save"}
                </button>
              </article>
            ))}

            {noteManagerDemons.length === 0 && (
              <p className="request-empty">
                <strong>No demons found.</strong>
                <span>Try a different search.</span>
              </p>
            )}
          </div>

          <div className="admin-form-actions">
            <button
              className="close-button"
              onClick={() => setShowNoteManager(false)}
              type="button"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showRefreshTokenForm && (
        <div className="admin-form danger-form refresh-token-form">
          <h3>Refresh List</h3>
          <p className="admin-form-note">
            Only IDs already in your list are matched against the GDDL tier spreadsheet. A backup is made before tiers, placements and history are updated.
          </p>

          <div className="tier-update-summary">
            {tierUpdateCheck.loading && <span>Checking for tier updates...</span>}
            {tierUpdateCheck.error && <span className="admin-error">{tierUpdateCheck.error}</span>}
            {tierUpdateCheck.data && (
              <>
                <strong>
                  {tierUpdateCheck.data.available
                    ? "List update available"
                    : "List is up to date"}
                </strong>
                <span>
                  {tierUpdateCheck.data.matched} IDs matched, {tierUpdateCheck.data.tierChanges} tier changes and{" "}
                  {tierUpdateCheck.data.placementChanges} placement changes.
                </span>
                {tierUpdateCheck.data.skipped > 0 && (
                  <span>{tierUpdateCheck.data.skipped} demons keep their existing tier.</span>
                )}
              </>
            )}
            <button
              className="close-button"
              onClick={handleCheckTierUpdates}
              disabled={tierUpdateCheck.loading || isSubmitting}
              type="button"
            >
              <RefreshCw size={16} />
              Check again
            </button>
          </div>

          <label>
            Refresh token
            <input
              type="password"
              value={refreshListToken}
              onChange={event => setRefreshListToken(event.target.value)}
              placeholder="Refresh List token"
              autoComplete="off"
            />
          </label>

          <div className="admin-form-actions">
            <button
              className="logout-confirm-button"
              onClick={handleRefreshList}
              disabled={isSubmitting}
              type="button"
            >
              {isSubmitting ? "Refreshing..." : "Run Refresh List"}
            </button>

            <button
              className="close-button"
              onClick={() => {
                setShowRefreshTokenForm(false);
                setRefreshListToken("");
                setAdminError("");
              }}
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showThemeForm && (
        <div className="admin-form">
          <h3>Site Theme</h3>

          <label>
            Theme
            <div className="theme-picker">
              <button
                className="theme-picker-button"
                type="button"
                onClick={() => setThemeMenuOpen(open => !open)}
                aria-haspopup="listbox"
                aria-expanded={themeMenuOpen}
              >
                <span>{themeDraft}</span>
                <span className="theme-picker-chevron">v</span>
              </button>

              {themeMenuOpen && (
                <div className="theme-picker-menu" role="listbox" aria-label="Site theme">
                  {SITE_THEMES.map(theme => (
                    <button
                      className={`theme-picker-option ${themeDraft === theme ? "active" : ""}`}
                      key={theme}
                      type="button"
                      role="option"
                      aria-selected={themeDraft === theme}
                      onClick={() => {
                        setThemeDraft(theme);
                        setThemeMenuOpen(false);
                      }}
                    >
                      <span>{theme}</span>
                      {themeDraft === theme && <strong>Selected</strong>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </label>

          <div className="admin-form-actions">
            <button
              className="login-button"
              onClick={handleSaveTheme}
              disabled={isSubmitting}
              type="button"
            >
              {isSubmitting ? "Saving..." : "Save Theme"}
            </button>

            <button
              className="close-button"
              onClick={() => {
                setThemeMenuOpen(false);
                setShowThemeForm(false);
              }}
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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

                <label>
                  Status
                  <select
                    value={editForm.status}
                    onChange={e =>
                      setEditForm({
                        ...editForm,
                        status: e.target.value,
                        progressPercent: e.target.value === "IN PROGRESS" ? editForm.progressPercent : ""
                      })
                    }
                  >
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="IN PROGRESS">IN PROGRESS</option>
                  </select>
                </label>

                {editForm.status === "IN PROGRESS" && (
                  <label>
                    Progress %
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editForm.progressPercent}
                      onChange={e => setEditForm({ ...editForm, progressPercent: e.target.value })}
                      placeholder="Bijv. 67"
                    />
                  </label>
                )}

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
