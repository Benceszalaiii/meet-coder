"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Undo2, Redo2, ScanText, FileCode2, NotebookPen, History } from "lucide-react";

type Step = {
  lines: string[];
  header: string;
  note: string;
  time: string;
};

const FILE = "routes/termekek.js";

const STEPS: Step[] = [
  {
    lines: ['import { Router } from "express";', "", "const router = Router();", ""],
    header: "Termékek útvonal létrehozva",
    note: "Külön Express Router a termékeknek, a routes mappában.",
    time: "10:02",
  },
  {
    lines: [
      'router.get("/", async (req, res) => {',
      "  const termekek = await db.termek.findMany();",
      "  res.json(termekek);",
      "});",
      "",
    ],
    header: "Termékek listázása GET végponttal",
    note: "GET /termekek: az összes terméket JSON-ként adja vissza.",
    time: "10:07",
  },
  {
    lines: [
      'router.get("/:id", async (req, res) => {',
      "  const termek = await db.termek.find(req.params.id);",
      '  if (!termek) return res.status(404).json({ hiba: "Nincs ilyen" });',
      "  res.json(termek);",
      "});",
      "",
    ],
    header: "Egy termék lekérése, 404-es hibával",
    note: "Ha nincs ilyen azonosító, 404-et küld vissza hibaüzenettel.",
    time: "10:15",
  },
  {
    lines: ["export default router;"],
    header: "Útvonal exportálva",
    note: 'Az app.js-ben bekötve: app.use("/termekek", router).',
    time: "10:18",
  },
];

const TOTAL_CHARS = STEPS.map((s) => s.lines.join("\n").length);
const CHAR_MS = 26;
const PAUSE_MS = 1100;

/** Leading spaces, so a wrapped line continues right of its own indent. */
const indentOf = (line: string) => line.length - line.trimStart().length;

type Phase = "idle" | "typing" | "detected" | "done";

