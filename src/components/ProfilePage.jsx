import React from "react";
import { formatNumber, formatTier } from "../demonUtils.js";

function MiniDemonList({ title, demons, emptyText, onOpenDemon, getMeta }) {
  return (
    <section className="profile-list-panel">
      <div className="profile-section-header">
        <h3>{title}</h3>
        <span>{demons.length}</span>
      </div>

      {demons.length > 0 ? (
        <div className="profile-mini-list">
          {demons.slice(0, 6).map(item => {
            const demon = item.demon || item;
            return (
              <button
                className="profile-mini-card"
                key={`${title}-${demon.id}-${demon.name}`}
                onClick={() => onOpenDemon?.(demon)}
                type="button"
              >
                <span>{demon.placement}</span>
                <strong>{demon.name}</strong>
                <small>{getMeta ? getMeta(item) : `Tier ${formatTier(demon.tier)}`}</small>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="profile-empty-text">{emptyText}</p>
      )}
    </section>
  );
}

export function ProfilePage({
  user,
  favoriteDemons = [],
  progressDemons = [],
  personalList,
  onCreatePersonalList,
  onOpenPersonalList,
  onOpenDemon,
  onBack
}) {
  const completedCount = progressDemons.filter(item => item.progress?.status === "Completed").length;
  const hasPersonalList = Boolean(personalList);

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
          <p className="eyebrow">{hasPersonalList ? "Personal list" : "Create"}</p>
          <h3>{hasPersonalList ? "Go to your Demon List" : "Build Your Own List!"}</h3>
          <p>
            {hasPersonalList
              ? "You already have a personal demon list on this account. Each account can have one list."
              : "Start your personal demon list. Each account can create one personal list."}
          </p>
        </div>

        <button
          className="login-button build-list-button"
          onClick={hasPersonalList ? onOpenPersonalList : onCreatePersonalList}
          type="button"
        >
          {hasPersonalList ? "Go to your Demon List" : "Build Your Own List!"}
        </button>
      </div>

      <div className="profile-stats-grid">
        <article>
          <span>Favorites</span>
          <strong>{formatNumber(favoriteDemons.length)}</strong>
        </article>
        <article>
          <span>Completed</span>
          <strong>{formatNumber(completedCount)}</strong>
        </article>
        <article>
          <span>Personal lists</span>
          <strong>{hasPersonalList ? "1" : "0"}</strong>
        </article>
      </div>

      <div className="profile-lists-grid">
        <MiniDemonList
          title="Favorites"
          demons={favoriteDemons}
          emptyText="Favorite demons from the list to show them here."
          onOpenDemon={onOpenDemon}
        />

        <MiniDemonList
          title="Progress"
          demons={progressDemons}
          emptyText="Mark demons as completed to track them here."
          onOpenDemon={onOpenDemon}
          getMeta={item => `${item.progress?.status || "Tracked"} - ${item.demon.difficulty || "Unknown"}`}
        />
      </div>
    </section>
  );
}

