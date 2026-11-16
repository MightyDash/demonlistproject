import React, { useMemo } from "react";
import { ArrowRight, CalendarDays, Layers } from "lucide-react";
import { isInProgressDemon } from "../demonUtils.js";

function amsterdamDateKey() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function hashDateKey(value) {
  return Array.from(value).reduce((hash, character) => ((hash * 31) + character.charCodeAt(0)) >>> 0, 0);
}

export function CollectionsPage({ demons, onSelectDemon }) {
  const demonOfTheDay = useMemo(() => {
    const completed = demons
      .filter(demon => !isInProgressDemon(demon))
      .sort((first, second) => String(first.id || first.name).localeCompare(String(second.id || second.name)));
    if (!completed.length) return null;
    return completed[hashDateKey(amsterdamDateKey()) % completed.length];
  }, [demons]);

  return (
    <main className="collections-page">
      <section className="demon-of-the-day" aria-labelledby="demon-of-the-day-title">
        {demonOfTheDay?.thumbnail && <img src={demonOfTheDay.thumbnail} alt="" />}
        <div className="demon-of-the-day-shade" />
        <div className="demon-of-the-day-content">
          <p><CalendarDays size={17} /> Demon of the day</p>
          {demonOfTheDay ? (
            <>
              <h1 id="demon-of-the-day-title">{demonOfTheDay.name}</h1>
              <span>by {demonOfTheDay.creator || "Unknown"}</span>
              <div className="demon-of-the-day-meta">
                <b>{demonOfTheDay.difficulty || "Demon"}</b>
                <span>{Number(demonOfTheDay.attempts || 0).toLocaleString("en-US")} attempts</span>
                {demonOfTheDay.date && <span>Completed {demonOfTheDay.date}</span>}
              </div>
              <button type="button" onClick={() => onSelectDemon(demonOfTheDay)}>
                View demon <ArrowRight size={18} />
              </button>
            </>
          ) : (
            <h1 id="demon-of-the-day-title">Loading today&apos;s demon…</h1>
          )}
        </div>
      </section>

      <section className="packs-browser" aria-labelledby="packs-browser-title">
        <div className="packs-browser-heading">
          <h2 id="packs-browser-title">Browse Packs</h2>
        </div>
        <div className="packs-empty-state">
          <Layers size={28} />
          <p>No packs have been added yet.</p>
        </div>
      </section>
    </main>
  );
}
