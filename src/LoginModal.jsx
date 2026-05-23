import React from "react";
import { X } from "lucide-react";

export function LoginModal({ loginData, setLoginData, loginError, handleLogin, onClose }) {
  return (
          <div className="modal-backdrop">
            <div className="login-panel">
              <button
                className="login-close-x"
                onClick={onClose}
                type="button"
              >
                <X size={20} />
              </button>
    
              <div className="login-header">
                <p className="login-eyebrow">Admin Area</p>
                <h2>Admin Login</h2>
                <p>Login om toegang te krijgen tot het admin panel.</p>
              </div>
    
              <div className="login-form">
                <label>
                  Username
                  <input
                    className="login-input"
                    placeholder="Enter username"
                    value={loginData.username}
                    onChange={e =>
                      setLoginData({ ...loginData, username: e.target.value })
                    }
                  />
                </label>
    
                <label>
                  Password
                  <input
                    className="login-input"
                    type="password"
                    placeholder="Enter password"
                    value={loginData.password}
                    onChange={e =>
                      setLoginData({ ...loginData, password: e.target.value })
                    }
                    onKeyDown={e => {
                      if (e.key === "Enter") handleLogin();
                    }}
                  />
                </label>
    
                {loginError && <p className="login-error">{loginError}</p>}
    
                <div className="login-actions">
                  <button className="login-button" onClick={handleLogin} type="button">
                    Login
                  </button>
    
                  <button
                    className="close-button"
                    onClick={onClose}
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
  );
}
