import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Play, Plus, Search, X } from "lucide-react";
import { comparePlacements, isInProgressDemon, parseDemonDate, placementSortValue } from "../demonUtils.js";

const MONTHS = [
  { name: "January", slug: "january" },
  { name: "February", slug: "february" },
  { name: "March", slug: "march" },
  { name: "April", slug: "april" },
  { name: "May", slug: "may" },
  { name: "June", slug: "june" },
  { name: "July", slug: "july" },
  { name: "August", slug: "august" },
  { name: "September", slug: "september" },
  { name: "October", slug: "october" },
  { name: "November", slug: "november" },
  { name: "December", slug: "december" }
];

const HARDEST_MONTH_HIGHLIGHTS = {
  "2023-september": "acu",
  "2024-april": "icdx",
  "2025-october": "make-it-drop",
  "2026-march": "bloodbath"
};

const TIMELINE_START_YEAR = 2018;
const DIFFICULTY_FACE_BY_NAME = {
  "easy demon": "/difficulties/easy_demon.png",
  "medium demon": "/difficulties/medium_demon.png",
  "hard demon": "/difficulties/hard_demon.png",
  "insane demon": "/difficulties/insane_demon.png",
  "extreme demon": "/difficulties/extreme_demon.png"
};

function parseTimelineDate(demon) {
  const parsedDate = parseDemonDate(demon?.date);

  if (parsedDate && !parsedDate.yearOnly && parsedDate.month && parsedDate.day) {
    return {
      year: parsedDate.year,
      month: MONTHS[parsedDate.month - 1].slug,
      day: parsedDate.day,
      exact: true,
      source: "date",
      sortValue: parsedDate.timestamp
    };
  }

  const year = Number(parsedDate?.year || demon?.dateYear || demon?.year || 0);

  if (year >= 2013 && year <= 2100) {
    return {
      year,
      month: null,
      day: null,
      exact: false,
      source: "year",
      sortValue: new Date(year, 0, 1).getTime()
    };
  }

  return null;
}

function pluralizeDemons(count) {
  return `${count} ${count === 1 ? "demon" : "demons"}`;
}

function getHardestMonthHighlight(year, monthSlug) {
  return HARDEST_MONTH_HIGHLIGHTS[`${year}-${monthSlug}`] || "";
}

