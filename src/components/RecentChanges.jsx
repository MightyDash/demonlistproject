import React from "react";

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("nl-NL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function changeLabel(type) {
  const normalized = String(type || "").toLowerCase();
  if (normalized.includes("new")) return "New";
  if (normalized.includes("remove")) return "Removed";
  if (normalized.includes("climber")) return "Climber";
  if (normalized.includes("drop")) return "Drop";
  if (normalized.includes("swap")) return "Swap";
  return type || "Change";
}

export function RecentChanges({ changes, loading, error, onBack }) {
  return (
    <section className="panel recent-panel">
      <div className="admin-panel-header">
        <div>
          <p className="eyebrow">History</p>
          <h2>Recent Changes</h2>
          <p>Latest updates from the demon list history sheet.</p>
        </div>

        <button className="admin-button" onClick={onBack} type="button">
          Back to list
        </button>
      </div>

      {loading ? (
        <div className="request-loading">
          <span className="loading-dot" />
          Loading recent changes...
        </div>
      ) : error ? (
        <p className="admin-error">{error}</p>
      ) : changes.length === 0 ? (
        <div className="request-empty">
          <strong>No recent changes found.</strong>
          <span>History entries will appear here after update runs.</span>
        </div>
      ) : (
        <div className="recent-list">
          {changes.map((change, index) => (
            <article className="recent-card" key={`${change.timestamp}-${change.demon}-${index}`}>
              <div className="recent-card-top">
                <span className={`recent-type ${String(change.type || "").toLowerCase().replace(/\s+/g, "-")}`}>
                  {changeLabel(change.type)}
                </span>
                <time>{formatDate(change.timestamp)}</time>
              </div>

              <h3>{change.demon || "Update"}</h3>
              {change.message && <p>{change.message}</p>}

              {(change.oldPlacement || change.newPlacement) && (
                <div className="recent-meta">
                  {change.oldPlacement && <span>Old: {change.oldPlacement}</span>}
                  {change.newPlacement && <span>New: {change.newPlacement}</span>}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
