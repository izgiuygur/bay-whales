import { useMemo } from "react";
import type { YearRange } from "../../App";

interface Props {
  min: number;
  max: number;
  yearCounts: Record<number, number>;
  value: YearRange;
  onChange: (v: YearRange) => void;
}

// Horizontally-scrollable row: "ALL" + each year descending.
// Each year shows a tiny bar underneath reflecting its count, the
// same bar the desktop TimelineSlider draws (rotated horizontal).
export default function YearStrip({
  min,
  max,
  yearCounts,
  value,
  onChange,
}: Props) {
  const years = useMemo(() => {
    const out: number[] = [];
    for (let y = max; y >= min; y--) out.push(y);
    return out;
  }, [min, max]);

  const maxCount = useMemo(() => {
    let m = 1;
    for (const y of years) m = Math.max(m, yearCounts[y] ?? 0);
    return m;
  }, [years, yearCounts]);

  const isAllActive = value === null;
  const isYearActive = (y: number) =>
    value !== null && value.start === y && value.end === y;

  return (
    <nav className="m-year-strip" aria-label="Filter by year">
      <ul className="m-year-strip-list">
        <li>
          <button
            type="button"
            className={`m-year-chip ${isAllActive ? "active" : ""}`}
            aria-pressed={isAllActive}
            onClick={() => onChange(null)}
          >
            <span className="m-year-chip-label">ALL</span>
            <span className="m-year-chip-bar" aria-hidden="true" />
          </button>
        </li>
        {years.map((y) => {
          const active = isYearActive(y);
          const c = yearCounts[y] ?? 0;
          const barPct = Math.round((c / maxCount) * 100);
          return (
            <li key={y}>
              <button
                type="button"
                className={`m-year-chip ${active ? "active" : ""}`}
                aria-pressed={active}
                aria-label={`Filter to year ${y} (${c} strandings)`}
                onClick={() => onChange({ start: y, end: y })}
              >
                <span className="m-year-chip-label">{y}</span>
                <span className="m-year-chip-bar" aria-hidden="true">
                  <span
                    className="m-year-chip-bar-fill"
                    style={{ width: `${Math.max(6, barPct)}%` }}
                  />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
