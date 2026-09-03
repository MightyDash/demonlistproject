import React, { useState } from "react";
import { Search } from "lucide-react";
import { difficultyClass, formatNumber } from "../demonUtils.js";

export function BetaListPage({ demons, onSelectDemon }) {
  const [query, setQuery] = useState("");
  const search = query.trim().toLowerCase();
  const filteredDemons = demons.filter(demon => {
    if (!search) return true;
    return String(demon.name || "").toLowerCase().includes(search)
      || String(demon.creator || "").toLowerCase().includes(search)
      || String(demon.id || "").toLowerCase().includes(search);
  });

  return (
    <main className="beta-list-page">
      <section className="beta-list-toolbar">
        <div>
          <p className="eyebrow">Opinion Ranking</p>
          <h2>{demons.length} demons</h2>
        </div>
        <label className="beta-list-search">
          <Search size={17} />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search Beta List..."
          />
        </label>
      </section>

      <section className="beta-list-grid">
        {filteredDemons.map(demon => (
          <article
            className="beta-list-card"
            key={demon.id || demon.name}
            onClick={() => onSelectDemon(demon)}
            onKeyDown={event => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              onSelectDemon(demon);
            }}
            role="button"
            tabIndex={0}
          >
            <img
              src={demon.thumbnail}
              alt={demon.name}
              loading="lazy"
              decoding="async"
              onError={event => {
                event.currentTarget.style.display = "none";
              }}
            />
            <div className="beta-list-card-content">
              <span className="beta-placement">{demon.betaPlacement}</span>
              <h3>{demon.name}</h3>
              <p>by {demon.creator || "Unknown creator"}</p>
              <div>
                <span className={`grid-chip difficulty-chip ${difficultyClass(demon.difficulty)}`}>
                  {demon.difficulty || "Unknown"}
                </span>
                <span className="grid-chip">{formatNumber(demon.attempts)} attempts</span>
                <span className="grid-chip">{demon.date || demon.year || "Unknown"}</span>
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
