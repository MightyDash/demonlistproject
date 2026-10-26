import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, CalendarDays, ChevronLeft, ChevronRight, Crown, Play, Plus, Search, X } from "lucide-react";
import { comparePlacements, isInProgressDemon, parseDemonDate, placementSortValue } from "../demonUtils.js";
import { findMonthlyHighlightStyle, getHardestMonthlyDemon, monthlyHighlightTextStyle } from "../monthlyHighlightUtils.js";

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

const COMPARISON_DIFFICULTIES = [
  { key: "easy", label: "Easy Demon" },
  { key: "medium", label: "Medium Demon" },
  { key: "hard", label: "Hard Demon" },
  { key: "insane", label: "Insane Demon" },
  { key: "extreme", label: "Extreme Demon" }
];

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

function formatComparisonNumber(value, decimals = 0) {
  const number = Number(value || 0);
  return number.toLocaleString("nl-NL", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function buildYearComparisonStats(yearData) {
  const demons = (yearData?.demons || []).map(item => item.demon);
  const tieredDemons = demons.filter(demon => Number(demon.tier) > 0);
  const hardestDemon = getHardestMonthlyDemon(demons);
  const busiestMonth = (yearData?.months || []).reduce((busiest, month) => {
    if (!busiest || month.demons.length > busiest.demons.length) return month;
    return busiest;
  }, null);
  const difficultyCounts = COMPARISON_DIFFICULTIES.reduce((counts, difficulty) => {
    counts[difficulty.key] = demons.filter(demon =>
      String(demon.difficulty || "").trim().toLowerCase() === difficulty.label.toLowerCase()
    ).length;
    return counts;
  }, {});

  return {
    totalDemons: demons.length,
    totalAttempts: demons.reduce((total, demon) => total + Number(demon.attempts || 0), 0),
    hardestDemon,
    hardestTier: Number(hardestDemon?.tier || 0),
    busiestMonth,
    extremeDemons: difficultyCounts.extreme || 0,
    averageTier: tieredDemons.length
      ? tieredDemons.reduce((total, demon) => total + Number(demon.tier), 0) / tieredDemons.length
      : 0,
    difficultyCounts
  };
}

function comparisonWinnerClass(leftValue, rightValue, side) {
  if (Number(leftValue) === Number(rightValue)) return "";
  const leftWins = Number(leftValue) > Number(rightValue);
  return (side === "left" && leftWins) || (side === "right" && !leftWins)
    ? "comparison-winner"
    : "";
}

function TimelineYearComparison({ timeline, preferredYear, onBack }) {
  const availableYears = timeline.filter(yearData => yearData.demons.length > 0);
  const matchedPreferredIndex = availableYears.findIndex(yearData => yearData.year === preferredYear);
  const preferredIndex = matchedPreferredIndex >= 0 ? matchedPreferredIndex : Math.max(0, availableYears.length - 1);
  const defaultRightYear = availableYears[preferredIndex]?.year || availableYears.at(-1)?.year || null;
  const defaultLeftYear = availableYears[Math.max(0, preferredIndex - 1)]?.year || defaultRightYear;
  const [leftYear, setLeftYear] = useState(defaultLeftYear);
  const [rightYear, setRightYear] = useState(defaultRightYear);

  useEffect(() => {
    if (!availableYears.length) return;
    if (!availableYears.some(yearData => yearData.year === leftYear)) {
      setLeftYear(availableYears[Math.max(0, availableYears.length - 2)].year);
    }
    if (!availableYears.some(yearData => yearData.year === rightYear)) {
      setRightYear(availableYears.at(-1).year);
    }
  }, [availableYears, leftYear, rightYear]);

  const leftData = availableYears.find(yearData => yearData.year === leftYear) || availableYears[0];
  const rightData = availableYears.find(yearData => yearData.year === rightYear) || availableYears.at(-1);
  const leftStats = buildYearComparisonStats(leftData);
  const rightStats = buildYearComparisonStats(rightData);

  if (!leftData || !rightData) {
    return <div className="timeline-empty">Not enough timeline data to compare years.</div>;
  }

  const statRows = [
    {
      label: "Total Demons",
      left: formatComparisonNumber(leftStats.totalDemons),
      right: formatComparisonNumber(rightStats.totalDemons),
      leftValue: leftStats.totalDemons,
      rightValue: rightStats.totalDemons
    },
    {
      label: "Total Attempts",
      left: formatComparisonNumber(leftStats.totalAttempts),
      right: formatComparisonNumber(rightStats.totalAttempts)
    },
    {
      label: "Hardest Demon",
      left: leftStats.hardestDemon?.name || "—",
      right: rightStats.hardestDemon?.name || "—",
      leftDetail: leftStats.hardestTier ? `Tier ${formatComparisonNumber(leftStats.hardestTier, 2)}` : "",
      rightDetail: rightStats.hardestTier ? `Tier ${formatComparisonNumber(rightStats.hardestTier, 2)}` : "",
      leftValue: leftStats.hardestTier,
      rightValue: rightStats.hardestTier
    },
    {
      label: "Busiest Month",
      left: leftStats.busiestMonth?.name || "—",
      right: rightStats.busiestMonth?.name || "—",
      leftDetail: pluralizeDemons(leftStats.busiestMonth?.demons.length || 0),
      rightDetail: pluralizeDemons(rightStats.busiestMonth?.demons.length || 0),
      leftValue: leftStats.busiestMonth?.demons.length || 0,
      rightValue: rightStats.busiestMonth?.demons.length || 0
    },
    {
      label: "Extreme Demons",
      left: formatComparisonNumber(leftStats.extremeDemons),
      right: formatComparisonNumber(rightStats.extremeDemons),
      leftValue: leftStats.extremeDemons,
      rightValue: rightStats.extremeDemons
    },
    {
      label: "Average Tier",
      left: formatComparisonNumber(leftStats.averageTier, 2),
      right: formatComparisonNumber(rightStats.averageTier, 2),
      leftValue: leftStats.averageTier,
      rightValue: rightStats.averageTier
    }
  ];

  return (
    <section className="timeline-page timeline-comparison-page">
      <div className="timeline-month-page-header timeline-year-overview-header">
        <button className="timeline-back-link" onClick={onBack} type="button">
          Back to timeline
        </button>
        <div className="timeline-month-title-block">
          <p className="eyebrow">Timeline</p>
          <div className="timeline-month-title-copy">
            <h2>Compare Years</h2>
            <p>See how your progress changed from one year to another.</p>
          </div>
        </div>
        <span aria-hidden="true" />
      </div>

      <div className="timeline-comparison-selectors">
        <label>
          <span>First year</span>
          <select value={leftData.year} onChange={event => setLeftYear(Number(event.target.value))}>
            {availableYears.map(yearData => <option key={yearData.year} value={yearData.year}>{yearData.year}</option>)}
          </select>
        </label>
        <ArrowLeftRight aria-hidden="true" />
        <label>
          <span>Second year</span>
          <select value={rightData.year} onChange={event => setRightYear(Number(event.target.value))}>
            {availableYears.map(yearData => <option key={yearData.year} value={yearData.year}>{yearData.year}</option>)}
          </select>
        </label>
      </div>

      <div className="timeline-comparison-scorecard">
        <div className="timeline-comparison-score-heading">
          <strong>{leftData.year}</strong>
          <span>Comparison</span>
          <strong>{rightData.year}</strong>
        </div>
        {statRows.map(row => (
          <div className="timeline-comparison-stat-row" key={row.label}>
            <div className={row.leftValue === undefined ? "" : comparisonWinnerClass(row.leftValue, row.rightValue, "left")}>
              <strong>{row.left}</strong>
              {row.leftDetail && <small>{row.leftDetail}</small>}
            </div>
            <span>{row.label}</span>
            <div className={row.rightValue === undefined ? "" : comparisonWinnerClass(row.leftValue, row.rightValue, "right")}>
              <strong>{row.right}</strong>
              {row.rightDetail && <small>{row.rightDetail}</small>}
            </div>
          </div>
        ))}
      </div>

      <div className="timeline-comparison-panels">
        <section className="timeline-comparison-panel">
          <div className="timeline-comparison-panel-heading">
            <div>
              <p className="eyebrow">Difficulty</p>
              <h3>Difficulty distribution</h3>
            </div>
          </div>
          <div className="timeline-difficulty-legend">
            {COMPARISON_DIFFICULTIES.map(difficulty => (
              <span className={`difficulty-${difficulty.key}`} key={difficulty.key}>{difficulty.label.replace(" Demon", "")}</span>
            ))}
          </div>
          {[{ data: leftData, stats: leftStats }, { data: rightData, stats: rightStats }].map(entry => (
            <div className="timeline-difficulty-row" key={entry.data.year}>
              <strong>{entry.data.year}</strong>
              <div className="timeline-difficulty-bar">
                {COMPARISON_DIFFICULTIES.map(difficulty => {
                  const count = entry.stats.difficultyCounts[difficulty.key] || 0;
                  return count > 0 ? (
                    <span
                      className={`difficulty-${difficulty.key}`}
                      key={difficulty.key}
                      style={{ flexGrow: count }}
                      title={`${difficulty.label}: ${count}`}
                    />
                  ) : null;
                })}
              </div>
            </div>
          ))}
        </section>

        <section className="timeline-comparison-panel timeline-month-comparison-panel">
          <div className="timeline-comparison-panel-heading">
            <div>
              <p className="eyebrow">Monthly pace</p>
              <h3>Demons per month</h3>
            </div>
          </div>
          <div className="timeline-month-comparison-heading">
            <strong>{leftData.year}</strong>
            <span>Month</span>
            <strong>{rightData.year}</strong>
          </div>
          {MONTHS.map((month, index) => {
            const leftCount = leftData.months[index]?.demons.length || 0;
            const rightCount = rightData.months[index]?.demons.length || 0;
            return (
              <div className="timeline-month-comparison-row" key={month.slug}>
                <strong className={comparisonWinnerClass(leftCount, rightCount, "left")}>{leftCount}</strong>
                <span>{month.name}</span>
                <strong className={comparisonWinnerClass(leftCount, rightCount, "right")}>{rightCount}</strong>
              </div>
            );
          })}
        </section>
      </div>
    </section>
  );
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
  monthlyHighlightStyles = [],
  routeYear,
  routeMonth,
  routeOverview = false,
  routeCompare = false,
  isAdmin,
  onSelectDemon,
  onOpenMonth,
  onOpenYearOverview,
  onOpenYearComparison,
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
  const [showEmptyMonths, setShowEmptyMonths] = useState(false);
  const activeYear = routeYear || selectedYear || defaultYear;
  const selectedYearData = timeline.find(item => item.year === activeYear) || timeline[timeline.length - 1] || null;
  const selectedMonthData = selectedYearData?.months.find(month => month.slug === routeMonth) || null;
  const isMonthPage = Boolean(routeYear && routeMonth && selectedMonthData);
  const isYearOverviewPage = Boolean(routeYear && routeOverview && selectedYearData);
  const yearOverviewDemons = selectedYearData
    ? selectedYearData.months
      .flatMap(month => month.demons)
      .sort((a, b) => {
        const tierDifference = Number(b.demon.tier || 0) - Number(a.demon.tier || 0);
        if (tierDifference !== 0) return tierDifference;
        return comparePlacements(a.demon.placement, b.demon.placement);
      })
    : [];
  const previousMonth = selectedYearData && selectedMonthData
    ? getAdjacentTimelineMonth(timeline, selectedYearData.year, selectedMonthData.slug, -1)
    : null;
  const nextMonth = selectedYearData && selectedMonthData
    ? getAdjacentTimelineMonth(timeline, selectedYearData.year, selectedMonthData.slug, 1)
    : null;
  const selectedYearIndex = timeline.findIndex(item => item.year === selectedYearData?.year);
  const previousYear = selectedYearIndex > 0 ? timeline[selectedYearIndex - 1] : null;
  const nextYear = selectedYearIndex >= 0 && selectedYearIndex < timeline.length - 1 ? timeline[selectedYearIndex + 1] : null;
  const activeMonths = selectedYearData?.months.filter(month => month.demons.length > 0) || [];
  const busiestMonth = activeMonths.reduce((best, month) => !best || month.demons.length > best.demons.length ? month : best, null);
  const hardestYearDemon = getHardestMonthlyDemon((selectedYearData?.demons || []).map(item => item.demon));
  const longestActiveStreak = (selectedYearData?.months || []).reduce((result, month) => {
    const current = month.demons.length > 0 ? result.current + 1 : 0;
    return { current, longest: Math.max(result.longest, current) };
  }, { current: 0, longest: 0 }).longest;
  const mobileMonths = showEmptyMonths ? selectedYearData?.months || [] : activeMonths;
  const maxMonthlyCount = Math.max(1, ...(selectedYearData?.months || []).map(month => month.demons.length));

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

  useEffect(() => {
    if (routeYear) setSelectedYear(routeYear);
  }, [routeYear]);

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
            <h2>Timeline</h2>
            <p>No timeline data found yet.</p>
          </div>
        </div>
      </section>
    );
  }

  if (routeCompare) {
    return (
      <TimelineYearComparison
        timeline={timeline}
        preferredYear={selectedYearData.year}
        onBack={onBackToTimeline}
      />
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
            <p className="eyebrow">Timeline</p>
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

  if (isYearOverviewPage) {
    return (
      <section className="timeline-page timeline-month-page timeline-year-overview-page">
        <div className="timeline-month-page-header timeline-year-overview-header">
          <button className="timeline-back-link" onClick={onBackToTimeline} type="button">
            Back to timeline
          </button>
          <div className="timeline-month-title-block">
            <p className="eyebrow">Timeline</p>
            <div className="timeline-month-title-copy">
              <h2>{selectedYearData.year} Year Overview</h2>
            </div>
          </div>
          <span aria-hidden="true" />
        </div>

        {yearOverviewDemons.length > 0 ? (
          <div className="timeline-demon-grid timeline-month-page-grid timeline-year-overview-grid">
            {yearOverviewDemons.map(({ demon, date }) => (
              <TimelineDemonCard
                demon={demon}
                key={`${date.month}-${demon.id || demon.name}-${demon.placement}`}
                canRemove={false}
                onSelectDemon={onSelectDemon}
              />
            ))}
          </div>
        ) : (
          <div className="timeline-empty">No demons have been placed in this year yet.</div>
        )}
      </section>
    );
  }

  return (
    <section className="timeline-page">
      <div className="timeline-header">
        <span className="timeline-icon"><CalendarDays size={24} /></span>
        <div>
          <h2>Timeline</h2>
          <p>{pluralizeDemons(timeline.reduce((sum, year) => sum + year.demons.length, 0))} with known years</p>
        </div>
      </div>

      <div className="timeline-mobile-dashboard">
        <div className="timeline-mobile-year-bar">
          <button type="button" disabled={!previousYear} onClick={() => previousYear && handleSelectYear(previousYear.year)} aria-label="Previous year"><ChevronLeft size={20} /></button>
          <div><CalendarDays size={17} /><strong>{selectedYearData.year}</strong><span>{pluralizeDemons(selectedYearData.demons.length)}</span></div>
          <button type="button" disabled={!nextYear} onClick={() => nextYear && handleSelectYear(nextYear.year)} aria-label="Next year"><ChevronRight size={20} /></button>
        </div>

        <div className="timeline-mobile-records">
          <article><span>Most active month</span><strong>{busiestMonth?.name || "—"}</strong><small>{busiestMonth ? pluralizeDemons(busiestMonth.demons.length) : "No completions"}</small></article>
          <article><span>Hardest demon</span><strong>{hardestYearDemon?.name || "—"}</strong><small>{hardestYearDemon?.difficulty || "No demon"}</small></article>
          <article><span>Active months</span><strong>{activeMonths.length}</strong><small>of 12 months</small></article>
          <article><span>Longest streak</span><strong>{longestActiveStreak}</strong><small>{longestActiveStreak === 1 ? "month" : "months"}</small></article>
        </div>

        <section className="timeline-mobile-activity" aria-label={`${selectedYearData.year} activity by month`}>
          <div className="timeline-mobile-section-heading"><div><span>Year activity</span><strong>{selectedYearData.year} Activity</strong></div><b>{pluralizeDemons(selectedYearData.exactDemons.length)}</b></div>
          <div className="timeline-mobile-chart">
            {selectedYearData.months.map(month => (
              <div className="timeline-mobile-chart-column" key={month.slug} title={`${month.name}: ${pluralizeDemons(month.demons.length)}`}>
                <span style={{ height: `${Math.max(month.demons.length ? 8 : 2, (month.demons.length / maxMonthlyCount) * 100)}%` }} />
                <small>{month.name.slice(0, 3)}</small>
              </div>
            ))}
          </div>
        </section>

        <div className="timeline-mobile-month-heading">
          <div><span>Monthly highlights</span><strong>Explore {selectedYearData.year}</strong></div>
          <label><input type="checkbox" checked={showEmptyMonths} onChange={event => setShowEmptyMonths(event.target.checked)} /><span>Show empty months</span></label>
        </div>

        <div className="timeline-mobile-months">
          {mobileMonths.map(month => {
            const highlight = getHardestMonthHighlight(selectedYearData.year, month.slug);
            const hardestDemon = getHardestMonthlyDemon(month.demons);
            const hardestStyle = findMonthlyHighlightStyle(monthlyHighlightStyles, selectedYearData.year, month.slug);
            const hardestDifficultyFace = getDifficultyFace(hardestDemon?.difficulty);
            return (
              <button className={`timeline-month-card ${highlight ? `hardest-month ${highlight}` : ""}`} key={month.slug} onClick={() => onOpenMonth(selectedYearData.year, month.slug)} type="button">
                <span>{month.name}</span><strong>{month.demons.length}</strong><small>{pluralizeDemons(month.demons.length)}</small>
                {hardestDemon && <span className="timeline-month-hardest" aria-label={`Hardest demon: ${hardestDemon.name}`}>
                  {hardestDifficultyFace && <span className="timeline-month-hardest-face" aria-label={`Hardest difficulty: ${hardestDemon.difficulty}`}><img src={hardestDifficultyFace} alt="" loading="lazy" /></span>}
                  <span className="timeline-month-hardest-label"><Crown aria-hidden="true" /><b style={monthlyHighlightTextStyle(hardestStyle)}>{hardestDemon.name}</b></span>
                </span>}
              </button>
            );
          })}
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
        <div className="timeline-detail-actions">
          <button
            className="timeline-year-overview-button timeline-compare-years-button"
            onClick={onOpenYearComparison}
            type="button"
          >
            <ArrowLeftRight size={18} />
            <span>Compare Years</span>
          </button>
          <button
            className="timeline-year-overview-button"
            onClick={() => onOpenYearOverview?.(selectedYearData.year)}
            type="button"
          >
            <CalendarDays size={18} />
            <span>Year Overview</span>
          </button>
        </div>
      </div>

      <div className="timeline-month-grid">
        {selectedYearData.months.map(month => {
          const highlight = getHardestMonthHighlight(selectedYearData.year, month.slug);
          const hardestDemon = getHardestMonthlyDemon(month.demons);
          const hardestStyle = findMonthlyHighlightStyle(monthlyHighlightStyles, selectedYearData.year, month.slug);
          const hardestDifficultyFace = getDifficultyFace(hardestDemon?.difficulty);

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
              {hardestDemon && (
                <span className="timeline-month-hardest" aria-label={`Hardest demon: ${hardestDemon.name}`}>
                  {hardestDifficultyFace && (
                    <span className="timeline-month-hardest-face" aria-label={`Hardest difficulty: ${hardestDemon.difficulty}`}>
                      <img src={hardestDifficultyFace} alt="" loading="lazy" />
                    </span>
                  )}
                  <span className="timeline-month-hardest-label">
                    <Crown aria-hidden="true" />
                    <b style={monthlyHighlightTextStyle(hardestStyle)}>{hardestDemon.name}</b>
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
