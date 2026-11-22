import React from "react";
import { Database, RefreshCw, WifiOff } from "lucide-react";

export function OfflineScreen({
  message,
  reconnecting = false,
  hasCachedData = false,
  onReconnect,
  onContinue
}) {
  return (
    <div className="offline-screen" role="dialog" aria-modal="true" aria-labelledby="offline-screen-title">
      <section className="offline-card">
        <span className="offline-icon" aria-hidden="true"><WifiOff /></span>
        <p className="offline-eyebrow">Connection lost</p>
        <h2 id="offline-screen-title">You’re offline</h2>
        <p>{message || "The live demon list could not be reached. Check your connection and try again."}</p>

        <div className="offline-actions">
          <button className="offline-reconnect-button" onClick={onReconnect} disabled={reconnecting} type="button">
            <RefreshCw className={reconnecting ? "is-spinning" : ""} aria-hidden="true" />
            <span>{reconnecting ? "Reconnecting…" : "Reconnect"}</span>
          </button>

          {hasCachedData && (
            <button className="offline-cache-button" onClick={onContinue} disabled={reconnecting} type="button">
              <Database aria-hidden="true" />
              <span>Continue with saved data</span>
            </button>
          )}
        </div>

        <small>Your saved list remains available on this device.</small>
      </section>
    </div>
  );
}
