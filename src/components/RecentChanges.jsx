import React, { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, RefreshCw, Sparkles } from "lucide-react";

const FILTERS = [{ id: "all", label: "All" }, { id: "new", label: "New Demons" }, { id: "refresh", label: "List Updates" }];

function parseDate(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? null : date; }
function dayKey(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function placement(value) { const match = String(value || "").match(/\d+/); return match ? Number(match[0]) : 0; }
function formatPlacement(value) { const number = placement(value); return number ? `#${number}` : String(value || ""); }
function formatEventDate(value) { const date = parseDate(value); return date ? date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "Unknown date"; }
function formatEventTime(value) { const date = parseDate(value); return date ? date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : ""; }

function buildEvents(changes) {
  const groups = new Map();
  changes.forEach((change, index) => {
    const date = parseDate(change.timestamp);
    if (!date) return;
    const key = String(change.timestamp || `${date.toISOString()}-${index}`);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(change);
  });
  return [...groups.entries()].map(([timestamp, items]) => ({
    id: timestamp, timestamp, date: parseDate(timestamp), day: dayKey(parseDate(timestamp)),
    kind: items.some(item => String(item.type || "").toUpperCase() === "NEW ENTRY") ? "new" : "refresh", items
  })).sort((a, b) => b.date - a.date);
}

function naturalJoin(names) {
  if (names.length < 2) return names[0] || "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function additionSummary(additions, items) {
  const addedPlacements = additions.map(item => placement(item.newPlacement)).filter(Boolean);
  const placements = additions.map(item => {
    const position = formatPlacement(item.newPlacement);
    const below = String(item.below || "").trim();
    return `${item.demon || "A new demon"} has been placed at ${position}${below ? `, above ${below}` : ""}`;
  });
  const consequences = items.filter(item => String(item.type || "").toUpperCase() === "IMPACT").flatMap(item => {
    const names = String(item.message || "").split(":").slice(1).join(":").trim().replace(/\.$/, "");
    if (!names) return [];
    if (/legacy/i.test(`${item.demon} ${item.message}`)) {
      return addedPlacements.some(value => value <= 200) ? [`${names} into the legacy list`] : [];
    }
    const topMatch = String(item.demon || item.message || "").match(/Top\s+(\d+)/i);
    return topMatch && addedPlacements.some(value => value <= Number(topMatch[1]))
      ? [`${names} out of the Top ${topMatch[1]}`]
      : [];
  });
  return `${naturalJoin(placements)}${consequences.length ? `, pushing ${naturalJoin(consequences)}` : ""}.`;
}

function ChangeEvent({ event }) {
  const additions = event.items.filter(item => String(item.type || "").toUpperCase() === "NEW ENTRY");
  const isNew = event.kind === "new";
  return (
    <article className={`change-event ${event.kind}`}>
      <div className="change-event-icon" aria-hidden="true">{isNew ? <Sparkles size={20} /> : <RefreshCw size={20} />}</div>
      <div className="change-event-content">
        <div className="change-event-heading">
          <div><span>{isNew ? "New demons" : "List update"}</span><h3>{isNew ? `${additions.length} ${additions.length === 1 ? "demon has" : "demons have"} been added` : "The List has been refreshed"}</h3></div>
          <time>{formatEventTime(event.timestamp)}</time>
        </div>
        {isNew && <p className="change-addition-summary">{additionSummary(additions, event.items)}</p>}
      </div>
    </article>
  );
}

export function RecentChanges({ changes, loading, error, onBack }) {
  void onBack;
  const events = useMemo(() => buildEvents(changes), [changes]);
  const days = useMemo(() => [...new Set(events.map(event => event.day))], [events]);
  const [selectedDay, setSelectedDay] = useState("");
  const [filter, setFilter] = useState("all");
  const activeDay = days.includes(selectedDay) ? selectedDay : days[0] || "";
  const activeDayIndex = days.indexOf(activeDay);
  const dayEvents = events.filter(event => event.day === activeDay && (filter === "all" || event.kind === filter));

  if (loading) return <section className="panel recent-panel changes-feed-panel"><div className="request-loading"><span className="loading-dot" />Loading recent changes...</div></section>;
  if (error) return <section className="panel recent-panel changes-feed-panel"><p className="admin-error">{error}</p></section>;
  if (!events.length) return <section className="panel recent-panel changes-feed-panel"><div className="request-empty"><strong>No recent changes found.</strong><span>History entries will appear here after list updates.</span></div></section>;

  return (
    <section className="panel recent-panel changes-feed-panel">
      <div className="changes-feed-toolbar">
        <label><span>Browse history</span><select value={activeDay} onChange={event => setSelectedDay(event.target.value)}>{days.map(value => <option value={value} key={value}>{formatEventDate(value)}</option>)}</select></label>
        <div className="changes-day-nav">
          <button type="button" aria-label="Newer date" disabled={activeDayIndex <= 0} onClick={() => setSelectedDay(days[activeDayIndex - 1])}><ChevronLeft size={18} /></button>
          <button type="button" aria-label="Older date" disabled={activeDayIndex < 0 || activeDayIndex >= days.length - 1} onClick={() => setSelectedDay(days[activeDayIndex + 1])}><ChevronRight size={18} /></button>
        </div>
      </div>
      <div className="changes-date-heading"><CalendarDays size={20} /><div><span>Selected date</span><h2>{formatEventDate(activeDay)}</h2></div></div>
      <div className="changes-filter-tabs">{FILTERS.map(item => <button className={filter === item.id ? "active" : ""} type="button" onClick={() => setFilter(item.id)} key={item.id}>{item.label}</button>)}</div>
      <div className="changes-event-list">{dayEvents.length ? dayEvents.map(event => <ChangeEvent event={event} key={event.id} />) : <div className="timeline-empty">No changes in this category on this date.</div>}</div>
    </section>
  );
}
