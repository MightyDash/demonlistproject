import React, { useMemo, useState } from "react";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

function parseChangeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dayKeyFromDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDayTitle(dayKey) {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function placementNumber(value) {
  const match = String(value || "").match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function movementAmount(change) {
  return Math.abs(placementNumber(change.oldPlacement) - placementNumber(change.newPlacement));
}

function normalizeType(type) {
  return String(type || "").trim().toUpperCase();
}

function buildCalendar(changes) {
  const calendar = {};

  changes.forEach(change => {
    const date = parseChangeDate(change.timestamp);
    if (!date) return;

    const year = date.getFullYear();
    const month = date.getMonth();
    const dayKey = dayKeyFromDate(date);

    if (!calendar[year]) calendar[year] = {};
    if (!calendar[year][month]) calendar[year][month] = {};
    if (!calendar[year][month][dayKey]) calendar[year][month][dayKey] = [];

    calendar[year][month][dayKey].push(change);
  });

  return calendar;
}

function buildMonthDayKeys(year, month) {
  if (year === undefined || month === undefined) return [];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = String(index + 1).padStart(2, "0");
    const monthNumber = String(month + 1).padStart(2, "0");
    return `${year}-${monthNumber}-${day}`;
  });
}

function splitDayChanges(changes) {
  const newPlacements = [];
  const drops = [];
  const climbers = [];
  const other = [];

  changes.forEach(change => {
    const type = normalizeType(change.type);

    if (type === "DROP") {
      drops.push(change);
      return;
    }

    if (type === "CLIMBER") {
      climbers.push(change);
      return;
    }

    if (["MOVE", "SWAP", "NEW ENTRY"].includes(type)) {
      newPlacements.push(change);
      return;
    }

    if (!["RUN HEADER", "SUMMARY"].includes(type)) {
      other.push(change);
    }
  });

  drops.sort((a, b) => movementAmount(b) - movementAmount(a));
  climbers.sort((a, b) => movementAmount(b) - movementAmount(a));

  return { newPlacements, drops, climbers, other };
}

function ChangeList({ title, changes, emptyText }) {
  return (
    <section className="calendar-change-section">
      <div className="calendar-section-header">
        <h3>{title}</h3>
        <span>{changes.length}</span>
      </div>

      {changes.length === 0 ? (
        <p className="calendar-empty-line">{emptyText}</p>
      ) : (
        <div className="calendar-change-list">
          {changes.map((change, index) => (
            <article className="calendar-change-card" key={`${title}-${change.timestamp}-${change.demon}-${index}`}>
              <strong>{change.demon || "Update"}</strong>
              {change.message && <p>{change.message}</p>}

              {(change.oldPlacement || change.newPlacement) && (
                <div className="calendar-change-meta">
                  {change.oldPlacement && <span>Old: {change.oldPlacement}</span>}
                  {change.newPlacement && <span>New: {change.newPlacement}</span>}
                  {movementAmount(change) > 0 && <span>{movementAmount(change)} places</span>}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function RecentChanges({ changes, loading, error, onBack }) {
  const calendar = useMemo(() => buildCalendar(changes), [changes]);
  const years = useMemo(
    () => Object.keys(calendar).map(Number).sort((a, b) => b - a),
    [calendar]
  );

  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);

  const activeYear = selectedYear && calendar[selectedYear] ? selectedYear : years[0];
  const months = activeYear
    ? Object.keys(calendar[activeYear] || {}).map(Number).sort((a, b) => a - b)
    : [];
  const activeMonth = selectedMonth !== null && calendar[activeYear]?.[selectedMonth]
    ? selectedMonth
    : months[months.length - 1];
  const changedDayKeys = activeYear !== undefined && activeMonth !== undefined
    ? Object.keys(calendar[activeYear]?.[activeMonth] || {}).sort((a, b) => a.localeCompare(b))
    : [];
  const dayKeys = buildMonthDayKeys(activeYear, activeMonth);
  const activeDay = selectedDay && dayKeys.includes(selectedDay)
    ? selectedDay
    : changedDayKeys[0] || dayKeys[0];
  const dayChanges = activeDay ? calendar[activeYear]?.[activeMonth]?.[activeDay] || [] : [];
  const groupedChanges = splitDayChanges(dayChanges);

  function selectYear(year) {
    setSelectedYear(year);
    setSelectedMonth(null);
    setSelectedDay(null);
  }

  function selectMonth(month) {
    setSelectedMonth(month);
    setSelectedDay(null);
  }

  return (
    <section className="panel recent-panel calendar-panel">
      <div className="admin-panel-header">
        <div>
          <p className="eyebrow">History</p>
          <h2>Recent Changes</h2>
          <p>Browse list history by year, month and day.</p>
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
        <div className="history-calendar">
          <aside className="calendar-year-rail">
            <span className="calendar-label">Year</span>
            <div className="calendar-year-number">{activeYear}</div>
            <div className="calendar-year-tabs">
              {years.map(year => (
                <button
                  key={year}
                  className={activeYear === year ? "active" : ""}
                  onClick={() => selectYear(year)}
                  type="button"
                >
                  {year}
                </button>
              ))}
            </div>
          </aside>

          <div className="calendar-main">
            <div className="calendar-month-tabs">
              {months.map(month => (
                <button
                  key={month}
                  className={activeMonth === month ? "active" : ""}
                  onClick={() => selectMonth(month)}
                  type="button"
                >
                  {MONTH_NAMES[month]}
                </button>
              ))}
            </div>

            <div className="calendar-day-tabs">
              {dayKeys.map(dayKey => {
                const dayNumber = Number(dayKey.split("-")[2]);
                const count = calendar[activeYear]?.[activeMonth]?.[dayKey]?.length || 0;

                return (
                  <button
                    key={dayKey}
                    className={`${activeDay === dayKey ? "active" : ""} ${count === 0 ? "empty" : ""}`}
                    onClick={() => setSelectedDay(dayKey)}
                    type="button"
                  >
                    <strong>{dayNumber}</strong>
                    <span>{count === 1 ? "1 change" : `${count} changes`}</span>
                  </button>
                );
              })}
            </div>

            {activeDay && (
              <div className="calendar-day-detail">
                <div className="calendar-day-title">
                  <span className="calendar-label">Selected day</span>
                  <h3>{formatDayTitle(activeDay)}</h3>
                </div>

                <div className="calendar-sections-grid">
                  <ChangeList
                    title="New Placements"
                    changes={groupedChanges.newPlacements}
                    emptyText="No new placements on this day."
                  />
                  <ChangeList
                    title="Drops"
                    changes={groupedChanges.drops}
                    emptyText="No drops on this day."
                  />
                  <ChangeList
                    title="Climbers"
                    changes={groupedChanges.climbers}
                    emptyText="No climbers on this day."
                  />
                  {groupedChanges.other.length > 0 && (
                    <ChangeList
                      title="Other"
                      changes={groupedChanges.other}
                      emptyText=""
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
