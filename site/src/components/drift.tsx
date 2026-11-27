"use client";

import { useEffect, useRef } from "react";

/**
 * Giant class words drifting behind the glass. The breathing animates a font axis, which
 * re-lays out every letter and re-frosts every glass panel above it each frame, so it only
 * runs while the layer is on screen.
 */
export function Drift({ rows }: { rows: string[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      el.toggleAttribute("data-paused", !entry.isIntersecting);
    }, { rootMargin: "200px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="drift" aria-hidden="true">
      {rows.map((row, r) => (
        <div key={r} className="drift-row" style={{ "--row": r } as React.CSSProperties}>
          <div className="drift-track">
            {Array.from(row + row).map((char, i) => (
              <span key={i}>{char}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
