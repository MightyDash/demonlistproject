import React, { useEffect, useMemo } from "react";
import { CalendarDays, Clock3, Gamepad2, History, RefreshCw, X } from "lucide-react";
import { formatNumber } from "../demonUtils.js";
import { buildProgressTimeline, formatProgressHistoryDate, progressCategoryLabel } from "../progressHistoryUtils.js";
import { useProgressHistory } from "../useProgressHistory.js";

function categoryClass(value) {
  return String(value || "IN PROGRESS").toLowerCase().replaceAll(" ", "-");
}

export function ProgressDemonDetail({ demon, onClose }) {
  const { entries, loading, error, retry } = useProgressHistory(demon.id);
  const category = String(demon.progressCategory || "IN PROGRESS").toUpperCase();
  const showProgress = category !== "DROPPED";
  const progress = Math.max(0, Math.min(100, Number(demon.progressPercent || 0)));

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const timeline = useMemo(() => buildProgressTimeline(entries, demon), [entries, demon]);
  const latestRecorded = timeline.find(entry => entry.recordedAt);
  const latestChange = timeline[0]?.progressDelta || 0;

  return (
    <div className="progress-detail-overlay" role="dialog" aria-modal="true" aria-labelledby="progress-detail-title" onMouseDown={event => event.target === event.currentTarget && onClose?.()}>
      <article className="progress-detail-page">
        <header className="progress-detail-header">
          <button className="progress-detail-back" onClick={onClose} type="button"><X size={20} /><span>Back to Progress Tracker</span></button>
          <div className="progress-detail-title-row">
            <div>
              <h2 id="progress-detail-title">{demon.name}</h2>
              <p>by {demon.creator}</p>
            </div>
            <span className={`progress-detail-status ${categoryClass(category)}`}>{progressCategoryLabel(category)}</span>
          </div>
        </header>

        <section className="progress-detail-current">
          {demon.thumbnail && <img className="progress-detail-thumbnail" src={demon.thumbnail} alt="" />}
          <span className="progress-detail-current-shade" aria-hidden="true" />
          <div className="progress-detail-current-content">
            <div className="progress-detail-current-heading">
              <span>{showProgress ? "Current progress" : "Saved attempt data"}</span>
              {showProgress && latestChange > 0 && <b>+{latestChange}% since last update</b>}
            </div>

            {showProgress && (
              <div className="progress-detail-percentage">
                <strong>{progress}%</strong>
                <span className="progress-detail-meter" aria-label={`Current progress ${progress}%`}><i style={{ width: `${progress}%` }} /></span>
              </div>
            )}

            <div className="progress-detail-facts">
              <div><Gamepad2 aria-hidden="true" /><span><strong>{formatNumber(demon.attempts)}</strong><small>Total attempts</small></span></div>
              <div><CalendarDays aria-hidden="true" /><span><strong>{latestRecorded ? formatProgressHistoryDate(latestRecorded.recordedAt) : "Not recorded"}</strong><small>Last updated</small></span></div>
              <div><Clock3 aria-hidden="true" /><span><strong>{demon.difficulty || "Unknown"}</strong><small>Difficulty</small></span></div>
            </div>
          </div>
        </section>

        <section className="progress-detail-history">
          <div className="progress-detail-section-title"><History aria-hidden="true" /><div><span>Progress History</span><small>{timeline.length} {timeline.length === 1 ? "update" : "updates"}</small></div></div>

          {loading ? (
            <div className="progress-detail-loading"><span />Loading progress history…</div>
          ) : error ? (
            <div className="progress-detail-error"><p>{error}</p><button onClick={retry} type="button"><RefreshCw size={17} />Try again</button></div>
          ) : (
            <div className="progress-history-timeline">
              {timeline.map((entry, index) => {
                const progressChanged = entry.previousProgressPercent !== null && entry.previousProgressPercent !== entry.progressPercent;
                const categoryChanged = entry.previousProgressCategory !== null && entry.previousProgressCategory !== entry.progressCategory;
                const attemptDeltaLabel = entry.attemptDelta > 0
                  ? `+${formatNumber(entry.attemptDelta)} attempts`
                  : entry.attemptDelta < 0
                    ? `${formatNumber(entry.attemptDelta)} attempts`
                    : `${formatNumber(entry.attempts)} attempts`;

                return (
                  <article className={`progress-history-entry ${index === 0 ? "latest" : ""}`} key={`${entry.recordedAt || "current"}-${entry.event}-${index}`}>
                    <span className="progress-history-dot" aria-hidden="true" />
                    <div className="progress-history-card">
                      <div className="progress-history-main">
                        <span>{formatProgressHistoryDate(entry.recordedAt)}</span>
                        <b>{entry.label}</b>
                        <strong>{progressChanged ? `${entry.previousProgressPercent}% → ${entry.progressPercent}%` : `${entry.progressPercent}%`}</strong>
                      </div>
                      <div className="progress-history-attempts"><strong>{attemptDeltaLabel}</strong><small>{formatNumber(entry.attempts)} total</small></div>
                      {(categoryChanged || entry.event === "BASELINE") && <span className={`progress-history-status ${categoryClass(entry.progressCategory)}`}>{entry.categoryLabel}</span>}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </article>
    </div>
  );
}
