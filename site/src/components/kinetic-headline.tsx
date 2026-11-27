"use client";

import { useEffect, useRef, type ReactNode } from "react";

const REACH = 320;

export type Part = { text: string } | { sticker: ReactNode; tone?: "lime" | "ink" };
export type Line = { parts: Part[]; align?: "start" | "indent" | "end" };

export function KineticHeadline({
  label,
  lines,
  className,
  id,
}: {
  label: string;
  lines: Line[];
  className?: string;
  id?: string;
}) {
  const rootRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const letters = Array.from(root.querySelectorAll<HTMLElement>(".k-char"));
    let frame = 0;
    let visible = true;
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    observer.observe(root);

    const setAxes = (values: [number, number][]) => {
      letters.forEach((letter, i) => {
        letter.style.setProperty("--w", String(values[i][0]));
        letter.style.setProperty("--r", String(values[i][1]));
      });
    };

    if (matchMedia("(pointer: fine)").matches) {
      let x = -9999;
      let y = -9999;
      const paint = () => {
        frame = 0;
        if (!visible) return;
        setAxes(
          letters.map((letter): [number, number] => {
            const box = letter.getBoundingClientRect();
            const d = Math.hypot(box.left + box.width / 2 - x, box.top + box.height / 2 - y);
            const t = Math.max(0, 1 - d / REACH);
            const e = t * t * (3 - 2 * t);
            return [Math.round(640 + e * 260), Math.round(e * 100)];
          }),
        );
      };
      const onMove = (event: PointerEvent) => {
        x = event.clientX;
        y = event.clientY;
        if (!frame) frame = requestAnimationFrame(paint);
      };
      const onLeave = () => {
        x = -9999;
        y = -9999;
        if (!frame) frame = requestAnimationFrame(paint);
      };
      window.addEventListener("pointermove", onMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeave);
      return () => {
        window.removeEventListener("pointermove", onMove);
        document.documentElement.removeEventListener("pointerleave", onLeave);
        observer.disconnect();
        cancelAnimationFrame(frame);
      };
    }

    const started = performance.now();
    const wave = (now: number) => {
      if (visible) {
        setAxes(
          letters.map((_, i): [number, number] => {
            const e = (Math.sin((now - started) / 760 - i * 0.32) + 1) / 2;
            return [Math.round(620 + e * 260), Math.round(e * 100)];
          }),
        );
      }
      frame = requestAnimationFrame(wave);
    };
    frame = requestAnimationFrame(wave);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  let index = 0;
  return (
    <h1 ref={rootRef} id={id} className={`kinetic ${className ?? ""}`}>
      <span className="sr-only">{label}</span>
      {lines.map((line, l) => (
        <span key={l} className="k-line" data-align={line.align ?? "start"} aria-hidden="true">
          {line.parts.map((part, p) => {
            if ("text" in part) {
              const start = index;
              index += part.text.length + 1;
              return (
                <span key={p} className="k-word">
                  {Array.from(part.text).map((char, i) => (
                    <span key={i} className="k-char" style={{ "--i": start + i } as React.CSSProperties}>
                      {char}
                    </span>
                  ))}
                </span>
              );
            }
            const i = index++;
            return (
              <Sticker key={p} tone={part.tone} index={i}>
                {part.sticker}
              </Sticker>
            );
          })}
        </span>
      ))}
    </h1>
  );
}

function Sticker({ children, tone, index }: { children: ReactNode; tone?: "lime" | "ink"; index: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  return (
    <span
      ref={ref}
      className="k-sticker"
      data-tone={tone ?? "lime"}
      style={{ "--i": index } as React.CSSProperties}
      onClick={() => {
        const el = ref.current;
        if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        el.classList.remove("is-spinning");
        void el.offsetWidth;
        el.classList.add("is-spinning");
      }}
    >
      {children}
    </span>
  );
}
