import React, { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { isInProgressDemon, placementNumber } from "../demonUtils.js";

const MONTHS = [
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
        monthIndex: month - 1,
        day,
        exact: true,
        sortValue: new Date(year, month - 1, day).getTime()
      };
    }
  }

  const year = Number(demon?.dateYear || demon?.year || 0);

  if (year >= 2013 && year <= 2100) {
    return {
      year,
      monthIndex: null,
      day: null,
      exact: false,
      sortValue: new Date(year, 0, 1).getTime()
    };
  }

  return null;
}

function pluralizeDemons(count) {
  return `${count} ${count === 1 ? "demon" : "demons"}`;
}

function TimelineDemonCard({ demon, onSelectDemon }) {
  return (
    <button
      className="timeline-demon-card"
      onClick={() => onSelectDemon(demon)}
      type="button"
    >
      {demon.thumbnail && (
        <img src={demon.thumbnail} alt="" loading="lazy" />
      )}
      <span>{demon.name || "Unknown demon"}</span>
    </button>
  );
}

export function TimelinePage({ demons, onSelectDemon }) {
  const timeline = useMemo(() => {
    const completed = demons
      .filter(demon => !isInProgressDemon(demon))
      .map(demon => ({ demon, date: parseTimelineDate(demon) }))
      .filter(item => item.date);

    const yearMap = new Map();

    completed.forEach(item => {
      if (!yearMap.has(item.date.year)) {
        yearMap.set(item.date.year, {
          year: item.date.year,
          demons: [],
          exactDemons: [],
          months: MONTHS.map((name, index) => ({ name, index, demons: [] }))
        });
      }

      const yearBucket = yearMap.get(item.date.year);
      yearBucket.demons.push(item);

      if (item.date.exact) {
        yearBucket.exactDemons.push(item);
        yearBucket.months[item.date.monthIndex].demons.push(item);
      }
    });

    const years = Array.from(yearMap.values())
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

    return years;
  }, [demons]);

  const defaultYear = timeline[timeline.length - 1]?.year || null;
  const [selectedYear, setSelectedYear] = useState(defaultYear);
  const selectedYearData = timeline.find(item => item.year === selectedYear) || timeline[timeline.length - 1] || null;
  const firstFilledMonth = selectedYearData?.months.find(month => month.demons.length > 0)?.index ?? 0;
  const [selectedMonth, setSelectedMonth] = useState(firstFilledMonth);
  const selectedMonthData = selectedYearData?.months[selectedMonth] || null;

  function handleSelectYear(year) {
    const nextYear = timeline.find(item => item.year === year);
    const nextMonth = nextYear?.months.find(month => month.demons.length > 0)?.index ?? 0;

    setSelectedYear(year);
    setSelectedMonth(nextMonth);
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

        {timeline.length === 0 ? (
          <div className="timeline-empty">No timeline data found yet.</div>
        ) : (
          <>
            <div className="timeline-years" aria-label="Completion years">
              {timeline.map((yearData, index) => (
                <button
                  className={`timeline-year-node ${yearData.year === selectedYear ? "active" : ""} ${index % 2 ? "summary-below" : ""}`}
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
                  className={`timeline-month-card ${month.index === selectedMonth ? "active" : ""}`}
                  key={month.name}
                  onClick={() => setSelectedMonth(month.index)}
                  type="button"
                >
                  <span>{month.name}</span>
                  <strong>{month.demons.length}</strong>
                  <small>{pluralizeDemons(month.demons.length)}</small>
                </button>
              ))}
            </div>

            <section className="timeline-month-demons">
              <div className="timeline-month-title">
                <h3>{selectedMonthData.name} {selectedYearData.year}</h3>
                <p>{pluralizeDemons(selectedMonthData.demons.length)}</p>
              </div>

              {selectedMonthData.demons.length > 0 ? (
                <div className="timeline-demon-grid">
                  {selectedMonthData.demons.map(({ demon }) => (
                    <TimelineDemonCard
                      demon={demon}
                      key={`${demon.id || demon.name}-${demon.placement}`}
                      onSelectDemon={onSelectDemon}
                    />
                  ))}
                </div>
              ) : (
                <div className="timeline-empty">No demons with an exact date in this month yet.</div>
              )}
            </section>
          </>
        )}
      </section>
  );
}
