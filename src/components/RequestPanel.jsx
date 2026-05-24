import React from "react";
import { CheckSquare, Layers, Trash2 } from "lucide-react";

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
  requestStatusDrafts,
  handleRequestStatusDraft,
  handleSaveRequestStatusChanges,
  requestStatusSaving,
  handleDeleteRequest,
  handleAllowWeightIncrease,
  handleAllowWeightIncreaseForAll,
  selectedRejectedRequests,
  handleToggleRejectedRequest,
  handleSelectAllRejected,
  handleDeleteSelectedRequests,
  requestSort,
  setRequestSort,
  requestStatusFilter,
  setRequestStatusFilter,
  currentUser,
  onOpenLogin
}) {
  const filteredRequests = requests.filter(request => {
    if (requestStatusFilter === "all") return true;
    if (requestStatusFilter === "weight-open") return Boolean(request.weightIncreaseAllowed);
    return String(request.status || "Pending").toLowerCase() === requestStatusFilter;
  });

  const sortedRequests = [...filteredRequests].sort((a, b) => {
  if (requestSort === "newest") {
    return new Date(b.timestamp) - new Date(a.timestamp);
  }

  if (requestSort === "oldest") {
    return new Date(a.timestamp) - new Date(b.timestamp);
  }

  if (requestSort === "weight") {
    return Number(b.weight || 1) - Number(a.weight || 1);
  }

  return 0;
});
  const rejectedRowNumbers = sortedRequests
    .filter(request => String(request.status || "").toLowerCase() === "rejected")
    .map(request => request.rowNumber);
  const selectedRejectedCount = selectedRejectedRequests.length;
  const allVisibleRejectedSelected =
    rejectedRowNumbers.length > 0 &&
    rejectedRowNumbers.every(rowNumber => selectedRejectedRequests.includes(rowNumber));

  return (
    <section className="panel request-panel">
      <div className="admin-panel-header">
        <div>
          <p className="eyebrow">Requests</p>
          <h2>Recommend Demon</h2>
          <p>Recommend me a demon I haven't played yet! Platformers are usually rejected.</p>
        </div>

        <button className="admin-button" onClick={onBack} type="button">
          Back to list
        </button>
      </div>

      <div className="request-form">
        {currentUser ? (
          <>
            <div className="request-form-row">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Level ID"
                value={requestForm.levelId}
                onChange={e =>
                  setRequestForm({ ...requestForm, levelId: e.target.value })
                }
              />

              <select
                value={requestForm.type}
                onChange={e =>
                  setRequestForm({ ...requestForm, type: e.target.value })
                }
              >
                <option value="Classic">Classic</option>
                <option value="Platformer">Platformer</option>
              </select>
            </div>

            <textarea
              placeholder="Describe this demon in terms of gameplay, decorations and skillsets"
              value={requestForm.notes}
              onChange={e =>
                setRequestForm({ ...requestForm, notes: e.target.value })
              }
            />

            <button
              className="login-button"
              onClick={handleSubmitRequest}
              disabled={requestLoading}
              type="button"
            >
              {requestLoading ? "Submitting..." : "Submit Request"}
            </button>
          </>
        ) : (
          <div className="request-login-gate">
            <strong>Log in to submit a demon.</strong>
            <span>Guests can view submissions, but only accounts can recommend new demons.</span>
            <button className="login-button" onClick={onOpenLogin} type="button">
              Login
            </button>
          </div>
        )}

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
          ["pending", "Pending"],
          ["approved", "Approved"],
          ["rejected", "Rejected"],
          ["completed", "Completed"],
          ["weight-open", "Weight Open"]
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

        <select
          value={requestSort}
          onChange={e => setRequestSort(e.target.value)}
        >
          <option value="weight">Highest weight</option>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
        </select>
      </div>
    </div>

    {isAdmin && (
      <div className="request-save-bar request-bulk-bar">
        <button
          className="login-button"
          type="button"
          onClick={handleSaveRequestStatusChanges}
          disabled={requestStatusSaving || Object.keys(requestStatusDrafts).length === 0}
        >
          {requestStatusSaving
            ? "Saving..."
            : `Save Status Changes (${Object.keys(requestStatusDrafts).length})`}
        </button>

        <button
          className="admin-button request-bulk-button"
          type="button"
          onClick={handleAllowWeightIncreaseForAll}
        >
          <Layers size={16} />
          Open All Weight Increase
        </button>

        <button
          className="admin-button request-bulk-button"
          type="button"
          onClick={() => handleSelectAllRejected(rejectedRowNumbers)}
          disabled={rejectedRowNumbers.length === 0}
        >
          <CheckSquare size={16} />
          {allVisibleRejectedSelected ? "Unselect Rejected" : "Select Rejected"}
        </button>

        <button
          className="request-delete-selected-button"
          type="button"
          onClick={handleDeleteSelectedRequests}
          disabled={selectedRejectedCount === 0}
        >
          <Trash2 size={16} />
          Delete Selected ({selectedRejectedCount})
        </button>
      </div>
    )}

    <div className="request-list">
      {sortedRequests.map((request, index) => (
        <div
          className="request-card"
          key={`${request.levelId}-${index}`}
        >
          <div className="request-thumb-wrap">
            <img
              className="request-thumb"
              src={`https://levelthumbs.prevter.me/thumbnail/${request.levelId}`}
              alt={request.demon || request.levelId}
              onError={e => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>

          <div className="request-card-content">
            <div className="request-card-top">
              {isAdmin && String(request.status || "").toLowerCase() === "rejected" && (
                <label className="request-select-check">
                  <input
                    type="checkbox"
                    checked={selectedRejectedRequests.includes(request.rowNumber)}
                    onChange={() => handleToggleRejectedRequest(request.rowNumber)}
                  />
                  <span>Select</span>
                </label>
              )}

              <div className="request-card-title">
                <strong>{request.demon || `Level ${request.levelId}`}</strong>
                <span>ID: {request.levelId}</span>
              </div>

              <div className="request-actions">
                {isAdmin ? (
                  <select
                    className={`request-status-select ${String(
                      requestStatusDrafts[request.rowNumber] || request.status || "Pending"
                    ).toLowerCase()}`}
                    value={requestStatusDrafts[request.rowNumber] || request.status || "Pending"}
                    onChange={e => handleRequestStatusDraft(request.rowNumber, e.target.value)}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Dropped">Dropped</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Completed">Completed</option>
                  </select>
                ) : (
                  <span className={`request-status ${String(request.status || "Pending").toLowerCase()}`}>
                    {request.status || "Pending"}
                  </span>
                )}

                {isAdmin && String(request.status || "").toLowerCase() === "rejected" && (
                  <button
                    className="request-delete-button"
                    type="button"
                    onClick={() => handleDeleteRequest(request.rowNumber)}
                    title="Delete request"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>

            <div className="request-meta">
              <span>{request.type || "Classic"}</span>
              <span>Weight: {request.weight || 1}</span>
              {isAdmin && request.submittedBy && <span>Submitted by: {request.submittedBy}</span>}
              {isAdmin && request.weightIncreaseAllowed && <span>Weight Increase open</span>}
            </div>

            {request.notes && <p className="request-notes">{request.notes}</p>}

            {isAdmin && (
              <button
                className="request-weight-button"
                type="button"
                onClick={() => handleAllowWeightIncrease(request.rowNumber)}
                disabled={request.weightIncreaseAllowed}
              >
                {request.weightIncreaseAllowed ? "Weight Increase Open" : "Weight Increase"}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  </>
)}
      </div>
    </section>
  );
}

