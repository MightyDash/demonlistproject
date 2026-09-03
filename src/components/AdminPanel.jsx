import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Download,
  FileText,
  GripVertical,
  Inbox,
  Layers3,
  Link,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
  X
} from "lucide-react";
import { requestJson } from "../api.js";
import { ADMIN_API_URL } from "../config.js";
import { comparePlacements, isInProgressDemon, parseDemonDate } from "../demonUtils.js";

const TIMELINE_YEARS = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
const TIMELINE_MONTHS = [
  { name: "January", slug: "january" },
  { name: "February", slug: "february" },
  { name: "March", slug: "march" },
  { name: "April", slug: "april" },
  { name: "May", slug: "may" },
  { name: "June", slug: "june" },
  { name: "July", slug: "july" },
  { name: "August", slug: "august" },
  { name: "September", slug: "september" },
  { name: "October", slug: "october" },
  { name: "November", slug: "november" },
  { name: "December", slug: "december" }
];

function normalizeDateInput(value) {
  const text = String(value || "").trim();
  if (/^\d{4}$/.test(text)) return { valid: true, value: text };

  const match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/);
  if (!match) return { valid: false, value: text };

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
  const date = new Date(year, month - 1, day);
  const valid =
    year >= 1900 &&
    year <= 2100 &&
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;

  return {
    valid,
    value: valid
      ? `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`
      : text
  };
}

function isValidYouTubeUrl(value) {
  const text = String(value || "").trim();
  if (!text) return true;
  return /^https:\/\/(www\.)?(youtube\.com\/watch\?v=|youtube\.com\/shorts\/|youtu\.be\/)[A-Za-z0-9_-]{6,}/i.test(text);
}

function getMonthlyRecapUrl(monthlyRecaps, year, monthSlug) {
  const recap = monthlyRecaps.find(item =>
    Number(item.year) === Number(year) &&
    String(item.month || "").trim().toLowerCase() === String(monthSlug || "").trim().toLowerCase()
  );

  return recap ? String(recap.url || "").trim() : "";
}

function buildAdminTimelineCounts(demons, timelineEntries) {
  const counts = TIMELINE_YEARS.reduce((acc, year) => {
    acc[year] = TIMELINE_MONTHS.reduce((monthAcc, month) => {
      monthAcc[month.slug] = 0;
      return monthAcc;
    }, {});
    return acc;
  }, {});
  const counted = new Set();

  demons
    .filter(demon => !isInProgressDemon(demon))
    .forEach(demon => {
      const parsed = parseDemonDate(demon?.date);
      if (!parsed || parsed.yearOnly || !parsed.month || !TIMELINE_YEARS.includes(parsed.year)) return;

      const month = TIMELINE_MONTHS[parsed.month - 1];
      if (!month) return;

      const key = `${parsed.year}-${month.slug}-${demon.id || demon.name}`;
      counted.add(key);
      counts[parsed.year][month.slug] += 1;
    });

  timelineEntries.forEach(entry => {
    const year = Number(entry.year || 0);
    const month = String(entry.month || "").trim().toLowerCase();
    const levelId = String(entry.levelId || "").trim();
    const key = `${year}-${month}-${levelId}`;

    if (!TIMELINE_YEARS.includes(year) || counts[year]?.[month] === undefined || !levelId || counted.has(key)) return;

    counted.add(key);
    counts[year][month] += 1;
  });

  return counts;
}

function buildBetaListDraft(demons, betaListOrder) {
  const completedDemons = demons
    .filter(demon => !isInProgressDemon(demon))
    .slice()
    .sort((a, b) => comparePlacements(a.placement, b.placement));
  const demonById = new Map(completedDemons.map(demon => [String(demon.id), demon]));
  const ordered = [];
  const usedIds = new Set();

  betaListOrder.forEach(id => {
    const key = String(id);
    const demon = demonById.get(key);
    if (!demon || usedIds.has(key)) return;
    usedIds.add(key);
    ordered.push(demon);
  });

  completedDemons.forEach(demon => {
    const key = String(demon.id);
    if (usedIds.has(key)) return;
    usedIds.add(key);
    ordered.push(demon);
  });

  return ordered;
}

