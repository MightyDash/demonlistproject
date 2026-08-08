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

const CHANGE_YEARS = Array.from({ length: 9 }, (_, index) => 2026 - index);

const CATEGORY_CONFIG = {
  newPlacements: {
    title: "New Placements",
    emptyText: "No new placements on this day.",
    viewAllText: "View all new placements"
  },
  drops: {
    title: "Drops",
    emptyText: "No drops on this day.",
    viewAllText: "View all drops"
  },
  climbers: {
    title: "Climbers",
    emptyText: "No climbers on this day.",
    viewAllText: "View all climbers"
  },
  other: {
    title: "Other",
    emptyText: "No other updates on this day.",
    viewAllText: "View all other updates"
  }
};

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
    if (year < 2018 || year > 2026) return;

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

function ChangeCard({ change }) {
  return (
    <article className="calendar-change-card">
      <div className="calendar-change-card-top">
        <strong>{change.demon || "Update"}</strong>
        {change.newPlacement && <span>{change.newPlacement}</span>}
      </div>
      {change.message && <p>{change.message}</p>}

      {(change.oldPlacement || change.newPlacement || movementAmount(change) > 0) && (
        <div className="calendar-change-meta">
          {change.oldPlacement && <span>Old: {change.oldPlacement}</span>}
          {change.newPlacement && <span>New: {change.newPlacement}</span>}
          {movementAmount(change) > 0 && <span>{movementAmount(change)} places</span>}
        </div>
      )}
    </article>
  );
}

function ChangePreview({ category, changes, onViewAll }) {
  const config = CATEGORY_CONFIG[category];
  const previewChanges = changes.slice(0, 3);

  return (
    <section className={`calendar-change-section ${category}`}>
      <div className="calendar-section-header">
        <h3>{config.title}</h3>
        <span>{changes.length}</span>
      </div>

      {changes.length === 0 ? (
        <p className="calendar-empty-line">{config.emptyText}</p>
      ) : (
        <>
          <div className="calendar-change-list preview-list">
            {previewChanges.map((change, index) => (
              <div key={`${category}-${change.timestamp}-${change.demon}-${index}`}>
                <ChangeCard change={change} />
              </div>
            ))}
          </div>
          <button className="calendar-view-all" onClick={() => onViewAll(category)} type="button">
            {config.viewAllText}
          </button>
        </>
      )}
    </section>
  );
}

function ChangeCategoryPage({ category, changes, activeDay, onBack }) {
  const config = CATEGORY_CONFIG[category];

  return (
    <section className="calendar-category-page">
      <div className="calendar-category-header">
        <button className="timeline-back-link" onClick={onBack} type="button">
          Back to selected day
        </button>
        <div>
          <p className="eyebrow">{formatDayTitle(activeDay)}</p>
          <h2>{config.title}</h2>
          <p>{changes.length} {changes.length === 1 ? "change" : "changes"}</p>
        </div>
      </div>

      {changes.length === 0 ? (
        <div className="timeline-empty">{config.emptyText}</div>
      ) : (
        <div className="calendar-category-grid">
          {changes.map((change, index) => (
            <div key={`${category}-full-${change.timestamp}-${change.demon}-${index}`}>
              <ChangeCard change={change} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function RecentChanges({ changes, loading, error, onBack }) {
  void onBack;
  const calendar = useMemo(() => buildCalendar(changes), [changes]);
  const dataYears = useMemo(
    () => Object.keys(calendar).map(Number).sort((a, b) => b - a),
    [calendar]
  );

  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [categoryPage, setCategoryPage] = useState(null);

  const fallbackYear = dataYears.find(year => CHANGE_YEARS.includes(year)) || 2026;
  const activeYear = selectedYear ?? fallbackYear;
  const monthsWithChanges = Object.keys(calendar[activeYear] || {}).map(Number).sort((a, b) => a - b);
  const months = monthsWithChanges.length > 0 ? monthsWithChanges : [0];
  const activeMonth = selectedMonth !== null && months.includes(selectedMonth)
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
  const totalChanges = groupedChanges.newPlacements.length + groupedChanges.drops.length + groupedChanges.climbers.length + groupedChanges.other.length;

  function selectYear(year) {
    setSelectedYear(year);
    setSelectedMonth(null);
    setSelectedDay(null);
    setCategoryPage(null);
  }

  function selectMonth(month) {
    setSelectedMonth(month);
    setSelectedDay(null);
    setCategoryPage(null);
  }

  if (loading) {
    return (
      <section className="panel recent-panel calendar-panel">
        <div className="request-loading">
          <span className="loading-dot" />
          Loading recent changes...
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="panel recent-panel calendar-panel">
        <p className="admin-error">{error}</p>
      </section>
    );
  }

  if (changes.length === 0) {
    return (
      <section className="panel recent-panel calendar-panel">
        <div className="request-empty">
          <strong>No recent changes found.</strong>
          <span>History entries will appear here after update runs.</span>
        </div>
      </section>
    );
  }

  if (categoryPage && activeDay) {
    return (
      <section className="panel recent-panel calendar-panel">
        <ChangeCategoryPage
          category={categoryPage}
          changes={groupedChanges[categoryPage] || []}
          activeDay={activeDay}
          onBack={() => setCategoryPage(null)}
        />
      </section>
    );
  }

  return (
    <section className="panel recent-panel calendar-panel">
      <div className="history-calendar">
        <aside className="calendar-year-rail">
          <span className="calendar-label">Year</span>
          <div className="calendar-year-number">{activeYear}</div>
          <div className="calendar-year-tabs">
            {CHANGE_YEARS.map(year => {
              const count = Object.values(calendar[year] || {})
                .flatMap(month => Object.values(month))
                .reduce((sum, dayChangesForYear) => sum + dayChangesForYear.length, 0);

              return (
                <button
                  key={year}
                  className={activeYear === year ? "active" : ""}
                  onClick={() => selectYear(year)}
                  type="button"
                >
                  <strong>{year}</strong>
                  <span>{count} changes</span>
                </button>
              );
            })}
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
                  onClick={() => {
                    setSelectedDay(dayKey);
                    setCategoryPage(null);
                  }}
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
                <div>
                  <span className="calendar-label">Selected day</span>
                  <h3>{formatDayTitle(activeDay)}</h3>
                </div>
                <div className="calendar-day-summary">
                  <span><strong>{totalChanges}</strong>Total changes</span>
                  <span><strong>{groupedChanges.drops.length}</strong>Drops</span>
                  <span><strong>{groupedChanges.climbers.length}</strong>Climbers</span>
                </div>
              </div>

              <div className="calendar-sections-grid">
                <ChangePreview
                  category="newPlacements"
                  changes={groupedChanges.newPlacements}
                  onViewAll={setCategoryPage}
                />
                <ChangePreview
                  category="drops"
                  changes={groupedChanges.drops}
                  onViewAll={setCategoryPage}
                />
                <ChangePreview
                  category="climbers"
                  changes={groupedChanges.climbers}
                  onViewAll={setCategoryPage}
                />
                {groupedChanges.other.length > 0 && (
                  <ChangePreview
                    category="other"
                    changes={groupedChanges.other}
                    onViewAll={setCategoryPage}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
