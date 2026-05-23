import React from "react";

export function AppHeader({
  adminView,
  source,
  isAdmin,
  onOpenRequests,
  onOpenLogin,
  onOpenAdmin,
  onCloseAdmin,
  onOpenLogout
}) {
  return (
        <header className="hero">
          <div>
            <p className="eyebrow">Moik's Geometry Dash Demon Archive</p>
            <h1>{adminView ? "Admin Panel" : "Demon List"}</h1>
            <p className="subtitle">
              {adminView
                ? "Manage your demon list tools and admin actions."
                : "A clean, searchable demon list powered by my Google Spreadsheet."}
            </p>
          </div>
    
          <div>
            <div className={`source-pill ${source}`}>
              {source === "live" ? "Live Sheet Data" : source === "mock" ? "Mock Data" : "Loading"}
            </div>
    
            {!adminView && (
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