export function AdminPanel({
  onBack,
  onDataChanged,
  demons = [],
  timelineEntries = [],
  monthlyRecaps = [],
  requests = [],
  onOpenRequests,
  onSaveNote,
  onSaveMonthlyRecap,
  onSaveBetaListOrder,
  betaListOrder = []
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showRemoveForm, setShowRemoveForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showRefreshTokenForm, setShowRefreshTokenForm] = useState(false);
  const [showNoteManager, setShowNoteManager] = useState(false);
  const [showTimelineManager, setShowTimelineManager] = useState(false);
  const [showBetaListEditor, setShowBetaListEditor] = useState(false);
  const [noteSearch, setNoteSearch] = useState("");
  const [noteDrafts, setNoteDrafts] = useState({});
  const [noteSavingId, setNoteSavingId] = useState("");
  const [betaListDraft, setBetaListDraft] = useState([]);
  const [betaListSearch, setBetaListSearch] = useState("");
  const [betaListSaving, setBetaListSaving] = useState(false);
  const [draggedBetaId, setDraggedBetaId] = useState("");
  const [timelineManagerYear, setTimelineManagerYear] = useState(2026);
  const [recapPopoverMonth, setRecapPopoverMonth] = useState("");
  const [recapUrlDraft, setRecapUrlDraft] = useState("");
  const [recapSaving, setRecapSaving] = useState(false);

  const [addForm, setAddForm] = useState({
    levelId: "",
    attempts: "",
    date: String(new Date().getFullYear()),
    status: "COMPLETED",
    progressPercent: ""
  });

  const [removeLevelId, setRemoveLevelId] = useState("");

  const [editSearch, setEditSearch] = useState("");
  const [editFound, setEditFound] = useState(null);
  const [editNotFound, setEditNotFound] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    difficulty: "",
    creator: "",
    date: "",
    attempts: "",
    status: "COMPLETED",
    progressPercent: ""
  });

  const [adminMessage, setAdminMessage] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminToast, setAdminToast] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  useEffect(() => {
    if (!adminToast) return;

    const timeoutId = window.setTimeout(() => {
      setAdminToast(null);
    }, 9000);

    return () => window.clearTimeout(timeoutId);
  }, [adminToast]);

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

  const filteredBetaListDraft = useMemo(() => {
    const query = betaListSearch.trim().toLowerCase();

    if (!query) return betaListDraft;

    return betaListDraft.filter(demon => {
      return (
        String(demon.name || "").toLowerCase().includes(query) ||
        String(demon.creator || "").toLowerCase().includes(query) ||
        String(demon.id || "").toLowerCase().includes(query)
      );
    });
  }, [betaListDraft, betaListSearch]);

  const timelineCounts = useMemo(
    () => buildAdminTimelineCounts(demons, timelineEntries),
    [demons, timelineEntries]
  );

  function resetOpenTools() {
    setShowAddForm(false);
    setShowRemoveForm(false);
    setShowEditForm(false);
    setShowRefreshTokenForm(false);
    setShowNoteManager(false);
    setShowTimelineManager(false);
    setShowBetaListEditor(false);
    setEditFound(null);
    setEditNotFound(false);
    setRecapPopoverMonth("");
    setRecapUrlDraft("");
    setBetaListSearch("");
    setDraggedBetaId("");
    setPendingAdminPreview(null);
    setAdminMessage("");
    setAdminError("");
    setAdminToast(null);
  }

  function showAdminPreview(type, title, details, warning) {
    setAdminMessage("");
    setAdminError("");
    setPendingAdminPreview({ type, title, details, warning });
  }

  function showAdminToast(message) {
    setAdminToast({ message });
  }

  function handleConfirmAdminPreview() {
    const type = pendingAdminPreview?.type;
    setPendingAdminPreview(null);

    if (type === "refreshList") return handleRefreshList({ skipPreview: true });
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
      setAdminError("Note Manager is not connected.");
      return;
    }

    setAdminMessage("");
    setAdminError("");
    setNoteSavingId(String(demon.id));

    try {
      const result = await onSaveNote(demon, noteDrafts[demon.id] || "");
      if (!result?.success) {
        setAdminError(result?.message || "Could not save the note.");
        return;
      }

      setAdminMessage(result.message || `Note for ${demon.name} saved.`);
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
        requestBackup = requests;
      }

      const backup = {
        exportedAt: new Date().toISOString(),
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

      setAdminMessage("Backup export created.");
    } catch (error) {
      setAdminError(error.message || "Backup export failed.");
    }
  }

  async function handleSearchEdit() {
    setAdminMessage("");
    setAdminError("");
    setEditFound(null);
    setEditNotFound(false);

    const q = editSearch.trim();
    if (!q) {
      setAdminError("Enter a Level ID or name.");
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
        date: String(data.demon.date || data.demon.year || ""),
        attempts: String(data.demon.attempts || ""),
        status: data.demon.status || "COMPLETED",
        progressPercent: data.demon.progressPercent === undefined || data.demon.progressPercent === null
          ? ""
          : String(data.demon.progressPercent)
      });
    } catch (error) {
      setAdminError(error.message || "Could not connect to Apps Script.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEditDemon() {
    setAdminMessage("");
    setAdminError("");
    setAdminToast(null);

    const dateInput = normalizeDateInput(editForm.date);
    const attempts = Number(editForm.attempts);
    const progressPercent = Number(editForm.progressPercent);

    if (!editForm.name.trim()) {
      setAdminError("Name is required.");
      return;
    }
    if (!dateInput.valid) {
      setAdminError("Date must be a four-digit year or dd/mm/yyyy.");
      return;
    }
    if (!Number.isInteger(attempts) || attempts < 0) {
      setAdminError("Attempts must be a valid number.");
      return;
    }
    if (editForm.status !== "COMPLETED" && editForm.status !== "IN PROGRESS") {
      setAdminError("Status must be COMPLETED or IN PROGRESS.");
      return;
    }
    if (editForm.status === "IN PROGRESS" && (!Number.isInteger(progressPercent) || progressPercent < 0 || progressPercent > 100)) {
      setAdminError("Progress must be a percentage between 0 and 100.");
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
        date: dateInput.value,
        attempts,
        status: editForm.status,
        progressPercent: editForm.status === "IN PROGRESS" ? progressPercent : ""
      });

      if (!data.success) {
        setAdminError(data.message || "Could not edit the demon.");
        return;
      }

      showAdminToast(`${editForm.name.trim()} has been edited.`);
      setEditFound(null);
      setEditSearch("");
      setShowEditForm(false);
      if (onDataChanged) onDataChanged();
    } catch (error) {
      setAdminError(error.message || "Could not connect to Apps Script.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function sendAdminRequest(payload) {
    const adminUrl = ADMIN_API_URL;
    const token = localStorage.getItem("admin_token");

    if (!adminUrl) {
      throw new Error("Admin URL is missing.");
    }

    if (!token) {
      throw new Error("You are not logged in.");
    }

    return requestJson(adminUrl, {
      method: "POST",
      body: JSON.stringify({
        ...payload,
        token
      })
    });
  }

  function openTimelineManager() {
    resetOpenTools();
    setTimelineManagerYear(2026);
    setShowTimelineManager(true);
  }

  function openBetaListEditor() {
    resetOpenTools();
    setBetaListDraft(buildBetaListDraft(demons, betaListOrder));
    setBetaListSearch("");
    setShowBetaListEditor(true);
  }

  function moveBetaDemon(fromIndex, toIndex) {
    setBetaListDraft(previous => {
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= previous.length || toIndex >= previous.length) {
        return previous;
      }

      const next = previous.slice();
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
  }

  function handleBetaDrop(targetId) {
    const fromIndex = betaListDraft.findIndex(demon => String(demon.id) === String(draggedBetaId));
    const toIndex = betaListDraft.findIndex(demon => String(demon.id) === String(targetId));
    setDraggedBetaId("");
    moveBetaDemon(fromIndex, toIndex);
  }

  async function handleSaveBetaList() {
    if (!onSaveBetaListOrder) {
      setAdminError("Beta List editor is not connected.");
      return;
    }

    setAdminMessage("");
    setAdminError("");
    setBetaListSaving(true);

    try {
      const result = await onSaveBetaListOrder(betaListDraft.map(demon => String(demon.id)));
      if (!result?.success) {
        setAdminError(result?.message || "Could not save the Beta List.");
        return;
      }

      setAdminMessage(result.message || "Beta List saved.");
      if (onDataChanged) onDataChanged();
    } finally {
      setBetaListSaving(false);
    }
  }

  function openRecapPopover(monthSlug) {
    setAdminMessage("");
    setAdminError("");
    setRecapPopoverMonth(monthSlug);
    setRecapUrlDraft(getMonthlyRecapUrl(monthlyRecaps, timelineManagerYear, monthSlug));
  }

  async function handleSaveMonthlyRecap(urlOverride) {
    if (!onSaveMonthlyRecap || !recapPopoverMonth) {
      setAdminError("Timeline Manager is not connected.");
      return;
    }

    const url = urlOverride !== undefined ? urlOverride : recapUrlDraft.trim();

    if (!isValidYouTubeUrl(url)) {
      setAdminError("Add a valid YouTube URL.");
      return;
    }

    setAdminMessage("");
    setAdminError("");
    setRecapSaving(true);

    try {
      const result = await onSaveMonthlyRecap({
        year: timelineManagerYear,
        month: recapPopoverMonth,
        url
      });

      if (!result?.success) {
        setAdminError(result?.message || "Could not save the recap video.");
        return;
      }

      setAdminMessage(result.message || "Recap video saved.");
      setRecapPopoverMonth("");
      setRecapUrlDraft("");
    } finally {
      setRecapSaving(false);
    }
  }

  async function handleAddDemon() {
    setAdminMessage("");
    setAdminError("");
    setAdminToast(null);

    const levelId = String(addForm.levelId || "").trim();
    const attempts = Number(addForm.attempts);
    const dateInput = normalizeDateInput(addForm.date);
    const status = String(addForm.status || "COMPLETED").trim().toUpperCase();
    const progressPercent = Number(addForm.progressPercent);

    if (!levelId) {
      setAdminError("Level ID is required.");
      return;
    }

    if (!Number.isInteger(attempts) || attempts < 0) {
      setAdminError("Attempts must be a valid number.");
      return;
    }

    if (!dateInput.valid) {
      setAdminError("Date must be a four-digit year or dd/mm/yyyy.");
      return;
    }

    if (status === "IN PROGRESS" && (!Number.isInteger(progressPercent) || progressPercent < 0 || progressPercent > 100)) {
      setAdminError("Progress must be a percentage between 0 and 100.");
      return;
    }

    setIsSubmitting(true);

    try {
      const data = await sendAdminRequest({
        action: "addDemon",
        levelId,
        attempts,
        date: dateInput.value,
        status,
        progressPercent: status === "IN PROGRESS" ? progressPercent : ""
      });

      if (!data.success) {
        setAdminError(data.message || "Could not add the demon.");
        return;
      }

      const addedDemon = data.demon || {};
      const demonName = addedDemon.name || `Level ${levelId}`;
      const placement = addedDemon.placement || "";
      const lowerPlacementDemon = addedDemon.below || "nothing";
      const higherPlacementDemon = addedDemon.above || "nothing";

      showAdminToast(
        placement
          ? `${demonName} has been placed at ${placement}, above ${lowerPlacementDemon} and below ${higherPlacementDemon}.`
          : `${demonName} has been placed in In Progress.`
      );
      setAddForm({
        levelId: "",
        attempts: "",
        date: String(new Date().getFullYear()),
        status: "COMPLETED",
        progressPercent: ""
      });
      setShowAddForm(false);

      if (onDataChanged) onDataChanged();
    } catch (error) {
      setAdminError(error.message || "Could not connect to Apps Script.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemoveDemon() {
    setAdminMessage("");
    setAdminError("");
    setAdminToast(null);

    const levelId = String(removeLevelId || "").trim();

    if (!levelId) {
      setAdminError("Level ID is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const data = await sendAdminRequest({
        action: "removeDemon",
        levelId
      });

      if (!data.success) {
        setAdminError(data.message || "Could not remove the demon.");
        return;
      }

      const removedName = data.removed?.name || `Level ${levelId}`;
      showAdminToast(`${removedName} has been removed.`);
      setRemoveLevelId("");
      setShowRemoveForm(false);

      if (onDataChanged) onDataChanged();
    } catch (error) {
      setAdminError(error.message || "Could not connect to Apps Script.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRefreshList({ skipPreview = false } = {}) {
    setAdminMessage("");
    setAdminError("");

    const cleanRefreshToken = String(refreshListToken || "").trim();
    if (!cleanRefreshToken) {
      setAdminError("Refresh List token is required.");
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
    setIsSubmitting(true);

    try {
      const data = await sendAdminRequest({
        action: "refreshList",
        refreshToken: cleanRefreshToken
      });

      if (!data.success) {
        setAdminError(data.message || "List refresh failed.");
        return;
      }

      setAdminMessage(data.message || "List refreshed.");
      setRefreshListToken("");
      setShowRefreshTokenForm(false);
      if (onDataChanged) onDataChanged();
    } catch (error) {
      setAdminError(error.message || "Could not connect to Apps Script.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCheckTierUpdates() {
    setTierUpdateCheck({ loading: true, error: "", data: null });

    try {
      const data = await sendAdminRequest({ action: "checkTierUpdates", forceRefresh: true });
      if (!data.success) {
        setTierUpdateCheck({
          loading: false,
          error: data.message || "Update check failed.",
          data: null
        });
        return;
      }

      setTierUpdateCheck({ loading: false, error: "", data });
    } catch (error) {
      setTierUpdateCheck({
        loading: false,
        error: error.message || "Could not check for tier updates.",
        data: null
      });
    }
  }

  async function handleRevertRefresh() {
    setAdminMessage("");
    setAdminError("");
    setAdminToast(null);

    setIsSubmitting(true);

    try {
      const data = await sendAdminRequest({ action: "revertRefresh" });

      if (!data.success) {
        setAdminError(data.message || "Could not revert the refresh.");
        return;
      }

      setAdminMessage(data.message || "Refresh reverted.");
      if (onDataChanged) onDataChanged();
    } catch (error) {
      setAdminError(error.message || "Could not connect to Apps Script.");
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
      {adminToast && (
        <div className="admin-toast" role="status" aria-live="polite">
          <p>{adminToast.message}</p>
          <button
            type="button"
            onClick={() => setAdminToast(null)}
            aria-label="Close notification"
          >
            X
          </button>
        </div>
      )}
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
            setShowRefreshTokenForm(false);
            setShowNoteManager(false);
            setShowTimelineManager(false);
            setShowBetaListEditor(false);
            setEditFound(null);
            setEditNotFound(false);
            setAdminMessage("");
            setAdminError("");
          }}
        >
          <span className="admin-action-icon add"><Plus size={28} /></span>
          <strong>Add Demon</strong>
          <span>Add a new demon to your sheet.</span>
          <ArrowRight className="admin-action-arrow" size={22} />
        </button>

        <button
          className="admin-action-card"
          type="button"
          onClick={() => {
            setShowRemoveForm(open => !open);
            setShowAddForm(false);
            setShowEditForm(false);
            setShowRefreshTokenForm(false);
            setShowNoteManager(false);
            setShowTimelineManager(false);
            setShowBetaListEditor(false);
            setEditFound(null);
            setEditNotFound(false);
            setAdminMessage("");
            setAdminError("");
          }}
        >
          <span className="admin-action-icon remove"><Trash2 size={24} /></span>
          <strong>Remove Demon</strong>
          <span>Remove a demon by Level ID.</span>
          <ArrowRight className="admin-action-arrow" size={22} />
        </button>

        <button
          className="admin-action-card"
          type="button"
          onClick={() => {
            setShowEditForm(open => !open);
            setShowAddForm(false);
            setShowRemoveForm(false);
            setShowRefreshTokenForm(false);
            setShowNoteManager(false);
            setShowTimelineManager(false);
            setShowBetaListEditor(false);
            setEditFound(null);
            setEditNotFound(false);
            setAdminMessage("");
            setAdminError("");
          }}
        >
          <span className="admin-action-icon edit"><Pencil size={24} /></span>
          <strong>Edit Demon</strong>
          <span>Edit the name, difficulty, creators and more.</span>
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
            setShowNoteManager(false);
            setShowTimelineManager(false);
            setShowBetaListEditor(false);
            setEditFound(null);
            setEditNotFound(false);
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
          <span>Restore the latest Refresh List or Update All backup.</span>
          <ArrowRight className="admin-action-arrow" size={22} />
        </button>

        <button
          className="admin-action-card"
          type="button"
          onClick={openTimelineManager}
        >
          <span className="admin-action-icon timeline"><CalendarDays size={24} /></span>
          <strong>Timeline Manager</strong>
          <span>Add recap videos to timeline months.</span>
          <ArrowRight className="admin-action-arrow" size={22} />
        </button>

        <button
          className="admin-action-card"
          type="button"
          onClick={openBetaListEditor}
        >
          <span className="admin-action-icon beta"><Layers3 size={24} /></span>
          <strong>Edit Beta List</strong>
          <span>Reorder demons for your opinion-based list.</span>
          <ArrowRight className="admin-action-arrow" size={22} />
        </button>

        <button
          className="admin-action-card"
          type="button"
          onClick={openNoteManager}
        >
          <span className="admin-action-icon notes"><FileText size={24} /></span>
          <strong>Note Manager</strong>
          <span>Quickly view and edit all demon notes.</span>
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
          <span>Download demons, notes, requests and settings as JSON.</span>
          <ArrowRight className="admin-action-arrow" size={22} />
        </button>

        <button
          className="admin-action-card"
          type="button"
          onClick={onOpenRequests}
        >
          <span className="admin-action-icon requests"><Inbox size={24} /></span>
          <strong>Demon Requests</strong>
          <span>Open the request page.</span>
          <ArrowRight className="admin-action-arrow" size={22} />
        </button>
      </div>

      {showTimelineManager && (
        <div className="admin-form timeline-manager-form">
          <div className="timeline-manager-header">
            <div>
              <h3>Timeline Manager</h3>
              <p className="admin-form-note">
                Add YouTube recap videos to timeline months.
              </p>
            </div>
            <button
              className="close-button"
              onClick={() => setShowTimelineManager(false)}
              type="button"
            >
              Close
            </button>
          </div>

          <div className="timeline-manager-years" aria-label="Timeline years">
            {TIMELINE_YEARS.map(year => (
              <button
                className={timelineManagerYear === year ? "active" : ""}
                key={year}
                onClick={() => {
                  setTimelineManagerYear(year);
                  setRecapPopoverMonth("");
                  setRecapUrlDraft("");
                }}
                type="button"
              >
                {year}
              </button>
            ))}
          </div>

          <div className="timeline-manager-months">
            {TIMELINE_MONTHS.map(month => {
              const demonCount = timelineCounts[timelineManagerYear]?.[month.slug] || 0;
              const recapUrl = getMonthlyRecapUrl(monthlyRecaps, timelineManagerYear, month.slug);
              const isPopoverOpen = recapPopoverMonth === month.slug;

              return (
                <div className="timeline-manager-month-row" key={month.slug}>
                  <button
                    className="timeline-manager-month-main"
                    onClick={() => openRecapPopover(month.slug)}
                    type="button"
                  >
                    <span>
                      <strong>{month.name}</strong>
                      {recapUrl && <small>Recap video connected</small>}
                    </span>
                    <span className="timeline-manager-month-count">
                      {demonCount} {demonCount === 1 ? "demon" : "demons"}
                    </span>
                  </button>

                  <button
                    className="timeline-manager-add"
                    onClick={() => openRecapPopover(month.slug)}
                    type="button"
                    aria-label={`Add recap video for ${month.name} ${timelineManagerYear}`}
                  >
                    <Plus size={18} />
                  </button>

                  {isPopoverOpen && (
                    <div className="timeline-manager-popover">
                      <button
                        className="timeline-manager-popover-close"
                        onClick={() => setRecapPopoverMonth("")}
                        type="button"
                        aria-label="Close recap editor"
                      >
                        <X size={16} />
                      </button>
                      <p><Link size={16} /> Add YouTube URL</p>
                      <input
                        autoFocus
                        value={recapUrlDraft}
                        onChange={event => setRecapUrlDraft(event.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                      />
                      <div className="timeline-manager-popover-actions">
                        <button
                          className="login-button"
                          onClick={() => handleSaveMonthlyRecap()}
                          disabled={recapSaving}
                          type="button"
                        >
                          {recapSaving ? "Saving..." : "Save"}
                        </button>
                        {recapUrl && (
                          <button
                            className="close-button"
                            onClick={() => handleSaveMonthlyRecap("")}
                            disabled={recapSaving}
                            type="button"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showBetaListEditor && (
        <div className="admin-form beta-list-editor">
          <div className="note-manager-header">
            <div>
              <h3>Edit Beta List</h3>
              <p className="admin-form-note">
                The first order starts from your current demon placements.
              </p>
            </div>
            <span>{betaListDraft.length} demons</span>
          </div>

          <div className="beta-editor-actions">
            <label>
              Search
              <input
                value={betaListSearch}
                onChange={event => setBetaListSearch(event.target.value)}
                placeholder="Search demon, creator or ID..."
              />
            </label>
            <button
              className="login-button"
              onClick={handleSaveBetaList}
              disabled={betaListSaving || betaListDraft.length === 0}
              type="button"
            >
              {betaListSaving ? "Saving..." : "Save Beta List"}
            </button>
          </div>

          <div className="beta-editor-list">
            {filteredBetaListDraft.map(demon => {
              const index = betaListDraft.findIndex(item => String(item.id) === String(demon.id));

              return (
                <article
                  className="beta-editor-row"
                  draggable
                  key={demon.id || demon.name}
                  onDragStart={() => setDraggedBetaId(String(demon.id))}
                  onDragEnd={() => setDraggedBetaId("")}
                  onDragOver={event => event.preventDefault()}
                  onDrop={() => handleBetaDrop(demon.id)}
                >
                  <button
                    className="beta-drag-handle"
                    type="button"
                    aria-label={`Drag ${demon.name}`}
                  >
                    <GripVertical size={18} />
                  </button>
                  <span className="beta-editor-position">#{index + 1}</span>
                  <img
                    src={demon.thumbnail}
                    alt={demon.name}
                    onError={event => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                  <div className="beta-editor-main">
                    <strong>{demon.name}</strong>
                    <span>{demon.creator || "Unknown creator"} - current {demon.placement || "Unplaced"}</span>
                  </div>
                  <div className="beta-editor-row-actions">
                    <button
                      onClick={() => moveBetaDemon(index, index - 1)}
                      disabled={index <= 0}
                      type="button"
                      aria-label={`Move ${demon.name} up`}
                    >
                      <ArrowUp size={17} />
                    </button>
                    <button
                      onClick={() => moveBetaDemon(index, index + 1)}
                      disabled={index >= betaListDraft.length - 1}
                      type="button"
                      aria-label={`Move ${demon.name} down`}
                    >
                      <ArrowDown size={17} />
                    </button>
                  </div>
                </article>
              );
            })}

            {filteredBetaListDraft.length === 0 && (
              <p className="request-empty">
                <strong>No demons found.</strong>
                <span>Try a different search.</span>
              </p>
            )}
          </div>

          <div className="admin-form-actions">
            <button
              className="close-button"
              onClick={() => setShowBetaListEditor(false)}
              type="button"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showNoteManager && (
        <div className="admin-form note-manager-form">
          <div className="note-manager-header">
            <div>
              <h3>Note Manager</h3>
              <p className="admin-form-note">
                Edit your personal demon notes without opening every demon card.
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
                    <span>{demon.placement || "Unplaced"} - ID: {demon.id}</span>
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

      {showAddForm && (
        <div className="admin-form">
          <h3>Add Demon</h3>

          <label>
            Level ID
            <input
              value={addForm.levelId}
              onChange={e => setAddForm({ ...addForm, levelId: e.target.value })}
              placeholder="Example: 10565740"
            />
          </label>

          <label>
            Attempts
            <input
              type="number"
              min="0"
              value={addForm.attempts}
              onChange={e => setAddForm({ ...addForm, attempts: e.target.value })}
              placeholder="Example: 20226"
            />
          </label>

          <label>
            Date
            <input
              value={addForm.date}
              onChange={e => setAddForm({ ...addForm, date: e.target.value })}
              placeholder="Example: 2026 or 09/10/2025"
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
                placeholder="Example: 72"
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
              onChange={e => setRemoveLevelId(e.target.value)}
              placeholder="Example: 10565740"
            />
          </label>

          <div className="admin-form-actions">
            <button
              className="logout-confirm-button"
              onClick={handleRemoveDemon}
              disabled={isSubmitting}
              type="button"
            >
              {isSubmitting ? "Removing..." : "Remove Demon"}
            </button>

            <button
              className="close-button"
              onClick={() => {
                setShowRemoveForm(false);
                setRemoveLevelId("");
              }}
              type="button"
            >
              Cancel
            </button>
          </div>
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
              }}
              onKeyDown={e => { if (e.key === "Enter") handleSearchEdit(); }}
              placeholder="Exact name or Level ID..."
            />
            <button
              className="login-button edit-search-btn"
              onClick={handleSearchEdit}
              disabled={isSubmitting}
              type="button"
            >
              {isSubmitting ? "Searching..." : "Search"}
            </button>
          </div>

          <p className="edit-search-hint">
            Enter the exact name (case-insensitive) or exact Level ID.
          </p>

          {editNotFound && (
            <p className="admin-error" style={{ marginTop: "12px" }}>
              No demon found. Check the name or Level ID.
            </p>
          )}

          {editFound && (
            <>
              <div className="edit-found-badge">
                <span className="edit-found-dot" />
                <span>Found: <strong>{editFound.name}</strong></span>
                <span className="edit-found-id">ID: {editFound.id}</span>
              </div>

              <div className="edit-fields-grid">
                <label>
                  Name
                  <input
                    value={editForm.name}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Demon name"
                  />
                </label>

                <label>
                  Difficulty
                  <input
                    value={editForm.difficulty}
                    onChange={e => setEditForm({ ...editForm, difficulty: e.target.value })}
                    placeholder="Example: Extreme Demon"
                  />
                </label>

                <label>
                  Maker(s)
                  <input
                    value={editForm.creator}
                    onChange={e => setEditForm({ ...editForm, creator: e.target.value })}
                    placeholder="Example: Riot & more"
                  />
                </label>

                <label>
                  Date
                  <input
                    value={editForm.date}
                    onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                    placeholder="Example: 2024 or 09/10/2025"
                  />
                </label>

                <label>
                  Attempts
                  <input
                    type="number"
                    min="0"
                    value={editForm.attempts}
                    onChange={e => setEditForm({ ...editForm, attempts: e.target.value })}
                    placeholder="Example: 5000"
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
                      placeholder="Example: 67"
                    />
                  </label>
                )}

              </div>

              <div className="admin-form-actions" style={{ marginTop: "8px" }}>
                <button
                  className="login-button"
                  onClick={handleEditDemon}
                  disabled={isSubmitting}
                  type="button"
                >
                  {isSubmitting ? "Saving..." : "Save"}
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
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
