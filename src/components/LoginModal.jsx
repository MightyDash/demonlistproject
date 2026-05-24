import React, { useState } from "react";
import { X } from "lucide-react";

export function LoginModal({
  loginData,
  setLoginData,
  loginError,
  handleLogin,
  supabaseConfigured,
  onSupabaseLogin,
  onClose
}) {
  const [adminOpen, setAdminOpen] = useState(false);

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
          <p className="login-eyebrow">Account</p>
          <h2>Login</h2>
          <p>Log in met je Google account om je profiel te openen.</p>
        </div>

        <div className="google-login-box">
          {supabaseConfigured ? (
            <button className="google-auth-button" onClick={onSupabaseLogin} type="button">
              <span className="google-mark">G</span>
              Doorgaan met Google
            </button>
          ) : (
            <p className="login-hint">
              Supabase login is bijna klaar. Voeg `VITE_SUPABASE_URL` en `VITE_SUPABASE_ANON_KEY` toe in Render.
            </p>
          )}
        </div>

        <button
          className="admin-access-toggle"
          onClick={() => setAdminOpen(open => !open)}
          type="button"
        >
          Admin access
        </button>

        {adminOpen && (
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
        )}
      </div>
    </div>
  );
}

