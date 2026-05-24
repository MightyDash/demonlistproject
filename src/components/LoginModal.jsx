import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

export function LoginModal({
  loginData,
  setLoginData,
  loginError,
  handleLogin,
  googleClientId,
  onGoogleLogin,
  onClose
}) {
  const googleButtonRef = useRef(null);
  const [adminOpen, setAdminOpen] = useState(false);

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) return;

    function renderGoogleButton() {
      if (!window.google?.accounts?.id || !googleButtonRef.current) return;

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: response => {
          if (response.credential) onGoogleLogin(response.credential);
        }
      });

      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "filled_black",
        size: "large",
        shape: "pill",
        width: 360,
        text: "continue_with"
      });
    }

    if (window.google?.accounts?.id) {
      renderGoogleButton();
      return;
    }

    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    const script = existingScript || document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = renderGoogleButton;

    if (!existingScript) document.body.appendChild(script);
  }, [googleClientId, onGoogleLogin]);

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
          <p>Log in met je Google account. Account functies komen later.</p>
        </div>

        <div className="google-login-box">
          {googleClientId ? (
            <div className="google-login-button" ref={googleButtonRef} />
          ) : (
            <p className="login-hint">
              Google login is bijna klaar. Voeg `VITE_GOOGLE_CLIENT_ID` toe in Render om dit te activeren.
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

