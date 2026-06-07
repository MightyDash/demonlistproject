import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  FileText,
  Gamepad2,
  Heart,
  Save,
  Share2,
  X
} from "lucide-react";
import { formatNumber, formatTier } from "../demonUtils.js";
import { SHEET_API_URL } from "../config.js";

const SKILLSET_COLORS = [
  "#1495df",
  "#7d3fe1",
  "#ff4168",
  "#ffc148",
  "#2ce5a7",
  "#ff7a1a",
  "#33d7ff",
  "#b55cff",
  "#7dd957",
  "#ff5ea8",
  "#8ea7ff",
  "#f5d76e"
];

export function DemonModal({
  demon,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  isAdmin,
  onSaveNote
}) {
  const [noteDraft, setNoteDraft] = useState(demon.notes || "");
  const [noteState, setNoteState] = useState({ saving: false, message: "", error: "" });
  const thumbnailSrc = demon.id
    ? `https://levelthumbs.prevter.me/thumbnail/${demon.id}`
    : "";
  const cleanPlacement = String(demon.placement || "").trim() || "Unplaced";
  const cleanDifficulty = demon.difficulty || "Unknown";
  const noteText = demon.notes || "No note added yet.";
  const [skillsetDistribution, setSkillsetDistribution] = useState(
    Array.isArray(demon.skillsetDistribution) ? demon.skillsetDistribution : []
  );
  const [distributionLoading, setDistributionLoading] = useState(false);

  const distribution = useMemo(() => {
    const topSkillsets = skillsetDistribution
      .map(item => ({
        ...item,
        count: Number(item.count || 0)
      }))
      .filter(item => item.name && item.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const visibleTotal = topSkillsets.reduce((sum, item) => sum + item.count, 0);

    return topSkillsets.map((item, index) => ({
      ...item,
      percentage: visibleTotal ? Math.round((item.count / visibleTotal) * 1000) / 10 : 0,
      color: SKILLSET_COLORS[index % SKILLSET_COLORS.length]
    }));
  }, [skillsetDistribution]);

  const donutBackground = useMemo(() => {
    if (distribution.length === 0) {
      return "conic-gradient(rgba(255,255,255,0.1) 0 100%)";
    }

    let start = 0;
    const stops = distribution.map(item => {
      const end = Math.min(100, start + item.percentage);
      const segment = `${item.color} ${start}% ${end}%`;
      start = end;
      return segment;
    });

    if (start < 100) {
      stops.push(`rgba(255,255,255,0.08) ${start}% 100%`);
    }

    return `conic-gradient(${stops.join(", ")})`;
  }, [distribution]);

  useEffect(() => {
    setNoteDraft(demon.notes || "");
    setNoteState({ saving: false, message: "", error: "" });
  }, [demon.id, demon.notes]);

  useEffect(() => {
    setSkillsetDistribution(Array.isArray(demon.skillsetDistribution) ? demon.skillsetDistribution : []);

    if (!SHEET_API_URL || !demon.id) return;

    let cancelled = false;
    async function loadSkillsetDistribution() {
      setDistributionLoading(true);

      try {
        const separator = SHEET_API_URL.includes("?") ? "&" : "?";
        const response = await fetch(
          `${SHEET_API_URL}${separator}view=skillsets&levelId=${encodeURIComponent(demon.id)}`
        );
        const data = await response.json();

        if (!cancelled && Array.isArray(data.skillsetDistribution)) {
          setSkillsetDistribution(data.skillsetDistribution);
        }
      } catch {
        if (!cancelled) setSkillsetDistribution([]);
      } finally {
        if (!cancelled) setDistributionLoading(false);
      }
    }

    loadSkillsetDistribution();
    return () => {
      cancelled = true;
    };
  }, [demon.id, demon.skillsetDistribution]);

  async function handleSaveNote() {
    if (!onSaveNote) return;

    setNoteState({ saving: true, message: "", error: "" });
    const result = await onSaveNote(demon, noteDraft);

    if (result?.success) {
      setNoteState({ saving: false, message: result.message || "Saved.", error: "" });
    } else {
      setNoteState({ saving: false, message: "", error: result?.message || "Could not save note." });
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <article className="modal demon-detail-modal" onMouseDown={e => e.stopPropagation()}>
        <button className="close" onClick={onClose} type="button" aria-label="Close details">
          <X size={20} />
        </button>
        <div className="modal-page-nav">
          <button className="modal-back-link" onClick={onClose} type="button">
            <ChevronLeft size={18} />
            Back to Demon List
          </button>
        </div>

        <div className="modal-nav">
          {hasPrev && (
            <button className="nav-button left" onClick={onPrev} type="button" aria-label="Previous demon">
              <ChevronLeft size={30} />
            </button>
          )}
          {hasNext && (
            <button className="nav-button right" onClick={onNext} type="button" aria-label="Next demon">
              <ChevronRight size={30} />
            </button>
          )}
        </div>

        <div className="modal-hero-layout">
          <section className="modal-identity">
            <span className="modal-placement-pill">{cleanPlacement}</span>
            <h2>{demon.name}</h2>
            <p className="creator">
              by {demon.creator || "Unknown creator"} <span className="creator-check" aria-label="Verified creator" />
            </p>

            <div className="modal-quick-tags">
              <span className={`difficulty ${String(cleanDifficulty).toLowerCase().includes("extreme") ? "extreme" : ""}`}>
                {cleanDifficulty}
              </span>
              <span className="modal-tier">Tier {formatTier(demon.tier)}</span>
            </div>

            <div className="modal-action-row">
              {demon.id && (
                <a
                  className="external-link modal-action"
                  href={`https://gdbrowser.com/${encodeURIComponent(demon.id)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink size={17} />
                  Open in GDBrowser
                </a>
              )}
              <button className="modal-icon-button" type="button" aria-label="Bookmark"><Bookmark size={20} /></button>
              <button className="modal-icon-button" type="button" aria-label="Favorite"><Heart size={20} /></button>
              <button className="modal-icon-button" type="button" aria-label="Stats"><BarChart3 size={20} /></button>
              <button className="modal-icon-button" type="button" aria-label="Share"><Share2 size={20} /></button>
            </div>
          </section>

          <div className="modal-cover">
            <img
              src={thumbnailSrc}
              alt={demon.name}
              onError={e => {
                e.currentTarget.style.display = "none";
              }}
            />
            <div className="modal-cover-shade" />
          </div>
        </div>

        <div className="modal-content">
          <div className="modal-detail-layout">
            <section className="modal-info-card overview-card">
              <h3><Clock3 size={22} /> Overview</h3>
              <div className="overview-list">
                <div><span>Level ID</span><strong>{demon.id}</strong></div>
                <div><span>Creator(s)</span><strong>{demon.creator || "Unknown"}</strong></div>
                <div><span>Difficulty</span><strong className="overview-danger">{cleanDifficulty}</strong></div>
                <div><span>Tier</span><strong>{formatTier(demon.tier)}</strong></div>
                <div><span>Attempts (Total)</span><strong>{formatNumber(demon.attempts)}</strong></div>
                <div><span>Year</span><strong>{demon.year || "Unknown"}</strong></div>
              </div>
            </section>

            <section className="modal-info-card description-card">
              <h3><FileText size={22} /> Description</h3>
              {isAdmin ? (
                <>
                  <textarea
                    value={noteDraft}
                    onChange={event => setNoteDraft(event.target.value)}
                    placeholder="Write a note for this demon..."
                    rows={6}
                  />
                  <div className="memory-actions">
                    <button
                      className="login-button memory-save-button"
                      onClick={handleSaveNote}
                      disabled={noteState.saving}
                      type="button"
                    >
                      <Save size={16} />
                      {noteState.saving ? "Saving..." : "Save note"}
                    </button>
                    {noteState.message && <span className="memory-message">{noteState.message}</span>}
                    {noteState.error && <span className="memory-error">{noteState.error}</span>}
                  </div>
                </>
              ) : (
                <p className="memory-text">{noteText}</p>
              )}
            </section>

            <aside className="modal-side-stack">
              <section className="modal-info-card distribution-card">
                <h3><BarChart3 size={22} /> Skillset distribution</h3>
                <div className="distribution-content">
                  <div className="distribution-donut" style={{ background: donutBackground }} aria-hidden="true" />
                  {distribution.length > 0 ? (
                    <div className="distribution-legend">
                      {distribution.map(item => (
                        <span key={item.name} className="distribution-item" title={item.description || ""}>
                          <i style={{ backgroundColor: item.color }} />
                          <strong>{item.percentage}%</strong>
                          {item.name}
                          <small>{item.count} votes</small>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="distribution-empty">
                      {distributionLoading ? "Loading GDDL skillsets..." : "No GDDL skillset votes found yet."}
                    </p>
                  )}
                </div>
              </section>

              <section className="modal-info-card history-card">
                <h3><Clock3 size={22} /> Level history</h3>
                <div className="history-mini-list">
                  <span><b>Latest</b> Stats updated</span>
                  <span><b>{demon.year || "Unknown"}</b> Added to list</span>
                  <span><b>{formatTier(demon.tier)}</b> Current tier</span>
                </div>
              </section>
            </aside>

            {demon.skillsets?.length > 0 && (
            <section className="modal-info-card skillsets">
              <h3><Gamepad2 size={22} /> Skillsets</h3>
              <div className="skillset-list">
                {demon.skillsets.map(skill => (
                  <span key={skill} className="skillset-tag">
                    {skill}
                  </span>
                ))}
              </div>
            </section>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}

