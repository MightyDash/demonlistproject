import React from "react";
import { ChevronLeft, ChevronRight, ExternalLink, X } from "lucide-react";
import { Detail } from "./Detail.jsx";
import { formatNumber, formatTier } from "../demonUtils.js";

export function DemonModal({ demon, onClose, onPrev, onNext, hasPrev, hasNext }) {
  const thumbnailSrc = demon.id
    ? `https://levelthumbs.prevter.me/thumbnail/${demon.id}`
    : "";

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
            <span className="modal-placement">{demon.placement}</span>
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

          {demon.notes && <p className="notes">{demon.notes}</p>}
        </div>
      </article>
    </div>
  );
}