export function ClassDemo({ onResolved }: { onResolved?: (resolved: boolean) => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [typed, setTyped] = useState(0);
  const [applied, setApplied] = useState<number[]>([]);
  const [undone, setUndone] = useState<Set<number>>(new Set());
  const [phase, setPhase] = useState<Phase>("idle");
  const [playing, setPlaying] = useState(false);
  const [frames, setFrames] = useState(0);
  const [fresh, setFresh] = useState<number | null>(null);
  const [inView, setInView] = useState(false);

  // Reduced motion: show the finished class, no typing.
  const reduced = useRef(false);
  useEffect(() => {
    reduced.current = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced.current) {
      setStep(STEPS.length - 1);
      setTyped(TOTAL_CHARS[STEPS.length - 1]);
      setApplied(STEPS.map((_, i) => i));
      setFrames(1284);
      setPhase("done");
    }
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Start once it is first seen.
  const started = useRef(false);
  useEffect(() => {
    if (inView && !started.current && !reduced.current) {
      started.current = true;
      setPlaying(true);
      setPhase("typing");
    }
  }, [inView]);

  const running = playing && inView && phase !== "done";

  // Capture runs at 3 fps: frames tick whether or not anything changed.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setFrames((f) => f + 1), 333);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (!running) return;
    if (phase === "typing") {
      if (typed < TOTAL_CHARS[step]) {
        const id = setTimeout(() => setTyped((t) => Math.min(TOTAL_CHARS[step], t + 2)), CHAR_MS * 2);
        return () => clearTimeout(id);
      }
      const id = setTimeout(() => setPhase("detected"), 380);
      return () => clearTimeout(id);
    }
    if (phase === "detected") {
      const id = setTimeout(() => {
        setApplied((a) => (a.includes(step) ? a : [...a, step]));
        setFresh(step);
        if (step < STEPS.length - 1) {
          setStep(step + 1);
          setTyped(0);
          setPhase("typing");
        } else {
          setPhase("done");
        }
      }, PAUSE_MS);
      return () => clearTimeout(id);
    }
  }, [running, phase, typed, step]);

  useEffect(() => {
    if (fresh === null) return;
    const id = setTimeout(() => setFresh(null), 1600);
    return () => clearTimeout(id);
  }, [fresh]);

  useEffect(() => {
    onResolved?.(phase === "done");
  }, [phase, onResolved]);

  const restart = useCallback(() => {
    setStep(0);
    setTyped(0);
    setApplied([]);
    setUndone(new Set());
    setFrames(0);
    setFresh(null);
    setPhase("typing");
    setPlaying(true);
  }, []);

  const toggleUndo = (i: number) => {
    setUndone((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  // What the teacher's screen shows: every earlier step plus the one being typed.
  const screenText =
    STEPS.slice(0, step)
      .map((s) => s.lines.join("\n"))
      .join("\n") +
    (step > 0 ? "\n" : "") +
    STEPS[step].lines.join("\n").slice(0, typed);
  const screenLines = screenText.split("\n");
  const typingStart = STEPS.slice(0, step).reduce((n, s) => n + s.lines.length, 0);

  const kept = applied.filter((i) => !undone.has(i)).sort((a, b) => a - b);
  const changed = applied.length;

  return (
    <div ref={rootRef} className="demo glass" data-phase={phase}>
      <div className="demo-bar">
        <span className="demo-live" data-on={running || undefined}>
          <span className="demo-dot" />
          {phase === "done" ? "Óra vége" : running ? "Élő" : "Szünetel"}
        </span>
        <span className="demo-source">Kovács tanár képernyője</span>
        <span className="demo-stats">
          <span>
            <b>{frames.toLocaleString("hu-HU")}</b> képkocka
          </span>
          <span>
            <b>{changed}</b> változott
          </span>
        </span>
        <span className="demo-tag">Példa</span>
        <span className="demo-controls">
          <button
            type="button"
            className="icon-btn"
            onClick={() => (phase === "done" ? restart() : setPlaying((p) => !p))}
            aria-label={phase === "done" ? "Újrajátszás" : playing ? "Szünet" : "Lejátszás"}
            disabled={phase === "idle"}
          >
            {phase === "done" ? <RotateCcw /> : playing ? <Pause /> : <Play />}
          </button>
        </span>
      </div>

      <div className="demo-grid">
        <section className="demo-pane demo-screen" aria-label="A tanár megosztott képernyője (példa)">
          <h3 className="pane-title">
            <ScanText aria-hidden="true" />A tanár képernyője
          </h3>
          <div className="screen">
            <div className="screen-tab">{FILE}</div>
            <pre className="code" aria-hidden="true">
              {screenLines.map((line, i) => (
                <span
                  key={i}
                  className="code-line"
                  style={{ "--ind": indentOf(line) } as React.CSSProperties}
                  data-active={(i >= typingStart && phase !== "done") || undefined}
                >
                  <span className="ln">{i + 1}</span>
                  {line || " "}
                  {i === screenLines.length - 1 && phase === "typing" && <span className="caret" />}
                </span>
              ))}
            </pre>
            <span className="screen-scan" data-on={phase === "detected" || undefined}>
              Változás észlelve
            </span>
          </div>
        </section>

        <section className="demo-pane demo-file" aria-label="A te projekted (példa)">
          <h3 className="pane-title">
            <FileCode2 aria-hidden="true" />A te projekted
          </h3>
          <p className="file-path">
            ~/<wbr />school/<wbr />projects/<wbr />
            <b>webshop</b>/<wbr />routes/<wbr />termekek.js
          </p>
          <pre className="code code-local">
            {kept.length === 0 ? (
              <span className="code-empty">Még üres. Az első változás után ide kerül a kód.</span>
            ) : (
              kept.map((i) =>
                STEPS[i].lines.map((line, j) => (
                  <span
                    key={`${i}-${j}`}
                    className="code-line"
                    data-fresh={fresh === i || undefined}
                    style={{ "--ind": indentOf(line) } as React.CSSProperties}
                  >
                    {line || " "}
                  </span>
                )),
              )
            )}
          </pre>
        </section>

        <section className="demo-pane demo-notes" aria-label="Jegyzet (példa)">
          <h3 className="pane-title">
            <NotebookPen aria-hidden="true" />
            Jegyzet
          </h3>
          <ol className="notes">
            {applied.map((i) => (
              <li key={i} className="note">
                {STEPS[i].note}
              </li>
            ))}
            {applied.length === 0 && <li className="note note-empty">A jegyzet az órával együtt íródik.</li>}
          </ol>
        </section>

        <section className="demo-pane demo-log" aria-label="Változások (példa)">
          <h3 className="pane-title">
            <History aria-hidden="true" />
            Változások
          </h3>
          <ul className="log">
            {[...applied].reverse().map((i) => {
              const off = undone.has(i);
              return (
                <li key={i} className="log-row" data-undone={off || undefined}>
                  <span className="log-time">{STEPS[i].time}</span>
                  <span className="log-header">{STEPS[i].header}</span>
                  <button
                    type="button"
                    className="log-undo"
                    onClick={() => toggleUndo(i)}
                    aria-label={`${off ? "Visszaállítás" : "Visszavonás"}: ${STEPS[i].header}`}
                  >
                    {off ? <Redo2 aria-hidden="true" /> : <Undo2 aria-hidden="true" />}
                    {off ? "Visszaállítás" : "Visszavonás"}
                  </button>
                </li>
              );
            })}
            {applied.length === 0 && <li className="log-row log-empty">Itt jelenik meg minden módosítás.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
