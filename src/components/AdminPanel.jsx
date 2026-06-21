import React, { useMemo, useState } from "react";
import { ArrowRight, Download, FileText, Inbox, Paintbrush } from "lucide-react";

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
  siteTheme = "Basic",
  onThemeChanged,
  demons = [],
  requests = [],
  onOpenRequests,
  onSaveNote
}) {
  const [openTool, setOpenTool] = useState("");
  const [noteSearch, setNoteSearch] = useState("");
  const [noteDrafts, setNoteDrafts] = useState({});
  const [noteSavingId, setNoteSavingId] = useState("");
  const [themeDraft, setThemeDraft] = useState(siteTheme);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const noteManagerDemons = useMemo(() => {
    const query = noteSearch.trim().toLowerCase();
    if (!query) return demons;

    return demons.filter(demon =>
      [demon.name, demon.creator, demon.id].some(value =>
        String(value || "").toLowerCase().includes(query)
      )
    );
  }, [demons, noteSearch]);

  function selectTool(tool) {
    setMessage("");
    setError("");
    setOpenTool(current => current === tool ? "" : tool);

    if (tool === "notes") {
      const drafts = {};
      demons.forEach(demon => {
        drafts[demon.id] = demon.notes || "";
      });
      setNoteDrafts(drafts);
      setNoteSearch("");
    }
  }

  async function sendAdminRequest(payload) {
    const adminUrl = import.meta.env.VITE_APPS_SCRIPT_ADMIN_URL;
    const token = localStorage.getItem("admin_token");

    if (!adminUrl) throw new Error("VITE_APPS_SCRIPT_ADMIN_URL ontbreekt in Render.");
    if (!token) throw new Error("Je bent niet ingelogd.");

    const response = await fetch(adminUrl, {
      method: "POST",
      body: JSON.stringify({ ...payload, token })
    });

    return response.json();
  }

  async function handleSaveTheme() {
    setMessage("");
    setError("");
    setSaving(true);

    try {
      const data = await sendAdminRequest({ action: "setSiteTheme", theme: themeDraft });
      if (!data.success) throw new Error(data.message || "Theme wijzigen mislukt.");

      onThemeChanged?.(data.theme || themeDraft);
      setMessage(data.message || "Theme updated.");
      setOpenTool("");
      setThemeMenuOpen(false);
    } catch (requestError) {
      setError(requestError.message || "Kon geen verbinding maken met Apps Script.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveManagedNote(demon) {
    if (!onSaveNote) return;

    setMessage("");
    setError("");
    setNoteSavingId(String(demon.id));

    try {
      const result = await onSaveNote(demon, noteDrafts[demon.id] || "");
      if (!result?.success) throw new Error(result?.message || "Note opslaan mislukt.");
      setMessage(result.message || `Note voor ${demon.name} opgeslagen.`);
    } catch (requestError) {
      setError(requestError.message || "Note opslaan mislukt.");
    } finally {
      setNoteSavingId("");
    }
  }

  async function handleBackupExport() {
    setMessage("");
    setError("");

    try {
      let requestBackup = requests;

      try {
        const requestData = await sendAdminRequest({ action: "getRequests" });
        if (requestData.success && Array.isArray(requestData.requests)) {
          requestBackup = requestData.requests;
        }
      } catch {
        // The current request data is still useful if the extra fetch fails.
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
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `moiks-demon-list-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage("Backup export gemaakt.");
    } catch (requestError) {
      setError(requestError.message || "Backup export mislukt.");
    }
  }

  const tools = [
    {
      id: "theme",
      title: "Site Theme",
      description: "Stel het thema voor alle bezoekers in.",
      icon: <Paintbrush size={24} />,
      action: () => selectTool("theme")
    },
    {
      id: "notes",
      title: "Note Manager",
      description: "Bekijk en bewerk alle persoonlijke demon notes.",
      icon: <FileText size={24} />,
      action: () => selectTool("notes")
    },
    {
      id: "backup",
      title: "Backup Export",
      description: "Download demons, notes, requests en settings als JSON.",
      icon: <Download size={24} />,
      action: handleBackupExport
    },
    {
      id: "requests",
      title: "Demon Requests",
      description: "Ga direct naar de requestpagina.",
      icon: <Inbox size={24} />,
      action: onOpenRequests
    }
  ];

  return (
    <section className="panel admin-panel">
      <div className="admin-panel-header">
        <div>
          <p className="eyebrow">Moik's Geometry Dash Demon Archive</p>
          <h2>Admin Panel</h2>
          <p>Site-instellingen, notes, backups en requests.</p>
        </div>
        <button className="admin-button" onClick={onBack} type="button">Back to list</button>
      </div>

      {message && <p className="admin-success">{message}</p>}
      {error && <p className="admin-error">{error}</p>}

      <div className="admin-panel-grid">
        {tools.map(tool => (
          <button className="admin-action-card" key={tool.id} onClick={tool.action} type="button">
            <span className={`admin-action-icon ${tool.id}`}>{tool.icon}</span>
            <strong>{tool.title}</strong>
            <span>{tool.description}</span>
            <ArrowRight className="admin-action-arrow" size={22} />
          </button>
        ))}
      </div>

      {openTool === "theme" && (
        <div className="admin-form">
          <h3>Site Theme</h3>
          <label>
            Theme
            <div className="theme-picker">
              <button
                className="theme-picker-button"
                type="button"
                onClick={() => setThemeMenuOpen(open => !open)}
                aria-expanded={themeMenuOpen}
              >
                <span>{themeDraft}</span>
                <span className="theme-picker-chevron">v</span>
              </button>
              {themeMenuOpen && (
                <div className="theme-picker-menu" role="listbox">
                  {SITE_THEMES.map(theme => (
                    <button
                      className={`theme-picker-option ${themeDraft === theme ? "active" : ""}`}
                      key={theme}
                      type="button"
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
            <button className="login-button" onClick={handleSaveTheme} disabled={saving} type="button">
              {saving ? "Saving..." : "Save Theme"}
            </button>
            <button className="close-button" onClick={() => setOpenTool("")} type="button">Cancel</button>
          </div>
        </div>
      )}

      {openTool === "notes" && (
        <div className="admin-form note-manager-form">
          <div className="note-manager-header">
            <div>
              <h3>Note Manager</h3>
              <p className="admin-form-note">Bewerk notes zonder iedere demonkaart los te openen.</p>
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
                    onError={event => { event.currentTarget.style.display = "none"; }}
                  />
                  <div>
                    <strong>{demon.name}</strong>
                    <span>{demon.placement || "Unplaced"} - ID: {demon.id}</span>
                  </div>
                </div>
                <textarea
                  value={noteDrafts[demon.id] ?? demon.notes ?? ""}
                  onChange={event => setNoteDrafts(previous => ({
                    ...previous,
                    [demon.id]: event.target.value
                  }))}
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
          </div>
          <div className="admin-form-actions">
            <button className="close-button" onClick={() => setOpenTool("")} type="button">Close</button>
          </div>
        </div>
      )}
    </section>
  );
}
