import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, Copy, Layers, X } from "lucide-react";
import { difficultyClass, isInProgressDemon } from "../demonUtils.js";
import { packSlug } from "../routeUtils.js";

function amsterdamDateKey() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function hashDateKey(value) {
  return Array.from(value).reduce((hash, character) => ((hash * 31) + character.charCodeAt(0)) >>> 0, 0);
}

export function CollectionsPage({ demons, packs = [], selectedPackSlug = "", dataReady = true, onOpenPack, onClosePack }) {
  const [copied, setCopied] = useState(false);
  const [copiedPackLevelId, setCopiedPackLevelId] = useState("");
  const demonsById = useMemo(() => new Map(demons.map(demon => [String(demon.id), demon])), [demons]);
  const selectedPack = useMemo(() => packs.find(pack => (
    packSlug(pack) === selectedPackSlug || String(pack.id || "").toLowerCase() === selectedPackSlug
  )) || null, [packs, selectedPackSlug]);
  const demonOfTheDay = useMemo(() => {
    const completed = demons
      .filter(demon => !isInProgressDemon(demon))
      .sort((first, second) => String(first.id || first.name).localeCompare(String(second.id || second.name)));
    if (!completed.length) return null;
    return completed[hashDateKey(amsterdamDateKey()) % completed.length];
  }, [demons]);

  useEffect(() => {
    if (!selectedPackSlug) return undefined;
    const closeOnEscape = event => {
      if (event.key === "Escape") onClosePack?.();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClosePack, selectedPackSlug]);

  async function copyLevelId() {
    if (!demonOfTheDay?.id) return;
    await navigator.clipboard.writeText(String(demonOfTheDay.id));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function copyPackLevelId(levelId) {
    await navigator.clipboard.writeText(String(levelId));
    setCopiedPackLevelId(String(levelId));
    window.setTimeout(() => setCopiedPackLevelId(""), 1800);
  }

  return (
    <main className="collections-page">
      <section className="demon-of-the-day" aria-labelledby="demon-of-the-day-title">
        {demonOfTheDay?.thumbnail && <img src={demonOfTheDay.thumbnail} alt="" />}
        <div className="demon-of-the-day-shade" />
        <div className="demon-of-the-day-content">
          <p><CalendarDays size={17} /> Demon of the day</p>
          {demonOfTheDay ? (
            <>
              <h1 id="demon-of-the-day-title">{demonOfTheDay.name}</h1>
              <span>by {demonOfTheDay.creator || "Unknown"}</span>
              <button type="button" onClick={copyLevelId} disabled={!demonOfTheDay.id}>
                {copied ? <Check size={18} /> : <Copy size={18} />}
                {copied ? "Copied!" : "Copy ID"}
              </button>
            </>
          ) : (
            <h1 id="demon-of-the-day-title">Loading today&apos;s demon…</h1>
          )}
        </div>
      </section>

      <section className="packs-browser" aria-labelledby="packs-browser-title">
        <div className="packs-browser-heading">
          <h2 id="packs-browser-title">Browse Packs</h2>
        </div>
        {packs.length ? (
          <div className="packs-grid">
            {packs.map(pack => {
              const packDemons = (pack.levelIds || []).map(id => demonsById.get(String(id))).filter(Boolean);
              const coverDemon = demonsById.get(String(pack.coverLevelId || "")) || packDemons[0];
              const cover = coverDemon?.thumbnail || "";
              return (
                <button className="pack-card" key={pack.id} onClick={() => onOpenPack?.(pack)} type="button">
                  {cover && <img src={cover} alt="" />}
                  <span className="pack-card-shade" />
                  <span className="pack-card-content">
                    <Layers size={20} />
                    <strong>{pack.name}</strong>
                    <small>{packDemons.length} {packDemons.length === 1 ? "demon" : "demons"}</small>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="packs-empty-state">
            <Layers size={28} />
            <p>No packs have been added yet.</p>
          </div>
        )}
      </section>

      {selectedPack && (() => {
        const packDemons = (selectedPack.levelIds || []).map(id => demonsById.get(String(id))).filter(Boolean);
        return (
          <div className="pack-detail-backdrop" onClick={() => onClosePack?.()}>
            <section className="pack-detail" role="dialog" aria-modal="true" aria-labelledby="pack-detail-title" onClick={event => event.stopPropagation()}>
              <button className="pack-detail-close" onClick={() => onClosePack?.()} type="button" aria-label="Close pack"><X size={21} /></button>
              <p><Layers size={17} /> Collection pack</p>
              <h2 id="pack-detail-title">{selectedPack.name}</h2>
              <div className="pack-level-list">
                {packDemons.map(demon => (
                  <article className={`pack-level-${difficultyClass(demon.difficulty)}`} key={demon.id}>
                    <img src={demon.thumbnail} alt="" />
                    <span><strong>{demon.name}</strong><small>by {demon.creator || "Unknown"}</small></span>
                    <button onClick={() => copyPackLevelId(demon.id)} type="button">
                      {copiedPackLevelId === String(demon.id) ? <Check size={16} /> : <Copy size={16} />}
                      {copiedPackLevelId === String(demon.id) ? "Copied!" : "Copy ID"}
                    </button>
                  </article>
                ))}
              </div>
            </section>
          </div>
        );
      })()}

      {dataReady && selectedPackSlug && !selectedPack && (
        <div className="pack-detail-backdrop" onClick={() => onClosePack?.()}>
          <section className="pack-detail" role="dialog" aria-modal="true" aria-labelledby="pack-not-found-title" onClick={event => event.stopPropagation()}>
            <button className="pack-detail-close" onClick={() => onClosePack?.()} type="button" aria-label="Close pack"><X size={21} /></button>
            <p><Layers size={17} /> Collection pack</p>
            <h2 id="pack-not-found-title">Pack not found</h2>
            <p>This pack may have been renamed, unpublished or removed.</p>
          </section>
        </div>
      )}
    </main>
  );
}
