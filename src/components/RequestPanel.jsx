import React, { useMemo, useState } from "react";
import { CheckCircle2, Clipboard, Eye, Megaphone, Send, Trash2, X } from "lucide-react";

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
  const [selectedRequest, setSelectedRequest] = useState(null);

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
      <div className="admin-panel-header">
        <div>
          <p className="eyebrow">Moik's Geometry Dash Demon Archive</p>
          <h2>Demon Requests</h2>
          <p>Community requests to add new demons to the list.</p>
        </div>

        <button className="admin-button" onClick={onBack} type="button">
          Back to list
        </button>
      </div>

      <div className="request-form">
        <div className="request-form-heading">
          <Megaphone size={22} />
          <div>
            <h3>Submit a Demon Request</h3>
            <p>The site fetches demon data from the level ID. Planned requests do not affect Future List or In Progress.</p>
          </div>
        </div>

        <div className="request-rules">
          <span>Only demons. The site fetches demon data.</span>
          <span>No levels harder than Bloodbath.</span>
        </div>

        <div className="request-form-row">
          <label>
            Level ID
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Level ID"
              value={requestForm.levelId}
              onChange={event => setRequestForm({ ...requestForm, levelId: event.target.value })}
            />
          </label>
        </div>

        <label className="request-description-field">
          Description
          <textarea
            placeholder="Why should this demon be considered?"
            value={requestForm.notes}
            onChange={event => setRequestForm({ ...requestForm, notes: event.target.value })}
          />
        </label>

        <button
          className="login-button"
          onClick={handleSubmitRequest}
          disabled={requestLoading}
          type="button"
        >
          <Send size={16} />
          {requestLoading ? "Submitting..." : "Submit Request"}
        </button>

        {requestMessage && <p className="admin-success">{requestMessage}</p>}
        {requestError && <p className="admin-error">{requestError}</p>}
        <hr className="request-divider" />

        <h2>Submissions</h2>

        {requestsLoading ? (
          <div className="request-loading">
            <span className="loading-dot" />
            Loading requests...
          </div>
        ) : requests.length === 0 ? (
          <div className="request-empty">
            <strong>No requests found.</strong>
            <span>New recommendations will appear here.</span>
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

              <div className="request-sort-row">
                <span>Sort by</span>
                <select value={requestSort} onChange={event => setRequestSort(event.target.value)}>
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                </select>
              </div>
            </div>

            <div className="request-table-shell">
              <div className="request-table-row request-table-head">
                <div>Demon</div>
                <div>Difficulty</div>
                <div>Status</div>
                <div>Requested</div>
                <div>Actions</div>
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
                  <div className="request-table-info">
                    <span>{requestDifficulty(request)}</span>
                  </div>
                  <div>{renderStatusPill(request)}</div>
                  <div>{requestDate(request)}</div>
                  <div className="request-table-actions">
                    <button type="button" onClick={event => {
                      event.stopPropagation();
                      setSelectedRequest(request);
                    }}>
                      <Eye size={15} />
                      Details
                    </button>
                    {renderQuickActions(request)}
                  </div>
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
                        <span>{requestDifficulty(request)}</span>
                        <span>{requestDate(request)}</span>
                      </div>

                      {request.notes && <p className="request-notes">{request.notes}</p>}
                    </div>
                  </button>

                  {renderQuickActions(request)}
                </article>
              ))}
            </div>
          </>
        )}
      </div>

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

            {renderQuickActions(selectedRequest)}
          </article>
        </div>
      )}
    </section>
  );
}
