import { useState, useMemo, useEffect } from "react";
import type { YearRange } from "../App";
import type { YearMarker } from "../data/patterns";

interface Props {
  min: number;
  max: number;
  value: YearRange;
  onChange: (range: YearRange) => void;
  yearCounts: Record<number, number>;
  /** Optional per-year decorations (e.g. heatwave blobs). Story-
   *  scoped — only set while a pattern with `yearMarkers` is active. */
  yearMarkers?: YearMarker[];
}

export default function TimelineSlider({
  min,
  max,
  value,
  onChange,
  yearCounts,
  yearMarkers,
}: Props) {
  // Lookup year → marker for fast per-row access. Memoized so the
  // map isn't rebuilt on every render.
  const markerByYear = useMemo(() => {
    const m = new Map<number, YearMarker>();
    if (yearMarkers) for (const k of yearMarkers) m.set(k.year, k);
    return m;
  }, [yearMarkers]);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [dragStartIdx, setDragStartIdx] = useState<number | null>(null);
  const [dragCurrentIdx, setDragCurrentIdx] = useState<number | null>(null);

  // Rows: ALL at top (idx 0), then year=max..year=min
  const years: (number | null)[] = [null];
  for (let y = max; y >= min; y--) years.push(y);
  const totalStops = years.length;

  // Helper: idx <-> year (idx 0 = ALL; idx 1 = max; idx totalStops-1 = min)
  const yearToIdx = (y: number) => max - y + 1;
  const idxToYear = (i: number): number | null =>
    i === 0 ? null : max - (i - 1);

  // Current committed selection as idx range (inclusive). If ALL, null.
  const committedIdxRange: [number, number] | null = useMemo(() => {
    if (value === null) return null;
    const a = yearToIdx(value.end); // earlier idx (later year)
    const b = yearToIdx(value.start); // later idx (earlier year)
    return [Math.min(a, b), Math.max(a, b)];
  }, [value, max]);

  // Preview range during drag
  const previewIdxRange: [number, number] | null = useMemo(() => {
    if (dragStartIdx === null || dragCurrentIdx === null) return null;
    if (dragStartIdx === 0 || dragCurrentIdx === 0) return null;
    const lo = Math.min(dragStartIdx, dragCurrentIdx);
    const hi = Math.max(dragStartIdx, dragCurrentIdx);
    return [lo, hi];
  }, [dragStartIdx, dragCurrentIdx]);

  const displayIdxRange = previewIdxRange ?? committedIdxRange;
  const isMultiYear =
    displayIdxRange !== null && displayIdxRange[1] > displayIdxRange[0];
  const isAllSelected = value === null && dragStartIdx === null;

  const maxCount = useMemo(
    () => Math.max(1, ...Object.values(yearCounts)),
    [yearCounts]
  );

  const isIdxInRange = (i: number) => {
    if (displayIdxRange === null) return false;
    return i >= displayIdxRange[0] && i <= displayIdxRange[1];
  };

  const handleMouseDown = (idx: number, e: React.MouseEvent) => {
    e.preventDefault();
    if (idx === 0) {
      // ALL clicked — reset
      onChange(null);
      return;
    }
    setDragStartIdx(idx);
    setDragCurrentIdx(idx);
  };

  const handleMouseEnter = (idx: number) => {
    setHoveredIdx(idx);
    if (dragStartIdx !== null && idx !== 0) {
      setDragCurrentIdx(idx);
    }
  };

  // Commit selection on mouseup anywhere in window
  useEffect(() => {
    if (dragStartIdx === null) return;
    const handleUp = () => {
      if (dragStartIdx !== null && dragCurrentIdx !== null) {
        const lo = Math.min(dragStartIdx, dragCurrentIdx);
        const hi = Math.max(dragStartIdx, dragCurrentIdx);
        const startYear = idxToYear(hi) as number; // later idx = earlier year
        const endYear = idxToYear(lo) as number;
        onChange({ start: startYear, end: endYear });
      }
      setDragStartIdx(null);
      setDragCurrentIdx(null);
    };
    window.addEventListener("mouseup", handleUp);
    return () => window.removeEventListener("mouseup", handleUp);
  }, [dragStartIdx, dragCurrentIdx, max, onChange]);

  // Flex rows: each row is (100 / totalStops)% tall, vertical centers at
  // ((i + 0.5) / totalStops) * 100. Range highlight spans from the top
  // center of the first selected row to the bottom center of the last.
  const rowPct = 100 / totalStops;
  const rangeTopPct =
    displayIdxRange !== null
      ? (displayIdxRange[0] + 0.5) * rowPct
      : 0;
  const rangeHeightPct =
    displayIdxRange !== null
      ? (displayIdxRange[1] - displayIdxRange[0]) * rowPct
      : 0;

  return (
    <div
      className="timeline"
      role="region"
      aria-label="Filter strandings by year"
      onMouseLeave={() => setHoveredIdx(null)}
    >
      <div className="timeline-vtrack">
        {/* Middle vertical line */}
        <div className="timeline-vline">
          {isMultiYear && (
            <div
              className="timeline-vline-highlight"
              style={{
                top: `${rangeTopPct}%`,
                height: `${rangeHeightPct}%`,
              }}
            />
          )}
        </div>

        {/* Rows */}
        {years.map((y, i) => {
          const count = y !== null ? yearCounts[y] || 0 : 0;
          const widthPct = count > 0 ? (count / maxCount) * 100 : 0;
          const inRange = isIdxInRange(i);
          const isActiveSingle =
            !isMultiYear &&
            ((y === null && isAllSelected) ||
              (value !== null &&
                value.start === value.end &&
                value.start === y));
          const isHighlighted = inRange || isActiveSingle;
          const isHovered = hoveredIdx === i;
          const labelText = y === null ? "ALL" : String(y);
          return (
            <div
              key={i}
              className={`timeline-vrow ${isHighlighted ? "active" : ""} ${isHovered ? "hovered" : ""}`}
              role="button"
              tabIndex={0}
              aria-label={
                y === null
                  ? "Show all years"
                  : `Filter to year ${y} (${count} strandings)`
              }
              aria-pressed={isHighlighted}
              onMouseDown={(e) => handleMouseDown(i, e)}
              onMouseEnter={() => handleMouseEnter(i)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (i === 0) {
                    onChange(null);
                  } else {
                    const y2 = idxToYear(i) as number;
                    onChange({ start: y2, end: y2 });
                  }
                }
              }}
            >
              <div
                className="timeline-vbar"
                style={{
                  width: `${widthPct}%`,
                  minWidth: count > 0 ? "3px" : undefined,
                }}
              />
              <span
                className={`timeline-vyear ${isHighlighted ? "active" : ""}`}
              >
                {labelText}
              </span>
              {y !== null && markerByYear.has(y) && (
                <span
                  className={`timeline-vmarker timeline-vmarker--${
                    markerByYear.get(y)!.intensity
                  }`}
                  aria-hidden="true"
                  title={markerByYear.get(y)!.label}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
