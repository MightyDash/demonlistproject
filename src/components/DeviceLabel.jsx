import React from "react";
import { Laptop, Monitor, Smartphone } from "lucide-react";
import { normalizeDevice } from "../deviceUtils.js";

const DEVICE_ICONS = {
  PC: Monitor,
  Laptop,
  Mobile: Smartphone
};

export function DeviceLabel({ device, className = "", iconSize = 16 }) {
  const label = normalizeDevice(device);
  if (!label) return null;

  const Icon = DEVICE_ICONS[label];
  return (
    <span className={`device-label ${className}`.trim()}>
      <Icon size={iconSize} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
