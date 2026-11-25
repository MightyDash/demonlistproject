import React, { useRef, useState } from "react";
import { Check, Copy, Database, Dices, Music2, RefreshCw, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { getDemonYouTubeSearchUrl } from "../demonUtils.js";
import { getFinderTierBounds, loadGddlDemons, MAX_FINDER_TIER, pickRandomGddlDemon } from "../gddlFinderUtils.js";

const TIER_OPTIONS = Array.from({ length: MAX_FINDER_TIER }, (_, index) => index + 1);
const tierRangeFormat = new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function formatScore(value) {
  if (!Number.isFinite(value)) return "Unrated";
  return new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 2 }).format(value);
}

export function DemonFinderPage() {
  const [useTier, setUseTier] = useState(true);
  const [tier, setTier] = useState(5);
  const [useEnjoyment, setUseEnjoyment] = useState(false);
  const [enjoymentMin, setEnjoymentMin] = useState(7);
  const [enjoymentMax, setEnjoymentMax] = useState(10);
  const [result, setResult] = useState(null);
  const [matchingCount, setMatchingCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const resultCache = useRef({ key: "", levels: [] });

  const canSearch = useTier || useEnjoyment;
  const tierBounds = getFinderTierBounds(tier);
  const displayedTierMax = tierBounds.includesMax ? tierBounds.max : tierBounds.max - 0.01;

  async function findDemon() {
    if (!canSearch || loading) return;
    setLoading(true);
    setError("");
    setCopied(false);

    try {
      const filters = {
        useTier,
        tier,
        useEnjoyment,
        enjoymentMin,
        enjoymentMax
      };
      const cacheKey = JSON.stringify(filters);
      const levels = resultCache.current.key === cacheKey
        ? resultCache.current.levels
        : await loadGddlDemons(filters);
      resultCache.current = { key: cacheKey, levels };
      setMatchingCount(levels.length);
      setResult(pickRandomGddlDemon(levels, result?.id));
      if (!levels.length) setError("No GDDL demons match these filters. Try a wider range.");
    } catch (requestError) {
      setMatchingCount(0);
      setError(requestError?.message || "The GDDL spreadsheet could not be searched.");
    } finally {
      setLoading(false);
    }
  }

  async function copyId() {
    if (!result?.id) return;
    await navigator.clipboard.writeText(result.id);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <main className="demon-finder-page">
      <header className="demon-finder-heading">
        <span><Dices size={25} /></span>
        <div>
          <p>GDDL discovery tool</p>
          <h1>Random Demon Finder</h1>
          <small>Choose a tier, an enjoyment range, or combine both to discover something new.</small>
        </div>
      </header>

      <section className="demon-finder-workspace">
        <form className="demon-finder-controls" onSubmit={event => { event.preventDefault(); findDemon(); }}>
          <div className="demon-finder-controls-title">
            <span><SlidersHorizontal size={19} /></span>
            <div><h2>Search filters</h2><p>At least one filter must be active.</p></div>
          </div>

          <fieldset className={useTier ? "active" : ""}>
            <label className="finder-filter-toggle">
              <input type="checkbox" checked={useTier} onChange={event => setUseTier(event.target.checked)} />
              <span aria-hidden="true" />
              <strong>Filter by tier</strong>
            </label>
            <label className="finder-field">
              <span>Exact tier</span>
              <select disabled={!useTier} value={tier} onChange={event => setTier(Number(event.target.value))}>
                {TIER_OPTIONS.map(value => <option value={value} key={value}>Tier {value}</option>)}
              </select>
            </label>
            <small>GDDL rating range: {tierRangeFormat.format(tierBounds.min)} – {tierRangeFormat.format(displayedTierMax)}.</small>
          </fieldset>

          <fieldset className={useEnjoyment ? "active" : ""}>
            <label className="finder-filter-toggle">
              <input type="checkbox" checked={useEnjoyment} onChange={event => setUseEnjoyment(event.target.checked)} />
              <span aria-hidden="true" />
              <strong>Filter by enjoyment</strong>
            </label>
            <div className="finder-enjoyment-fields">
              <label className="finder-field">
                <span>Minimum</span>
                <input disabled={!useEnjoyment} type="number" min="0" max="10" step="0.5" value={enjoymentMin} onChange={event => setEnjoymentMin(event.target.value)} />
              </label>
              <label className="finder-field">
                <span>Maximum</span>
                <input disabled={!useEnjoyment} type="number" min="0" max="10" step="0.5" value={enjoymentMax} onChange={event => setEnjoymentMax(event.target.value)} />
              </label>
            </div>
            <small>Enjoyment is the community average from 0 to 10.</small>
          </fieldset>

          {!canSearch && <p className="demon-finder-hint">Enable tier, enjoyment, or both.</p>}
          <button className="demon-finder-submit" type="submit" disabled={!canSearch || loading}>
            {loading ? <RefreshCw className="finder-spin" size={20} /> : <Search size={20} />}
            {loading ? "Searching the GDDL…" : result ? "Find another demon" : "Find a random demon"}
          </button>
          <p className="demon-finder-source"><Database size={15} /> Uses the public GD Demon Ladder spreadsheet.</p>
        </form>

        <section className={`demon-finder-result ${result ? "has-result" : ""}`} aria-live="polite">
          {loading ? (
            <div className="demon-finder-loading"><RefreshCw className="finder-spin" /><strong>Searching the ladder</strong><span>Filtering thousands of demons…</span></div>
          ) : error ? (
            <div className="demon-finder-empty error"><Sparkles /><strong>No demon found</strong><span>{error}</span></div>
          ) : result ? (
            <article>
              <img src={`https://levelthumbs.prevter.me/thumbnail/${result.id}`} alt="" />
              <div className="demon-finder-result-shade" />
              <div className="demon-finder-result-content">
                <p><Sparkles size={17} /> Random pick</p>
                <h2>{result.name}</h2>
                <span className="demon-finder-creator">by {result.creator}</span>
                <div className="demon-finder-result-stats">
                  <span><small>Tier</small><strong>{formatScore(result.tier)}</strong></span>
                  <span><small>Enjoyment</small><strong>{formatScore(result.enjoyment)}</strong></span>
                  <span><small>Difficulty</small><strong>{result.difficulty}</strong></span>
                </div>
                <p className="demon-finder-song"><Music2 size={16} /> {result.song}</p>
                <div className="demon-finder-result-actions">
                  <button type="button" onClick={copyId}>{copied ? <Check size={18} /> : <Copy size={18} />}{copied ? "Copied!" : "Copy ID"}</button>
                  <button type="button" onClick={findDemon}><Dices size={18} /> Try another</button>
                  <a href={getDemonYouTubeSearchUrl(result)} target="_blank" rel="noreferrer">
                    <Search size={18} /> Search up on YouTube
                  </a>
                </div>
                <small className="demon-finder-match-count">Chosen from {matchingCount.toLocaleString("nl-NL")} matching {matchingCount === 1 ? "demon" : "demons"}.</small>
              </div>
            </article>
          ) : (
            <div className="demon-finder-empty"><Dices /><strong>Your random demon appears here</strong><span>Set your filters and let the GDDL choose.</span></div>
          )}
        </section>
      </section>
    </main>
  );
}
