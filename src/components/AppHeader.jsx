import React, { useState } from "react";
import { FileClock, Info, LogIn, LogOut, Pencil, Radio, Shield, X } from "lucide-react";

const DEFAULT_SITE_VERSION = "v0.62";
const DEFAULT_VERSION_CHANGES = [
  "Added multiple site themes and theme-aware admin styling.",
  "Added skillset distribution on demon detail pages.",
  "Added safer admin tools with previews before heavy actions.",
  "Improved the desktop demon list, request page and list changes layout."
];

export function AppHeader({
  adminView,
  source,
  isAdmin,
  historyView,
  requestView,
  onOpenRequests,
  onOpenHistory,
  onOpenLogin,
  onOpenAdmin,
  onCloseAdmin,
  onOpenLogout,
  siteVersion,
  siteChangelog,
  onSaveChangelog
}) {
  const [showListInfo, setShowListInfo] = useState(false);
  const [showVersionInfo, setShowVersionInfo] = useState(false);
  const [editingVersionInfo, setEditingVersionInfo] = useState(false);
  const [versionDraft, setVersionDraft] = useState("");
  const [changelogDraft, setChangelogDraft] = useState("");
  const [versionSaveError, setVersionSaveError] = useState("");
  const [versionSaveMessage, setVersionSaveMessage] = useState("");
  const [versionSaving, setVersionSaving] = useState(false);
  const listInfoText = "This is my demon list with all the demons I have beaten over the years. It won't look like most of you hoped or expected. To me, some demons meant something, whether it was the moments surrounding them or a goal I wanted to achieve. From 2019 to the summer of 2021, I didn't beat any harder demons except some medium demons because I found it too challenging, but it was precisely in the summer of 2021 that I started taking things a step further and attempting to defeat Nine Circles. Since defeating this level, I wanted to go for the harder ones. Every demon had something to offer, which you will discover in this list.";
  const resolvedVersion = String(siteVersion || DEFAULT_SITE_VERSION).trim();
  const resolvedChangelog = Array.isArray(siteChangelog) && siteChangelog.length > 0
    ? siteChangelog
    : DEFAULT_VERSION_CHANGES;
  const pageTitle = adminView
    ? "Admin Panel"
    : requestView
      ? "Demon Requests"
      : historyView
        ? "List Changes"
        : "Demon List";
  const pageSubtitle = adminView
    ? "Manage your demon list tools and admin actions."
    : requestView
      ? "Community requests to add new demons to the list."
      : historyView
        ? "Browse all changes made to the demon list."
        : "A clean, searchable demon list powered by my Google Spreadsheet.";

  function openVersionInfo() {
    setVersionDraft(resolvedVersion);
    setChangelogDraft(resolvedChangelog.join("\n"));
    setVersionSaveError("");
    setVersionSaveMessage("");
    setEditingVersionInfo(false);
    setShowVersionInfo(true);
  }

  function closeVersionInfo() {
    setShowVersionInfo(false);
    setEditingVersionInfo(false);
    setVersionSaveError("");
    setVersionSaveMessage("");
  }

  async function handleSaveVersionInfo() {
    if (!onSaveChangelog) return;

    const changes = changelogDraft
      .split("\n")
      .map(line => line.trim())
      .filter(Boolean);

    setVersionSaveError("");
    setVersionSaveMessage("");

    if (!versionDraft.trim()) {
      setVersionSaveError("Version is required.");
      return;
    }

    if (changes.length === 0) {
      setVersionSaveError("Add at least one changelog line.");
      return;
    }

    setVersionSaving(true);
    const result = await onSaveChangelog(versionDraft.trim(), changes);
    setVersionSaving(false);

    if (!result?.success) {
      setVersionSaveError(result?.message || "Could not save changelog.");
      return;
    }

    setVersionSaveMessage(result.message || "Changelog saved.");
    setEditingVersionInfo(false);
  }

  return (
        <header className="hero">
          <div>
            <p className="eyebrow hero-eyebrow">
              <span>Moik's Geometry Dash Demon Archive</span>
              <button
                className="version-badge"
                onClick={openVersionInfo}
                type="button"
                aria-label={`Show changes in ${resolvedVersion}`}
              >
                {resolvedVersion}
              </button>
            </p>
            <div className="hero-title-row">
              <h1>{pageTitle}</h1>
              {!adminView && !requestView && !historyView && (
                <button
                  className="hero-info-button"
                  onClick={() => setShowListInfo(true)}
                  type="button"
                  aria-label="Demon list info"
                >
                  <Info size={26} />
                </button>
              )}
            </div>
            <p className="subtitle">
              {pageSubtitle}
            </p>
          </div>

          {showListInfo && (
            <div className="progress-info-backdrop" onClick={() => setShowListInfo(false)}>
              <section className="progress-info-modal list-info-modal" onClick={event => event.stopPropagation()}>
                <button
                  className="progress-info-close"
                  onClick={() => setShowListInfo(false)}
                  type="button"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
                <p>{listInfoText}</p>
              </section>
            </div>
          )}

          {showVersionInfo && (
            <div className="progress-info-backdrop" onClick={closeVersionInfo}>
              <section className="progress-info-modal version-info-modal" onClick={event => event.stopPropagation()}>
                <button
                  className="progress-info-close"
                  onClick={closeVersionInfo}
                  type="button"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
                <div className="version-info-header">
                  <h2>Changes in {resolvedVersion}</h2>
                  {isAdmin && onSaveChangelog && (
                    <button
                      className="version-edit-button"
                      onClick={() => {
                        setVersionDraft(resolvedVersion);
                        setChangelogDraft(resolvedChangelog.join("\n"));
                        setVersionSaveError("");
                        setVersionSaveMessage("");
                        setEditingVersionInfo(value => !value);
                      }}
                      type="button"
                      aria-label="Edit changelog"
                    >
                      <Pencil size={16} />
                    </button>
                  )}
                </div>

                {editingVersionInfo ? (
                  <div className="version-edit-form">
                    <label>
                      Version
                      <input
                        className="version-edit-input"
                        value={versionDraft}
                        onChange={event => setVersionDraft(event.target.value)}
                        placeholder="v0.62"
                      />
                    </label>
                    <label>
                      Changes
                      <textarea
                        className="version-edit-textarea"
                        value={changelogDraft}
                        onChange={event => setChangelogDraft(event.target.value)}
                        placeholder="One change per line"
                        rows={7}
                      />
                    </label>
                    {versionSaveError && <p className="version-edit-status error">{versionSaveError}</p>}
                    {versionSaveMessage && <p className="version-edit-status success">{versionSaveMessage}</p>}
                    <div className="version-edit-actions">
                      <button onClick={handleSaveVersionInfo} disabled={versionSaving} type="button">
                        {versionSaving ? "Saving..." : "Save changelog"}
                      </button>
                      <button
                        onClick={() => {
                          setEditingVersionInfo(false);
                          setVersionSaveError("");
                          setVersionSaveMessage("");
                        }}
                        type="button"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {versionSaveMessage && <p className="version-edit-status success">{versionSaveMessage}</p>}
                    <ul>
                      {resolvedChangelog.map(change => (
                        <li key={change}>{change}</li>
                      ))}
                    </ul>
                  </>
                )}
              </section>
            </div>
          )}
    
          <div>
            <div className={`source-pill ${source}`}>
              {source === "live" && <Radio size={15} />}
              {source === "live" ? "Live Sheet Data" : source === "mock" ? "Mock Data" : "Loading"}
            </div>
    
            {!adminView && (
              <button className="admin-button panel-button" onClick={onOpenHistory} type="button">
                <FileClock size={16} />
                {historyView ? "Back to list" : "List Changes"}
              </button>
            )}

            {!adminView && !historyView && (
              <button className="admin-button panel-button" onClick={onOpenRequests} type="button">
                Demon Requests
              </button>
            )}
    
            {!isAdmin && (
              <button className="admin-button" onClick={onOpenLogin} type="button">
                <LogIn size={16} />
                Admin Login
              </button>
            )}
    
            {isAdmin && !adminView && (
              <button className="admin-button panel-button" onClick={onOpenAdmin} type="button">
                <Shield size={16} />
                Go to panel
              </button>
            )}
    
            {isAdmin && adminView && (
              <button className="admin-button panel-button" onClick={onCloseAdmin} type="button">
                Back to list
              </button>
            )}
    
            {isAdmin && (
              <button className="admin-button logout-button" onClick={onOpenLogout} type="button">
                <LogOut size={16} />
                Logout
              </button>
            )}
          </div>
        </header>
  );
}

