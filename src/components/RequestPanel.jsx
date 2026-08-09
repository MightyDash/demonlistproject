import React, { useMemo, useState } from "react";
import {
  Ban,
  CalendarCheck2,
  CheckCircle2,
  Clipboard,
  Clock3,
  FileSearch,
  Hash,
  Inbox,
  ListFilter,
  Megaphone,
  Send,
  Shield,
  Trash2,
  X
} from "lucide-react";

const REQUEST_STATUSES = ["Pending", "Under Review", "Planned", "Completed", "Rejected"];
const DIFFICULTY_FILTERS = ["Easy Demon", "Medium Demon", "Hard Demon", "Insane Demon", "Extreme Demon"];

function normalizeStatus(status) {
  const value = String(status || "Pending").trim();
  if (value === "Approved") return "Planned";
  if (value === "Dropped") return "Rejected";
  return REQUEST_STATUSES.includes(value) ? value : "Pending";
}

function statusClass(status) {
  return normalizeStatus(status).toLowerCase().replace(/\s+/g, "-");
}

function requestDifficulty(request) {
  const difficulty = String(request.difficulty || request.demonDifficulty || request.gddlDifficulty || "").trim();
  if (difficulty) return difficulty;

  const legacyType = String(request.type || "").trim();
  return DIFFICULTY_FILTERS.includes(legacyType) ? legacyType : "Unknown";
}

function requestDate(request) {
  if (!request.timestamp) return "-";
  const date = new Date(request.timestamp);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("en-GB");
}

function thumbnailFor(request) {
  return request.levelId ? `https://levelthumbs.prevter.me/thumbnail/${request.levelId}` : "";
}