function getDifficultyFace(difficulty) {
  const normalizedDifficulty = String(difficulty || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  return DIFFICULTY_FACE_BY_NAME[normalizedDifficulty] || "";
}

function getAdjacentTimelineMonth(timeline, activeYear, activeMonthSlug, direction) {
  const months = timeline.flatMap(yearData =>
    yearData.months.map(month => ({
      year: yearData.year,
      slug: month.slug,
      name: month.name
    }))
  );
  const activeIndex = months.findIndex(month => month.year === activeYear && month.slug === activeMonthSlug);

  if (activeIndex === -1) return null;

  return months[activeIndex + direction] || null;
}

function getMonthlyRecapUrl(monthlyRecaps, year, monthSlug) {
  const recap = monthlyRecaps.find(item =>
    Number(item.year) === Number(year) &&
    String(item.month || "").trim().toLowerCase() === String(monthSlug || "").trim().toLowerCase() &&
    String(item.url || "").trim()
  );

  return recap ? String(recap.url || "").trim() : "";
}

function buildTimelineData(demons, timelineEntries) {
  const completed = demons.filter(demon => !isInProgressDemon(demon));
  const demonById = new Map(completed.map(demon => [String(demon.id), demon]));
  const yearMap = new Map();

  function ensureYear(year) {
    if (!yearMap.has(year)) {
      yearMap.set(year, {
        year,
        demons: [],
        exactDemons: [],
        months: MONTHS.map(month => ({ ...month, demons: [] }))
      });
    }

    return yearMap.get(year);
  }

  ensureYear(TIMELINE_START_YEAR);

  completed.forEach(demon => {
    const date = parseTimelineDate(demon);
    if (!date) return;

    const yearBucket = ensureYear(date.year);
    const item = { demon, date, manual: false };
    yearBucket.demons.push(item);

    if (date.exact && date.month) {
      yearBucket.exactDemons.push(item);
      yearBucket.months.find(month => month.slug === date.month)?.demons.push(item);
    }
  });

  timelineEntries.forEach(entry => {
    const year = Number(entry.year || 0);
    const monthSlug = String(entry.month || "").trim().toLowerCase();
    const levelId = String(entry.levelId || "").trim();
    const demon = demonById.get(levelId);
    const monthIndex = MONTHS.findIndex(month => month.slug === monthSlug);

    if (!demon || !year || monthIndex === -1) return;

    const yearBucket = ensureYear(year);
    const alreadyInMonth = yearBucket.months[monthIndex].demons.some(item => String(item.demon.id) === levelId);
    if (alreadyInMonth) return;

    const item = {
      demon,
      manual: true,
      date: {
        year,
        month: monthSlug,
        exact: true,
        source: "manual",
        sortValue: placementSortValue(demon.placement)
      }
    };

    yearBucket.exactDemons.push(item);
    yearBucket.months[monthIndex].demons.push(item);
  });

  return Array.from(yearMap.values())
    .sort((a, b) => a.year - b.year)
    .map(yearBucket => {
      yearBucket.demons.sort((a, b) => comparePlacements(a.demon.placement, b.demon.placement));
      yearBucket.exactDemons.sort((a, b) => a.date.sortValue - b.date.sortValue);
      yearBucket.months.forEach(month => {
        month.demons.sort((a, b) => a.date.sortValue - b.date.sortValue);
      });

      return {
        ...yearBucket
      };
    });
}

function TimelineDemonCard({ demon, canRemove, onSelectDemon, onRemove, key: _key }) {
  const difficultyFace = getDifficultyFace(demon?.difficulty);

  return (
    <button
      className="timeline-demon-card"
      onClick={() => onSelectDemon(demon)}
      type="button"
    >
      {canRemove && (
        <span
          className="timeline-remove-demon"
          onClick={event => {
            event.stopPropagation();
            onRemove(demon);
          }}
          role="button"
          tabIndex={0}
          aria-label={`Remove ${demon.name} from timeline month`}
        >
          <X size={15} />
        </span>
      )}
      {demon.thumbnail && (
        <img src={demon.thumbnail} alt="" loading="lazy" />
      )}
      {difficultyFace && (
        <span className="timeline-difficulty-face" aria-label={demon.difficulty}>
          <img src={difficultyFace} alt="" loading="lazy" />
        </span>
      )}
      <span className="timeline-demon-title">{demon.name || "Unknown demon"}</span>
    </button>
  );
}

function TimelineAddPopover({ demons, existingIds, year, month, onAddTimelineEntry }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [savingId, setSavingId] = useState("");
  const [message, setMessage] = useState("");

  const suggestions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return [];

    return demons
      .filter(demon => !isInProgressDemon(demon))
      .filter(demon => !existingIds.has(String(demon.id)))
      .filter(demon => {
        const name = String(demon.name || "").toLowerCase();
        const id = String(demon.id || "").toLowerCase();
        return name.includes(normalizedQuery) || id.includes(normalizedQuery);
      })
      .slice(0, 7);
  }, [demons, existingIds, query]);

  async function handleAdd(demon) {
    setSavingId(String(demon.id));
    setMessage("");

    const result = await onAddTimelineEntry({
      year,
      month,
      levelId: demon.id
    });

    setSavingId("");

    if (!result.success) {
      setMessage(result.message || "Could not add demon.");
      return;
    }

    setQuery("");
    setOpen(false);
  }

  return (
    <div className="timeline-add-tool">
      <button
        className="timeline-add-button"
        onClick={() => {
          setOpen(value => !value);
          setMessage("");
        }}
        type="button"
        aria-label="Add demon to timeline month"
      >
        <Plus size={20} />
      </button>

      {open && (
        <div className="timeline-add-popover">
          <label className="timeline-search-box">
            <Search size={17} />
            <input
              autoFocus
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search demon or ID..."
            />
          </label>

          <div className="timeline-suggestions">
            {suggestions.length > 0 ? (
              suggestions.map(demon => (
                <button
                  key={demon.id || demon.name}
                  onClick={() => handleAdd(demon)}
                  disabled={savingId === String(demon.id)}
                  type="button"
                >
                  <strong>{demon.name}</strong>
                  <span>{demon.placement || demon.id}</span>
                </button>
              ))
            ) : (
              <p>{query.trim() ? "No matching demon found." : "Start typing to find a demon."}</p>
            )}
          </div>

          {message && <p className="timeline-tool-message">{message}</p>}
        </div>
      )}
    </div>
  );
}

