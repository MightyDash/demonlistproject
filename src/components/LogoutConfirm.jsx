import React from "react";

export function LogoutConfirm({ onConfirm, onCancel }) {
  return (
          <div className="modal-backdrop">
            <div className="confirm-panel">
              <h2>Logout?</h2>
              <p>Weet je zeker dat je wilt uitloggen?</p>
    
              <div className="confirm-actions">
                <button className="logout-confirm-button" onClick={onConfirm} type="button">
                  Ja, log uit
                </button>
    
                <button className="close-button" onClick={onCancel} type="button">
                  Annuleren
                </button>
              </div>
            </div>
          </div>
  );
}
