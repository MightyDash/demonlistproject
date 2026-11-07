import React, { useMemo, useState } from "react";
import { CirclePause, CirclePlay, Flag, Info, XCircle } from "lucide-react";
import { difficultyClass } from "../demonUtils.js";

const FILTERS = [
  ["all", "All", null],
  ["IN PROGRESS", "In Progress", CirclePlay],
  ["PLAN TO BEAT", "Plan to Beat", Flag],
  ["ON HOLD", "On Hold", CirclePause],
  ["DROPPED", "Dropped", XCircle]
];

function categoryOf(demon) {
  const category = String(demon.progressCategory || "IN PROGRESS").toUpperCase();
  return FILTERS.some(([value]) => value === category) ? category : "IN PROGRESS";
}

function categoryClass(category) {
  return category.toLowerCase().replaceAll(" ", "-");
}

export function ProgressTrackerPage({ demons, activeFilter, onFilterChange, onSelectDemon }) {
  const [showInfo, setShowInfo] = useState(false);
  const counts = useMemo(() => Object.fromEntries(FILTERS.slice(1).map(([value]) => [
    value,
    demons.filter(demon => categoryOf(demon) === value).length
  ])), [demons]);
  const shown = activeFilter === "all" ? demons : demons.filter(demon => categoryOf(demon) === activeFilter);

  return (
    <main className="progress-tracker-page">
      <header className="progress-tracker-toolbar">
        <div className="progress-tracker-count">
          <strong>{demons.length}</strong> demons
          <button type="button" aria-label="About Progress Tracker" onClick={() => setShowInfo(value => !value)}><Info size={16} /></button>
          {showInfo && <div className="progress-tracker-info">Demons I am playing, planning to beat, pausing or no longer playing.</div>}
        </div>
        <nav className="progress-status-filters" aria-label="Filter progress status">
          {FILTERS.map(([value, label, Icon]) => (
            <button key={value} type="button" className={`${categoryClass(value)} ${activeFilter === value ? "active" : ""}`} onClick={() => onFilterChange(value)}>
              {Icon && <Icon size={17} />}<span>{label}</span>
              <b>{value === "all" ? demons.length : counts[value]}</b>
            </button>
          ))}
        </nav>
      </header>

      {shown.length ? <section className="progress-tracker-grid">
        {shown.map(demon => {
          const category = categoryOf(demon);
          const className = categoryClass(category);
          const showProgress = category === "IN PROGRESS" || category === "ON HOLD";
          const progress = Math.max(0, Math.min(100, Number(demon.progressPercent || 0)));
          return (
            <button className={`progress-tracker-card ${className}`} key={demon.id || demon.name} type="button" onClick={() => onSelectDemon(demon)}>
              <img src={demon.thumbnail} alt="" loading="lazy" />
              <span className="progress-card-shade" />
              <span className="progress-card-content">
                <span className={`progress-status-badge ${className}`}>{FILTERS.find(([value]) => value === category)?.[1]}</span>
                <strong>{demon.name}</strong>
                <small>by {demon.creator}</small>
                <span className={`progress-difficulty ${difficultyClass(demon.difficulty)}`}>{demon.difficulty}</span>
                {showProgress && <span className="progress-card-progress"><span><b>{progress}%</b><i>{category === "ON HOLD" ? "saved progress" : "best run"}</i></span><em><i style={{ width: `${progress}%` }} /></em></span>}
              </span>
            </button>
          );
        })}
      </section> : <div className="progress-tracker-empty">No demons in this category yet.</div>}
    </main>
  );
}
