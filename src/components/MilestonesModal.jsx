import React, { useMemo } from "react";
import { Award, X } from "lucide-react";
import { isInProgressDemon } from "../demonUtils.js";

const MILESTONES = [
  { ordinal: "1st", name: "THE LIGHTNING ROAD" },
  { ordinal: "10th", name: "Deadlocked" },
  { ordinal: "50th", name: "Lanthanium" },
  { ordinal: "150th", name: "CraZy" },
  { ordinal: "200th", name: "Flurry" },
  { ordinal: "250th", name: "free level" },
  { ordinal: "300th", name: "Backstreet Boy" },
  { ordinal: "350th", name: "To the grave" },
  { ordinal: "400th", name: "cant let go copy" },
  { ordinal: "500th", name: "Adventure to Uncnown" },
  { ordinal: "600th", name: null },
  { ordinal: "700th", name: null },
  { ordinal: "800th", name: null },
  { ordinal: "900th", name: null },
  { ordinal: "1000th", name: null }
];

const HONORABLE_MENTIONS = [
  { ordinal: "154th", name: "Acu" },
  { ordinal: "413th", name: "Make It Drop" },
  { ordinal: "447th", name: "Bloodbath" }
];

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

function getMilestoneNumber(ordinal) {
  const match = String(ordinal || "").match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function MilestoneRow({ item, demonByName, completedCount }) {
  const targetNumber = getMilestoneNumber(item.ordinal);
  const reached = targetNumber > 0 && completedCount >= targetNumber;
  const demon = item.name ? demonByName.get(normalizeName(item.name)) : null;
  const displayName = item.name && reached ? (demon?.name || item.name) : "not that far yet";
  const placement = demon?.placement || "";

  return (
    <li className={reached ? "" : "locked"}>
      <span className="milestone-ordinal">{item.ordinal}</span>
      <span className="milestone-name">{displayName}</span>
      {placement && <span className="milestone-placement">{placement}</span>}
    </li>
  );
}

export function MilestonesModal({ demons, onClose }) {
  const completedDemons = useMemo(
    () => demons.filter(demon => !isInProgressDemon(demon)),
    [demons]
  );

  const demonByName = useMemo(() => {
    const map = new Map();

    completedDemons.forEach(demon => {
      map.set(normalizeName(demon.name), demon);
    });

    return map;
  }, [completedDemons]);

  return (
    <div className="progress-info-backdrop" onClick={onClose}>
      <section
        className="progress-info-modal milestones-modal"
        onClick={event => event.stopPropagation()}
      >
        <button
          className="progress-info-close"
          onClick={onClose}
          type="button"
          aria-label="Close milestones"
        >
          <X size={20} />
        </button>

        <div className="milestones-header">
          <span className="milestones-icon"><Award size={24} /></span>
          <div>
            <h2>Demon Milestones</h2>
            <p>{completedDemons.length} demons completed</p>
          </div>
        </div>

        <div className="milestones-sections">
          <section>
            <h3>Main checkpoints</h3>
            <ol className="milestone-list">
              {MILESTONES.map(item => (
                <MilestoneRow
                  key={item.ordinal}
                  item={item}
                  demonByName={demonByName}
                  completedCount={completedDemons.length}
                />
              ))}
            </ol>
          </section>

          <section>
            <h3>Honorable mentions</h3>
            <ol className="milestone-list honorable-list">
              {HONORABLE_MENTIONS.map(item => (
                <MilestoneRow
                  key={item.ordinal}
                  item={item}
                  demonByName={demonByName}
                  completedCount={completedDemons.length}
                />
              ))}
            </ol>
          </section>
        </div>
      </section>
    </div>
  );
}
