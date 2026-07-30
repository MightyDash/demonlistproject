import React, { useMemo, useState } from "react";
import { CalendarDays, Plus, Search, X } from "lucide-react";
import { isInProgressDemon, placementNumber } from "../demonUtils.js";

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

function parseTimelineDate(demon) {
  const dateText = String(demon?.date || "").trim();
  const exactMatch = dateText.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (exactMatch) {
    const day = Number(exactMatch[1]);
    const month = Number(exactMatch[2]);
    const year = Number(exactMatch[3]);

    if (year >= 2013 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return {
        year,
        month: MONTHS[month - 1].slug,
        day,
        exact: true,
        source: "date",
        sortValue: new Date(year, month - 1, day).getTime()
      };
    }
  }

  const year = Number(demon?.dateYear || demon?.year || 0);

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
        sortValue: placementNumber(demon.placement)
      }
    };

    yearBucket.exactDemons.push(item);
    yearBucket.months[monthIndex].demons.push(item);
  });

  return Array.from(yearMap.values())
    .sort((a, b) => a.year - b.year)
    .map((yearBucket, index, buckets) => {
      const cumulative = buckets
        .slice(0, index + 1)
        .reduce((sum, bucket) => sum + bucket.demons.length, 0);

      yearBucket.demons.sort((a, b) => placementNumber(a.demon.placement) - placementNumber(b.demon.placement));
      yearBucket.exactDemons.sort((a, b) => a.date.sortValue - b.date.sortValue);
      yearBucket.months.forEach(month => {
        month.demons.sort((a, b) => a.date.sortValue - b.date.sortValue);
      });

      return {
        ...yearBucket,
        cumulative
      };
    });
}

function TimelineDemonCard({ demon, canRemove, onSelectDemon, onRemove }) {
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

    return (
      <section className="timeline-page timeline-month-page">
        <div className="timeline-month-page-header">
          <button className="timeline-back-link" onClick={onBackToTimeline} type="button">
            Back to timeline
          </button>
          <div>
            <p className="eyebrow">Completion Timeline</p>
            <h2>{selectedMonthData.name} {selectedYearData.year}</h2>
            <p>{pluralizeDemons(selectedMonthData.demons.length)} in this month</p>
          </div>
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
              <strong>{pluralizeDemons(yearData.cumulative)}</strong>
              <small>completed through {yearData.year}</small>
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
        {selectedYearData.months.map(month => (
          <button
            className="timeline-month-card"
            key={month.slug}
            onClick={() => onOpenMonth(selectedYearData.year, month.slug)}
            type="button"
          >
            <span>{month.name}</span>
            <strong>{month.demons.length}</strong>
            <small>{pluralizeDemons(month.demons.length)}</small>
          </button>
        ))}
      </div>
    </section>
  );
}