export function RequestPanel({
  onBack,
  requestForm,
  setRequestForm,
  requestLoading,
  requestMessage,
  requestError,
  handleSubmitRequest,
  requests,
  requestsLoading,
  isAdmin,
  handleRequestQuickStatus,
  handleDeleteRequest,
  requestSort,
  setRequestSort,
  requestStatusFilter,
  setRequestStatusFilter
}) {
  void onBack;
  const [selectedRequest, setSelectedRequest] = useState(null);
  const statusStats = useMemo(() => {
    const counts = Object.fromEntries(REQUEST_STATUSES.map(status => [status, 0]));
    requests.forEach(request => {
      const status = normalizeStatus(request.status);
      counts[status] = (counts[status] || 0) + 1;
    });

    return counts;
  }, [requests]);

  const filteredRequests = useMemo(() => {
    return requests.filter(request => {
      if (requestStatusFilter === "all") return true;
      if (DIFFICULTY_FILTERS.includes(requestStatusFilter)) {
        return requestDifficulty(request) === requestStatusFilter;
      }

      return statusClass(request.status) === requestStatusFilter;
    });
  }, [requestStatusFilter, requests]);

  const sortedRequests = useMemo(() => {
    return [...filteredRequests].sort((a, b) => {
      const aTime = new Date(a.timestamp || 0).getTime();
      const bTime = new Date(b.timestamp || 0).getTime();
      return requestSort === "oldest" ? aTime - bTime : bTime - aTime;
    });
  }, [filteredRequests, requestSort]);

  async function copyLevelId(levelId) {
    try {
      await navigator.clipboard.writeText(String(levelId || ""));
    } catch {
      // Copy is a convenience action only.
    }
  }

  function renderStatusPill(request) {
    const status = normalizeStatus(request.status);
    return <span className={`request-status ${statusClass(status)}`}>{status}</span>;
  }

  function handleOpenKey(event, request) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    setSelectedRequest(request);
  }

  function renderQuickActions(request) {
    if (!isAdmin) return null;

    return (
      <div className="request-quick-actions" onClick={event => event.stopPropagation()}>
        {REQUEST_STATUSES.filter(status => status !== normalizeStatus(request.status)).map(status => (
          <button
            key={status}
            type="button"
            onClick={() => handleRequestQuickStatus(request.rowNumber, status)}
          >
            {status}
          </button>
        ))}
        <button type="button" onClick={() => copyLevelId(request.levelId)}>
          <Clipboard size={15} />
          Copy ID
        </button>
        <button
          className="request-delete-button"
          type="button"
          onClick={() => handleDeleteRequest(request.rowNumber)}
        >
          <Trash2 size={15} />
          Delete
        </button>
      </div>
    );
  }

  return (
    <section className="panel request-panel">
      <div className="request-status-summary">
        {[
          ["Pending", Clock3],
          ["Under Review", FileSearch],
          ["Planned", CalendarCheck2],
          ["Completed", CheckCircle2]
        ].map(([status, Icon]) => (
          <div className="request-status-stat" key={status}>
            <span><Icon size={28} /></span>
            <strong>{statusStats[status] || 0}</strong>
            <small>{status}</small>
          </div>
        ))}
      </div>

      <div className="request-dashboard-grid">
        <div className="request-form request-submit-card">
          <div className="request-form-heading">
            <Megaphone size={22} />
            <div>
              <h3>Submit a Demon Request</h3>
              <p>The site fetches demon data from the level ID. Planned requests do not affect Future List or In Progress.</p>
            </div>
          </div>

          <div className="request-form-row">
            <label>
              Level ID
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Enter level ID"
                value={requestForm.levelId}
                onChange={event => setRequestForm({ ...requestForm, levelId: event.target.value })}
              />
              <small>Example: 12345678</small>
            </label>
          </div>

          <label className="request-description-field">
            Description
            <textarea
              placeholder="Why should this demon be considered?"
              value={requestForm.notes}
              onChange={event => setRequestForm({ ...requestForm, notes: event.target.value })}
            />
            <small>Provide details about the level, its quality, and why it deserves to be on the list.</small>
          </label>

          <div className="request-submit-row">
            <button
              className="login-button"
              onClick={handleSubmitRequest}
              disabled={requestLoading}
              type="button"
            >
              <Send size={16} />
              {requestLoading ? "Submitting..." : "Submit Request"}
            </button>
            <span>You can edit your request after submitting.</span>
          </div>

          {requestMessage && <p className="admin-success">{requestMessage}</p>}
          {requestError && <p className="admin-error">{requestError}</p>}
        </div>

        <aside className="request-rules-card">
          <div className="request-form-heading">
            <Shield size={22} />
            <div>
              <h3>Request Rules</h3>
              <p>A few guardrails before a request enters the list.</p>
            </div>
          </div>

          <div className="request-rules-list">
            <article>
              <span><Shield size={24} /></span>
              <div>
                <strong>Only demons</strong>
                <p>This archive only accepts demon difficulty levels.</p>
              </div>
            </article>
            <article>
              <span><Hash size={24} /></span>
              <div>
                <strong>Fetched by level ID</strong>
                <p>Requests must include a valid Geometry Dash level ID.</p>
              </div>
            </article>
            <article>
              <span><Ban size={24} /></span>
              <div>
                <strong>No levels harder than Bloodbath</strong>
                <p>Levels harder than Bloodbath cannot be requested.</p>
              </div>
            </article>
            <article>
              <span><CalendarCheck2 size={24} /></span>
              <div>
                <strong>Planned requests do not affect Future List</strong>
                <p>Planned requests will not impact the Future List or In Progress.</p>
              </div>
            </article>
          </div>
        </aside>
      </div>

      <section className="request-submissions-panel">
        <div className="request-submissions-header">
          <div>
            <h2><ListFilter size={22} /> Submissions</h2>
          </div>

          <div className="request-sort-row">
            <span>Sort by</span>
            <select value={requestSort} onChange={event => setRequestSort(event.target.value)}>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>
        </div>

        {requestsLoading ? (
          <div className="request-loading">
            <span className="loading-dot" />
            Loading requests...
          </div>
        ) : requests.length === 0 ? (
          <div className="request-empty">
            <Inbox size={54} />
            <strong>No requests yet</strong>
            <span>New recommendations will appear here after the site fetches their data.</span>
          </div>
        ) : (
          <>
            <div className="request-admin-toolbar">
              <div className="request-filter-tabs">
                {[
                  ["all", "All"],
                  ...REQUEST_STATUSES.map(status => [statusClass(status), status]),
                  ...DIFFICULTY_FILTERS.map(difficulty => [difficulty, difficulty])
                ].map(([value, label]) => (
                  <button
                    key={value}
                    className={requestStatusFilter === value ? "active" : ""}
                    onClick={() => setRequestStatusFilter(value)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="request-table-shell">
              <div className="request-table-row request-table-head">
                <div>Demon</div>
                <div>Status</div>
                <div>Requested</div>
              </div>
              {sortedRequests.map((request, index) => (
                <div
                  className="request-table-row request-click-row"
                  key={`table-${request.levelId}-${index}`}
                  onClick={() => setSelectedRequest(request)}
                  onKeyDown={event => handleOpenKey(event, request)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="request-table-demon">
                    <img
                      src={thumbnailFor(request)}
                      alt={request.demon || request.levelId}
                      onError={event => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                    <span>
                      <strong>{request.demon || `Level ${request.levelId}`}</strong>
                      <small>ID: {request.levelId}</small>
                    </span>
                  </div>
                  <div>{renderStatusPill(request)}</div>
                  <div>{requestDate(request)}</div>
                </div>
              ))}
            </div>

            <div className="request-list">
              {sortedRequests.map((request, index) => (
                <article className="request-card" key={`${request.levelId}-${index}`}>
                  <button className="request-card-open" onClick={() => setSelectedRequest(request)} type="button">
                    <div className="request-thumb-wrap">
                      <img
                        className="request-thumb"
                        src={thumbnailFor(request)}
                        alt={request.demon || request.levelId}
                        onError={event => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    </div>

                    <div className="request-card-content">
                      <div className="request-card-top">
                        <div className="request-card-title">
                          <strong>{request.demon || `Level ${request.levelId}`}</strong>
                          <span>ID: {request.levelId}</span>
                        </div>
                        {renderStatusPill(request)}
                      </div>

                      <div className="request-meta">
                        <span>Requested: {requestDate(request)}</span>
                      </div>

                      {request.notes && <p className="request-notes">{request.notes}</p>}
                    </div>
                  </button>

                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {selectedRequest && (
        <div className="modal-backdrop" onMouseDown={() => setSelectedRequest(null)}>
          <article className="modal request-detail-modal" onMouseDown={event => event.stopPropagation()}>
            <button
              className="close"
              onClick={() => setSelectedRequest(null)}
              type="button"
              aria-label="Close request details"
            >
              <X size={20} />
            </button>

            <div className="request-detail-hero">
              <img
                src={thumbnailFor(selectedRequest)}
                alt={selectedRequest.demon || selectedRequest.levelId}
                onError={event => {
                  event.currentTarget.style.display = "none";
                }}
              />
              <div>
                {isAdmin && (
                  <div className="request-detail-actions-box">
                    {renderQuickActions(selectedRequest)}
                  </div>
                )}
                <p className="eyebrow">Request Detail</p>
                <h2>{selectedRequest.demon || `Level ${selectedRequest.levelId}`}</h2>
                <div className="request-detail-tags">
                  <span>ID: {selectedRequest.levelId}</span>
                  <span>{requestDifficulty(selectedRequest)}</span>
                  {renderStatusPill(selectedRequest)}
                </div>
              </div>
            </div>

            <div className="request-detail-grid">
              <section className="modal-info-card">
                <h3><CheckCircle2 size={20} /> Overview</h3>
                <div className="overview-list">
                  <div><span>Level ID</span><strong>{selectedRequest.levelId}</strong></div>
                  <div><span>Creator</span><strong>{selectedRequest.creator || selectedRequest.creators || "Unknown"}</strong></div>
                  <div><span>Difficulty</span><strong>{requestDifficulty(selectedRequest)}</strong></div>
                  <div><span>Status</span><strong>{normalizeStatus(selectedRequest.status)}</strong></div>
                  <div><span>Requested</span><strong>{requestDate(selectedRequest)}</strong></div>
                </div>
              </section>

              <section className="modal-info-card">
                <h3><Megaphone size={20} /> Request Note</h3>
                <p className="request-notes">{selectedRequest.notes || "No note was added."}</p>
              </section>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}
