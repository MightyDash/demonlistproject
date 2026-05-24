import React from "react";

const PROFILE_FEATURES = [
  {
    title: "My Demon List",
    description: "Your personal list hub will live here."
  },
  {
    title: "My Requests",
    description: "Track the demons you recommended."
  },
  {
    title: "Favorites",
    description: "Save demons you want to revisit."
  },
  {
    title: "Progress Tracker",
    description: "Log attempts, runs and completions."
  }
];

export function ProfilePage({ user, onBack }) {
  return (
    <section className="panel profile-panel">
      <div className="profile-hero">
        <div className="profile-identity">
          {user?.picture ? (
            <img className="profile-avatar" src={user.picture} alt="" />
          ) : (
            <div className="profile-avatar fallback-avatar">
              {(user?.name || "U").charAt(0).toUpperCase()}
            </div>
          )}

          <div>
            <p className="eyebrow">Profile</p>
            <h2>{user?.name || "User"}</h2>
            {user?.email && <p>{user.email}</p>}
          </div>
        </div>

        <button className="admin-button" onClick={onBack} type="button">
          Back to list
        </button>
      </div>

      <div className="build-list-panel">
        <div>
          <p className="eyebrow">Create</p>
          <h3>Build Your Own List!</h3>
          <p>
            Start your personal demon list. Google Sheets sync and list tools can be connected here later.
          </p>
        </div>

        <button
          className="login-button build-list-button"
          onClick={() => window.alert("Build Your Own List is coming soon.")}
          type="button"
        >
          Build Your Own List!
        </button>
      </div>

      <div className="profile-feature-grid">
        {PROFILE_FEATURES.map(feature => (
          <article className="profile-feature-card" key={feature.title}>
            <strong>{feature.title}</strong>
            <span>{feature.description}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
