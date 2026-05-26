import React, { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Save, X } from "lucide-react";
import { Detail } from "./Detail.jsx";
import { formatNumber, formatTier } from "../demonUtils.js";

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

  useEffect(() => {
    setNoteDraft(demon.notes || "");
    setNoteState({ saving: false, message: "", error: "" });
  }, [demon.id, demon.notes]);

  async function handleSaveNote() {
    if (!onSaveNote) return;

    setNoteState({ saving: true, message: "", error: "" });
    const result = await onSaveNote(demon, noteDraft);

    if (result?.success) {
      setNoteState({ saving: false, message: result.message || "Saved.", error: "" });
    } else {
      setNoteState({ saving: false, message: "", error: result?.message || "Could not save memory." });
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <article className="modal" onMouseDown={e => e.stopPropagation()}>
        <button className="close" onClick={onClose} type="button" aria-label="Close details">
          <X size={20} />
        </button>

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

        <div className="modal-cover">
          <img
            src={thumbnailSrc}
            alt={demon.name}
            onError={e => {
              e.currentTarget.style.display = "none";
            }}
          />
          <div className="modal-cover-shade" />
          <div className="modal-cover-badges">
            <span className="modal-tier">Tier {formatTier(demon.tier)}</span>
          </div>
        </div>

        <div className="modal-content">
          <div className="modal-title-row">
            <div>
              <p className="placement-large">{demon.placement}</p>
              <h2>{demon.name}</h2>
              <p className="creator">by {demon.creator || "Unknown creator"}</p>
            </div>

            {demon.id && (
              <a
                className="external-link modal-action"
                href={`https://gdbrowser.com/${encodeURIComponent(demon.id)}`}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={17} />
                GDBrowser
              </a>
            )}
          </div>

          {demon.formerTop1Year && (
            <div className="former-top1-badge">
              Former Top 1 ({demon.formerTop1Year})
            </div>
          )}

          <div className="detail-grid">
            <Detail label="Level ID" value={demon.id} />
            <Detail label="Tier" value={formatTier(demon.tier)} />
            <Detail label="Difficulty" value={demon.difficulty} />
            <Detail label="Attempts" value={formatNumber(demon.attempts)} />
            <Detail label="Year" value={demon.year || "Unknown"} />
          </div>

          {demon.skillsets?.length > 0 && (
            <div className="skillsets">
              <h3>Skillsets</h3>
              <div className="skillset-list">
                {demon.skillsets.map(skill => (
                  <span key={skill} className="skillset-tag">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="memory-panel">
            <h3>Memory</h3>
            {isAdmin ? (
              <>
                <textarea
                  value={noteDraft}
                  onChange={event => setNoteDraft(event.target.value)}
                  placeholder="Write a memory for this demon..."
                  rows={5}
                />
                <div className="memory-actions">
                  <button
                    className="login-button memory-save-button"
                    onClick={handleSaveNote}
                    disabled={noteState.saving}
                    type="button"
                  >
                    <Save size={16} />
                    {noteState.saving ? "Saving..." : "Save memory"}
                  </button>
                  {noteState.message && <span className="memory-message">{noteState.message}</span>}
                  {noteState.error && <span className="memory-error">{noteState.error}</span>}
                </div>
              </>
            ) : (
              <p className="memory-text">
                {demon.notes || "No memory added yet."}
              </p>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}

