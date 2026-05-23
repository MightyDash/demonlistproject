import React from "react";

export function Detail({ label, value }) {
  function copy() {
    if (!value) return;
    navigator.clipboard.writeText(String(value));
  }

  return (
    <div className="detail" onClick={copy} style={{ cursor: value ? "pointer" : "default" }}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
