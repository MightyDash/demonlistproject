import React, { useState } from "react";
import { CalendarDays, FileClock, Home, Inbox, ListChecks, Menu, Radio, Rss, X } from "lucide-react";

const DEFAULT_SITE_VERSION = "v0.62";
const DEFAULT_VERSION_CHANGES = [
  "Switched the site to a cleaner fixed grayscale style.",
  "Added skillset distribution on demon detail pages.",
  "Added safer admin tools with previews before heavy actions.",
  "Improved the desktop demon list, request page and list changes layout."
];

export function AppHeader({
  source,
  historyView,
  progressView,
  newsView,
  requestView,
  timelineView,
  onOpenList,
  onOpenProgress,
  onOpenNews,
  onOpenRequests,
  onOpenHistory,
  onOpenTimeline,
  siteVersion,
  siteChangelog,
  hasUnreadNews
}) {
  const [showVersionInfo, setShowVersionInfo] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const resolvedVersion = String(siteVersion || DEFAULT_SITE_VERSION).trim();
  const resolvedChangelog = Array.isArray(siteChangelog) && siteChangelog.length > 0
    ? siteChangelog
    : DEFAULT_VERSION_CHANGES;
  const pageTitle = newsView
    ? "News"
    : progressView
      ? "Progress Tracker"
      : requestView
        ? "Demon Requests"
        : historyView
          ? "List Changes"
          : timelineView
            ? "Timeline"
            : "Demon Archive";
  const pageSubtitle = newsView
    ? "Updates, uploads and announcements from across my social channels."
    : progressView
      ? "Track the demons I am currently working toward completing."
      : requestView
        ? "Community requests to add new demons to the list."
        : historyView
          ? "Browse all changes made to the demon list."
          : timelineView
            ? "A year-by-year view of when demons were completed."
            : "A clean, searchable demon list powered by my Google Spreadsheet.";

  function openVersionInfo() {
    setShowVersionInfo(true);
  }

  function closeVersionInfo() {
    setShowVersionInfo(false);
  }

  function navigate(action) {
    setMobileNavOpen(false);
    action?.();
  }

  const listActive = !newsView && !progressView && !requestView && !historyView && !timelineView;
  const sourceLabel = source === "live"
    ? "Live Sheet Data"
    : source === "cache"
      ? "Cached Data"
      : source === "mock"
        ? "Mock Data"
        : "Loading";

  return (
    <>
      <aside id="site-navigation" className={`observatory-sidebar ${mobileNavOpen ? "mobile-open" : ""}`}>
        <button className="observatory-brand" onClick={() => navigate(onOpenList)} type="button" aria-label="Open demon archive">
          <span className="observatory-brand-mark">M</span>
          <span>Moik's<br />Archive</span>
        </button>

        <nav className="observatory-nav" aria-label="Main navigation">
          <button className={listActive ? "active" : ""} onClick={() => navigate(onOpenList)} type="button">
            <Home size={21} /><span>Archive</span>
          </button>
          <button className={progressView ? "active" : ""} onClick={() => navigate(onOpenProgress)} type="button">
            <ListChecks size={21} /><span>Progress Tracker</span>
          </button>
          <button className={newsView ? "active" : ""} onClick={() => navigate(onOpenNews)} type="button">
            <Rss size={21} /><span>News</span>{hasUnreadNews && <i className="observatory-news-dot" aria-label="New news" />}
          </button>
          <button className={historyView ? "active" : ""} onClick={() => navigate(onOpenHistory)} type="button">
            <FileClock size={21} /><span>Changes</span>
          </button>
          <button className={timelineView ? "active" : ""} onClick={() => navigate(onOpenTimeline)} type="button">
            <CalendarDays size={21} /><span>Timeline</span>
          </button>
          <button className={requestView ? "active" : ""} onClick={() => navigate(onOpenRequests)} type="button">
            <Inbox size={21} /><span>Requests</span>
          </button>
        </nav>

        <div className="observatory-sidebar-footer">
          <div className={`observatory-source ${source}`} title={sourceLabel}>
            <Radio size={17} /><span>{sourceLabel}</span>
          </div>
          <button className="observatory-version" onClick={openVersionInfo} type="button">
            {resolvedVersion}
          </button>
        </div>
      </aside>

      {mobileNavOpen && (
        <button className="observatory-nav-backdrop" onClick={() => setMobileNavOpen(false)} type="button" aria-label="Close navigation" />
      )}

      <header className="hero observatory-hero">
        <button
          className="observatory-menu-button"
          onClick={() => setMobileNavOpen(open => !open)}
          type="button"
          aria-label="Open navigation"
          aria-expanded={mobileNavOpen}
          aria-controls="site-navigation"
        >
          <Menu size={23} />
        </button>
        <div className="observatory-hero-copy">
          <p className="eyebrow hero-eyebrow">Moik's Geometry Dash archive</p>
          <div className="hero-title-row">
            <h1>{pageTitle}</h1>
          </div>
          <p className="subtitle">{pageSubtitle}</p>
        </div>
        <div className="observatory-hero-art" aria-hidden="true">
          <span className="orbit orbit-one" />
          <span className="orbit orbit-two" />
          <span className="observatory-gem" />
        </div>
      </header>

      {showVersionInfo && (
        <div className="progress-info-backdrop" onClick={closeVersionInfo}>
          <section className="progress-info-modal version-info-modal" onClick={event => event.stopPropagation()}>
            <button className="progress-info-close" onClick={closeVersionInfo} type="button" aria-label="Close"><X size={20} /></button>
            <div className="version-info-header">
              <h2>Changes in {resolvedVersion}</h2>
            </div>
            <ul>{resolvedChangelog.map(change => <li key={change}>{change}</li>)}</ul>
          </section>
        </div>
      )}
    </>
  );
}

