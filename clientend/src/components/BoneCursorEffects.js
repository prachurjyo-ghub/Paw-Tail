"use client";

import { useEffect, useState } from "react";

/**
 * Click "chomp" burst that follows the dog-bone cursor theme.
 */
export default function BoneCursorEffects() {
  const [bursts, setBursts] = useState([]);

  useEffect(() => {
    const prefersFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!prefersFinePointer) return undefined;

    const onPointerDown = (event) => {
      if (event.button !== 0) return;

      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const next = { id, x: event.clientX, y: event.clientY };
      setBursts((prev) => [...prev.slice(-8), next]);

      window.setTimeout(() => {
        setBursts((prev) => prev.filter((burst) => burst.id !== id));
      }, 520);
    };

    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  if (!bursts.length) return null;

  return (
    <div className="bone-cursor-layer" aria-hidden="true">
      {bursts.map((burst) => (
        <span
          key={burst.id}
          className="bone-cursor-chomp"
          style={{ left: burst.x, top: burst.y }}
        />
      ))}
    </div>
  );
}
