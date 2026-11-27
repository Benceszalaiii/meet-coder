export function Drift({ rows }: { rows: string[] }) {
  return (
    <div className="drift" aria-hidden="true">
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
