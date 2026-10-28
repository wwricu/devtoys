"use client";

// Importing the module runs its one-time idle warm-up of the zone formatter
// caches before the converter is ever opened; the component renders nothing.
import "./zone";

export default function ZoneWarmup() {
  return null;
}