export function TimelinePage({
  demons,
  timelineEntries = [],
  monthlyRecaps = [],
  routeYear,
  routeMonth,
  isAdmin,
  onSelectDemon,
  onOpenMonth,
  onBackToTimeline,
  onAddTimelineEntry,
  onRemoveTimelineEntry
}) {
  const timeline = useMemo(
    () => buildTimelineData(demons, timelineEntries),
    [demons, timelineEntries]
  );
  const defaultYear = timeline[timeline.length - 1]?.year || null;
  const [selectedYear, setSelectedYear] = useState(defaultYear);
  const activeYear = routeYear || selectedYear || defaultYear;
  const selectedYearData = timeline.find(item => item.year === activeYear) || timeline[timeline.length - 1] || null;
  const selectedMonthData = selectedYearData?.months.find(month => month.slug === routeMonth) || null;
  const isMonthPage = Boolean(routeYear && routeMonth && selectedMonthData);
  const previousMonth = selectedYearData && selectedMonthData
    ? getAdjacentTimelineMonth(timeline, selectedYearData.year, selectedMonthData.slug, -1)
    : null;
  const nextMonth = selectedYearData && selectedMonthData
    ? getAdjacentTimelineMonth(timeline, selectedYearData.year, selectedMonthData.slug, 1)
    : null;

  useEffect(() => {
    if (!isMonthPage || !onOpenMonth) return undefined;

    function handleMonthArrowKeys(event) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;

      const target = event.target;
      const tagName = target?.tagName?.toLowerCase();
      if (target?.isContentEditable || tagName === "input" || tagName === "select" || tagName === "textarea") {
        return;
      }

      if (event.key === "ArrowLeft" && previousMonth) {
        event.preventDefault();
        onOpenMonth(previousMonth.year, previousMonth.slug);
      }

      if (event.key === "ArrowRight" && nextMonth) {
        event.preventDefault();
        onOpenMonth(nextMonth.year, nextMonth.slug);
      }
    }

    window.addEventListener("keydown", handleMonthArrowKeys);
    return () => window.removeEventListener("keydown", handleMonthArrowKeys);
  }, [
    isMonthPage,
    nextMonth?.slug,
    nextMonth?.year,
    onOpenMonth,
    previousMonth?.slug,
    previousMonth?.year
  ]);

  function handleSelectYear(year) {
    setSelectedYear(year);
  }

  async function handleRemoveFromMonth(demon) {
    if (!onRemoveTimelineEntry || !selectedYearData || !selectedMonthData) return;

    await onRemoveTimelineEntry({
      year: selectedYearData.year,
      month: selectedMonthData.slug,
      levelId: demon.id
    });
  }

  if (!selectedYearData) {
    return (
      <section className="timeline-page">
        <div className="timeline-header">
          <span className="timeline-icon"><CalendarDays size={24} /></span>
          <div>
            <h2>Completion Timeline</h2>
            <p>No timeline data found yet.</p>
          </div>
        </div>
      </section>
    );
  }

  if (isMonthPage) {
    const existingIds = new Set(selectedMonthData.demons.map(item => String(item.demon.id)));
    const recapUrl = getMonthlyRecapUrl(monthlyRecaps, selectedYearData.year, selectedMonthData.slug);

    return (
      <section className="timeline-page timeline-month-page">
        <div className="timeline-month-page-header">
          <button className="timeline-back-link" onClick={onBackToTimeline} type="button">
            Back to timeline
          </button>
          <div className="timeline-month-title-block">
            <p className="eyebrow">Completion Timeline</p>
            <div className="timeline-month-heading-row" aria-label="Month navigation">
              <button
                className="timeline-month-nav-button"
                type="button"
                onClick={() => previousMonth && onOpenMonth?.(previousMonth.year, previousMonth.slug)}
                disabled={!previousMonth || !onOpenMonth}
                aria-label={previousMonth ? `Go to ${previousMonth.name} ${previousMonth.year}` : "No previous month"}
              >
                <ChevronLeft size={34} />
              </button>
              <div className="timeline-month-title-copy">
                <h2>{selectedMonthData.name} {selectedYearData.year}</h2>
                <p>{pluralizeDemons(selectedMonthData.demons.length)} in this month</p>
              </div>
              <button
                className="timeline-month-nav-button"
                type="button"
                onClick={() => nextMonth && onOpenMonth?.(nextMonth.year, nextMonth.slug)}
                disabled={!nextMonth || !onOpenMonth}
                aria-label={nextMonth ? `Go to ${nextMonth.name} ${nextMonth.year}` : "No next month"}
              >
                <ChevronRight size={34} />
              </button>
            </div>
          </div>
          <div className="timeline-month-header-actions">
            {recapUrl && (
              <a
                className="timeline-recap-button"
                href={recapUrl}
                target="_blank"
                rel="noreferrer"
              >
                <Play size={18} fill="currentColor" />
                <span>Watch Recap</span>
              </a>
            )}
            {isAdmin && onAddTimelineEntry && (
              <TimelineAddPopover
                demons={demons}
                existingIds={existingIds}
                year={selectedYearData.year}
                month={selectedMonthData.slug}
                onAddTimelineEntry={onAddTimelineEntry}
              />
            )}
          </div>
        </div>

        {selectedMonthData.demons.length > 0 ? (
          <div className="timeline-demon-grid timeline-month-page-grid">
            {selectedMonthData.demons.map(({ demon }) => (
              <TimelineDemonCard
                demon={demon}
                key={`${demon.id || demon.name}-${demon.placement}`}
                canRemove={isAdmin}
                onSelectDemon={onSelectDemon}
                onRemove={handleRemoveFromMonth}
              />
            ))}
          </div>
        ) : (
          <div className="timeline-empty">No demons in this month yet.</div>
        )}
      </section>
    );
  }

  return (
    <section className="timeline-page">
      <div className="timeline-header">
        <span className="timeline-icon"><CalendarDays size={24} /></span>
        <div>
          <h2>Completion Timeline</h2>
          <p>{pluralizeDemons(timeline.reduce((sum, year) => sum + year.demons.length, 0))} with known years</p>
        </div>
      </div>

      <div className="timeline-years" aria-label="Completion years">
        {timeline.map((yearData, index) => (
          <button
            className={`timeline-year-node ${yearData.year === selectedYearData.year ? "active" : ""} ${index % 2 ? "summary-below" : ""}`}
            key={yearData.year}
            onClick={() => handleSelectYear(yearData.year)}
            type="button"
          >
            <span className="timeline-year-summary">
              <strong>{pluralizeDemons(yearData.demons.length)}</strong>
              <small>completed in {yearData.year}</small>
            </span>
            <span className="timeline-year-line" />
            <span className="timeline-year-circle">{yearData.year}</span>
          </button>
        ))}
      </div>

      <div className="timeline-detail-header">
        <div>
          <h3>{selectedYearData.year}</h3>
          <p>{pluralizeDemons(selectedYearData.demons.length)} completed, {pluralizeDemons(selectedYearData.exactDemons.length)} placed in months</p>
        </div>
      </div>

      <div className="timeline-month-grid">
        {selectedYearData.months.map(month => {
          const highlight = getHardestMonthHighlight(selectedYearData.year, month.slug);

          return (
            <button
              className={`timeline-month-card ${highlight ? `hardest-month ${highlight}` : ""}`}
              key={month.slug}
              onClick={() => onOpenMonth(selectedYearData.year, month.slug)}
              type="button"
            >
              <span>{month.name}</span>
              <strong>{month.demons.length}</strong>
              <small>{pluralizeDemons(month.demons.length)}</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}
