import React, { useState } from "react";
import { Info, X } from "lucide-react";

export function AppHeader({
  adminView,
  source,
  isAdmin,
  historyView,
  onOpenRequests,
  onOpenHistory,
  onOpenLogin,
  onOpenAdmin,
  onCloseAdmin,
  onOpenLogout
}) {
  const [showListInfo, setShowListInfo] = useState(false);
  const listInfoText = "This is my demon list with all the demons I have beaten over the years. It won't look like most of you hoped or expected. To me, some demons meant something, whether it was the moments surrounding them or a goal I wanted to achieve. From 2019 to the summer of 2021, I didn't beat any harder demons except some medium demons because I found it too challenging, but it was precisely in the summer of 2021 that I started taking things a step further and attempting to defeat Nine Circles. Since defeating this level, I wanted to go for the harder ones. Every demon had something to offer, which you will discover in this list.";

  return (
        <header className="hero">
          <div>
            <p className="eyebrow">Moik's Geometry Dash Demon Archive</p>
            <div className="hero-title-row">
              <h1>{adminView ? "Admin Panel" : "Demon List"}</h1>
              {!adminView && (
                <button
                  className="hero-info-button"
                  onClick={() => setShowListInfo(true)}
                  type="button"
                  aria-label="Demon list info"
                >
                  <Info size={26} />
                </button>
              )}
            </div>
            <p className="subtitle">
              {adminView
                ? "Manage your demon list tools and admin actions."
                : "A clean, searchable demon list powered by my Google Spreadsheet."}
            </p>
          </div>

          {showListInfo && (
            <div className="progress-info-backdrop" onClick={() => setShowListInfo(false)}>
              <section className="progress-info-modal list-info-modal" onClick={event => event.stopPropagation()}>
                <button
                  className="progress-info-close"
                  onClick={() => setShowListInfo(false)}
                  type="button"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
                <p>{listInfoText}</p>
              </section>
            </div>
          )}
    
          <div>
            <div className={`source-pill ${source}`}>
              {source === "live" ? "Live Sheet Data" : source === "mock" ? "Mock Data" : "Loading"}
            </div>
    
            {!adminView && (
              <button className="admin-button panel-button" onClick={onOpenHistory} type="button">
                {historyView ? "Back to list" : "Recent Changes"}
              </button>
            )}

            {!adminView && !historyView && (
              <button className="admin-button panel-button" onClick={onOpenRequests} type="button">
                Demon Requests
              </button>
            )}
    
            {!isAdmin && (
              <button className="admin-button" onClick={onOpenLogin} type="button">
                Admin Login
              </button>
            )}
    
            {isAdmin && !adminView && (
              <button className="admin-button panel-button" onClick={onOpenAdmin} type="button">
                Go to panel
              </button>
            )}
    
            {isAdmin && adminView && (
              <button className="admin-button panel-button" onClick={onCloseAdmin} type="button">
                Back to list
              </button>
            )}
    
            {isAdmin && (
              <button className="admin-button logout-button" onClick={onOpenLogout} type="button">
                Logout
              </button>
            )}
          </div>
        </header>
  );
}

