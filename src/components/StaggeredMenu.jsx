import React, { useEffect, useState } from "react";
import { Home, LogIn, LogOut, Menu, Shield, Trophy, X, Clock3, Inbox } from "lucide-react";

export function StaggeredMenu({
  source,
  isAdmin,
  adminView,
  onHome,
  onHistory,
  onMilestones,
  onRequests,
  onLogin,
  onAdmin,
  onLogout
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const items = [
    { label: "Demon List", detail: "Browse all completed demons", icon: Home, action: onHome },
    { label: "List Changes", detail: "Explore ranking history", icon: Clock3, action: onHistory },
    { label: "Milestones", detail: "View major achievements", icon: Trophy, action: onMilestones },
    { label: "Demon Requests", detail: "Suggest a level", icon: Inbox, action: onRequests }
  ];

  if (isAdmin) {
    items.push({
      label: adminView ? "Back to list" : "Admin Panel",
      detail: adminView ? "Return to the archive" : "Manage the archive",
      icon: Shield,
      action: adminView ? onHome : onAdmin
    });
    items.push({ label: "Logout", detail: "End admin session", icon: LogOut, action: onLogout });
  } else {
    items.push({ label: "Admin Login", detail: "Open administrator access", icon: LogIn, action: onLogin });
  }

  function runAction(action) {
    setOpen(false);
    action?.();
  }

  return (
    <div className={`staggered-menu ${open ? "is-open" : ""}`}>
      <button
        className="staggered-menu-toggle"
        onClick={() => setOpen(value => !value)}
        type="button"
        aria-expanded={open}
        aria-label={open ? "Close navigation" : "Open navigation"}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
        <span>{open ? "Close" : "Menu"}</span>
      </button>

      <button
        className="staggered-menu-backdrop"
        onClick={() => setOpen(false)}
        type="button"
        aria-label="Close navigation"
        tabIndex={open ? 0 : -1}
      />

      <aside className="staggered-menu-panel" aria-hidden={!open}>
        <div className="staggered-menu-layer layer-one" />
        <div className="staggered-menu-layer layer-two" />
        <div className="staggered-menu-content">
          <div className="staggered-menu-heading">
            <span className={`menu-live-dot ${source}`} />
            <div>
              <small>Archive navigation</small>
              <strong>{source === "live" ? "Live data connected" : source === "mock" ? "Offline preview" : "Connecting..."}</strong>
            </div>
          </div>

          <nav>
            {items.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={() => runAction(item.action)}
                  style={{ "--menu-index": index }}
                  type="button"
                  tabIndex={open ? 0 : -1}
                >
                  <span className="menu-item-number">{String(index + 1).padStart(2, "0")}</span>
                  <Icon size={20} />
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.detail}</small>
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>
    </div>
  );
}
