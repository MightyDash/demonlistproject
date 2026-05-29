import React from "react";
import { X } from "lucide-react";

export function LoginModal({
  loginData,
  setLoginData,
  loginError,
  handleLogin,
  onClose
}) {
  return (
    <div className="modal-backdrop">
      <div className="login-panel">
        <button
          className="login-close-x"
          onClick={onClose}
          type="button"
          aria-label="Close login"
        >
          <X size={20} />
        </button>

        <div className="login-header">
          <p className="login-eyebrow">Admin</p>
          <h2>Admin Login</h2>
          <p>Log in om de admin tools te gebruiken.</p>
        </div>

          <form
            className="login-form admin-login-form"
            autoComplete="on"
            onSubmit={e => {
              e.preventDefault();
              handleLogin();
            }}
          >
            <label>
              Username
              <input
                className="login-input"
                id="admin-username"
                name="username"
                type="text"
                autoComplete="username"
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
                id="admin-password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter password"
                value={loginData.password}
                onChange={e =>
                  setLoginData({ ...loginData, password: e.target.value })
                }
              />
            </label>

            {loginError && <p className="login-error">{loginError}</p>}

            <div className="login-actions">
              <button className="login-button" type="submit">
                Admin login
              </button>

              <button
                className="close-button"
                onClick={onClose}
                type="button"
              >
                Cancel
              </button>
            </div>
          </form>
      </div>
    </div>
  );
}

