import React, { useEffect, useState } from "react";

const STORAGE_KEY = "prefersReducedMotionOverride"; // values: "reduce" | "no-preference" | null

export function MotionToggle() {
  const [pref, setPref] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (pref) {
      document.documentElement.dataset.motion = pref;
      try {
        localStorage.setItem(STORAGE_KEY, pref);
      } catch {
        /* ignore */
      }
    } else {
      document.documentElement.removeAttribute("data-motion");
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
  }, [pref]);

  const systemReduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const effective = pref || (systemReduced ? "reduce" : "no-preference");

  function cycle() {
    setPref((current) => {
      if (current === "reduce") return "no-preference";
      if (current === "no-preference") return null;
      return "reduce";
    });
  }

  let label: string;
  if (pref === null)
    label = systemReduced ? "Motion: System (Reduced)" : "Motion: System";
  else if (effective === "reduce") label = "Motion: Reduced";
  else label = "Motion: Full";

  return (
    <button
      type="button"
      className="btn btn-outline motion-toggle"
      aria-pressed={pref !== null}
      onClick={cycle}
    >
      {label}
    </button>
  );
}
