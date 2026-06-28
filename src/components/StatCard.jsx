import React from "react";
import { CountUp } from "./effects/CountUp.jsx";

export function StatCard({ icon, label, value, highlight, detail, animate = false }) {
  return (
    <div className={`stat-card ${highlight ? "highlight" : ""}`}>
      <div className="stat-icon">{icon}</div>
      <div>
        <p>{label}</p>
        <strong>{animate ? <CountUp value={value} /> : value}</strong>
        {detail && <small>{detail}</small>}
      </div>
    </div>
  );
}
