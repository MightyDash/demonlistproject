import React, { useMemo } from "react";
import {
  BarChart3,
  CalendarDays,
  Gauge,
  Sigma,
  Target,
  Trophy
} from "lucide-react";
import { formatNumber, formatTier } from "../demonUtils.js";
import { buildDemonStatistics, STATISTICS_DIFFICULTIES } from "../statisticsUtils.js";

function Difference({ value, suffix = "" }) {
  const numericValue = Number(value || 0);
  const sign = numericValue > 0 ? "+" : "";
  return (
    <span className={numericValue > 0 ? "positive" : numericValue < 0 ? "negative" : "neutral"}>
      {sign}{formatNumber(numericValue)}{suffix}
    </span>
  );
}

export function StatisticsPage({ demons, onSelectDemon }) {
  const statistics = useMemo(() => buildDemonStatistics(demons), [demons]);
  const latestYear = statistics.latestYear;

  return (
    <main className="statistics-page">
      <header className="statistics-heading">
        <span className="statistics-heading-icon"><BarChart3 size={25} /></span>
        <div>
          <h1>Statistics</h1>
          <p>A complete overview of the demons I have beaten.</p>
        </div>
      </header>

      <section className="statistics-overview" aria-label="Overall statistics">
        <article>
          <span><Trophy size={21} /></span>
          <div><small>Total Demons</small><strong>{formatNumber(statistics.total)}</strong></div>
        </article>
        <article>
          <span><Target size={21} /></span>
          <div><small>Total Attempts</small><strong>{formatNumber(statistics.attempts)}</strong></div>
        </article>
        <article>
          <span><Sigma size={21} /></span>
          <div><small>Average Attempts</small><strong>{formatNumber(statistics.averageAttempts)}</strong></div>
        </article>
        <article>
          <span><Gauge size={21} /></span>
          <div><small>Average Tier</small><strong>{formatTier(statistics.averageTier)}</strong></div>
        </article>
      </section>

      <section className="statistics-feature-grid">
        <button
          className="statistics-hardest-card"
          type="button"
          onClick={() => statistics.hardest && onSelectDemon?.(statistics.hardest)}
          disabled={!statistics.hardest}
        >
          {statistics.hardest?.thumbnail && <img src={statistics.hardest.thumbnail} alt="" />}
          <span className="statistics-card-shade" />
          <span className="statistics-hardest-content">
            <small><Trophy size={16} /> Hardest Demon</small>
            <strong>{statistics.hardest?.name || "No data"}</strong>
            <em>{statistics.hardest ? `${statistics.hardest.difficulty} · Tier ${formatTier(statistics.hardest.tier)}` : ""}</em>
          </span>
        </button>

        <article className="statistics-latest-year">
          <div className="statistics-section-label"><CalendarDays size={16} /> Latest year</div>
          {latestYear ? (
            <>
              <div className="statistics-latest-year-title">
                <strong>{latestYear.year}</strong>
                <span>{formatNumber(latestYear.total)} demons</span>
              </div>
              <dl>
                <div><dt>Compared with previous year</dt><dd><Difference value={latestYear.totalChange} /></dd></div>
                <div><dt>Average attempts</dt><dd>{formatNumber(latestYear.averageAttempts)}</dd></div>
                <div><dt>Average tier</dt><dd>{formatTier(latestYear.averageTier)}</dd></div>
                <div><dt>Hardest completion</dt><dd>{latestYear.hardest?.name || "Unknown"}</dd></div>
              </dl>
            </>
          ) : <p>No yearly data is available yet.</p>}
        </article>
      </section>

      <section className="statistics-panel statistics-difficulty-panel">
        <div className="statistics-section-heading">
          <div><span>Difficulty spread</span><h2>Demons by difficulty</h2></div>
          <strong>{formatNumber(statistics.total)} total</strong>
        </div>
        <div className="statistics-difficulty-list">
          {STATISTICS_DIFFICULTIES.map(({ key, label }) => {
            const count = statistics.difficultyCounts[key] || 0;
            const percentage = statistics.total ? (count / statistics.total) * 100 : 0;
            return (
              <article className={`statistics-difficulty-${key}`} key={key}>
                <div><span>{label}</span><strong>{formatNumber(count)}</strong></div>
                <em><i style={{ width: `${percentage}%` }} /></em>
                <small>{percentage.toLocaleString("nl-NL", { maximumFractionDigits: 1 })}%</small>
              </article>
            );
          })}
        </div>
      </section>

      <section className="statistics-panel statistics-year-panel">
        <div className="statistics-section-heading">
          <div><span>Progress over time</span><h2>Completions per year</h2></div>
          <strong>{statistics.years.length} years</strong>
        </div>
        <div className="statistics-year-chart" aria-label="Completed demons per year">
          {statistics.years.map(summary => (
            <div className="statistics-year-column" key={summary.year} title={`${summary.year}: ${summary.total} demons`}>
              <span>{summary.total}</span>
              <i style={{ height: `${Math.max(3, (summary.total / statistics.maxYearTotal) * 100)}%` }} />
              <small>{summary.year}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="statistics-panel statistics-year-records">
        <div className="statistics-section-heading">
          <div><span>Year records</span><h2>Year-by-year breakdown</h2></div>
        </div>
        <div className="statistics-year-table">
          <div className="statistics-year-table-head" aria-hidden="true">
            <span>Year</span><span>Demons</span><span>Attempts</span><span>Average</span><span>Average tier</span><span>Hardest completion</span>
          </div>
          {statistics.years.slice().reverse().map(summary => (
            <article key={summary.year}>
              <strong>{summary.year}</strong>
              <span data-label="Demons">{formatNumber(summary.total)}</span>
              <span data-label="Attempts">{formatNumber(summary.attempts)}</span>
              <span data-label="Average attempts">{formatNumber(summary.averageAttempts)}</span>
              <span data-label="Average tier">{formatTier(summary.averageTier)}</span>
              <button type="button" onClick={() => summary.hardest && onSelectDemon?.(summary.hardest)} disabled={!summary.hardest}>
                {summary.hardest?.name || "Unknown"}
              </button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
