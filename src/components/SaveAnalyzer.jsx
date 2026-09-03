import React, { useMemo, useRef, useState } from "react";
import { FileUp, HardDrive, Lock, Search, Sparkles } from "lucide-react";
import { analyzeGdSaveFile } from "../gdSaveUtils.js";
import { formatNumber } from "../demonUtils.js";

export function SaveAnalyzer() {
  const inputRef = useRef(null);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  const filteredEntries = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!analysis || !search) return analysis?.entries || [];
    return analysis.entries.filter(entry => {
      return String(entry.key).toLowerCase().includes(search)
        || String(entry.value).toLowerCase().includes(search);
    });
  }, [analysis, query]);

  async function handleFile(file) {
    if (!file) return;

    setLoading(true);
    setError("");
    setAnalysis(null);

    try {
      const nextAnalysis = await analyzeGdSaveFile(file);
      setAnalysis(nextAnalysis);
    } catch (err) {
      setError(err?.message || "Could not read this save file.");
    } finally {
      setLoading(false);
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    handleFile(event.dataTransfer.files?.[0]);
  }

  return (
    <main className="save-analyzer-page">
      <section
        className={`save-drop-zone ${loading ? "loading" : ""}`}
        onDragOver={event => event.preventDefault()}
        onDrop={handleDrop}
      >
        <div className="save-drop-icon">
          <FileUp size={34} />
        </div>
        <div>
          <h2>Drop your Geometry Dash save file</h2>
          <p>
            Select `CCGameManager.dat` and this page will decode it locally in your browser.
          </p>
        </div>
        <button className="login-button save-select-button" onClick={() => inputRef.current?.click()} type="button">
          Choose file
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".dat"
          onChange={event => handleFile(event.target.files?.[0])}
          hidden
        />
      </section>

      <section className="save-privacy-strip">
        <span><Lock size={17} /> Offline reader</span>
        <span><HardDrive size={17} /> Nothing is uploaded</span>
        <span><Sparkles size={17} /> Works from Cloudflare Pages</span>
      </section>

      {loading && <div className="admin-message">Reading save file...</div>}
      {error && <div className="admin-error">{error}</div>}

      {analysis && (
        <>
          <section className="save-summary-panel">
            <div>
              <p className="eyebrow">Detected Profile</p>
              <h2>{analysis.playerName}</h2>
              {analysis.accountId && <p>Account ID: {analysis.accountId}</p>}
            </div>
            <div className="save-file-meta">
              <span>{analysis.fileName}</span>
              <strong>{formatNumber(Math.round(analysis.fileSize / 1024))} KB</strong>
            </div>
          </section>

          <section className="save-stats-grid">
            {analysis.stats.length > 0 ? analysis.stats.map(stat => (
              <article className="save-stat-card" key={stat.key}>
                <span>{stat.label}</span>
                <strong>{formatNumber(stat.value)}</strong>
              </article>
            )) : (
              <article className="save-stat-card wide">
                <span>Stats</span>
                <strong>No known stat keys found yet</strong>
              </article>
            )}
          </section>

          <section className="save-raw-panel">
            <div className="save-raw-header">
              <div>
                <p className="eyebrow">Readable Data</p>
                <h3>Save keys</h3>
              </div>
              <label className="save-search">
                <Search size={17} />
                <input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="Search keys..."
                />
              </label>
            </div>
            <div className="save-key-list">
              {filteredEntries.map(entry => (
                <div className="save-key-row" key={entry.key}>
                  <span>{entry.key}</span>
                  <strong>{String(entry.value)}</strong>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
