import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { YearRange } from "../../App";
import type { YearMarker } from "../../data/patterns";

interface Props {
  min: number;
  max: number;
  yearCounts: Record<number, number>;
  value: YearRange;
  onChange: (v: YearRange) => void;
  /** Optional per-year decorations (e.g. heatwave blobs). Story-
   *  scoped — only set while a pattern with `yearMarkers` is active. */
  yearMarkers?: YearMarker[];
}

// Horizontally-scrollable row: "ALL" + each year descending.
// Each year shows a tiny bar underneath reflecting its count, the
// same bar the desktop TimelineSlider draws (rotated horizontal).
//
// The strip also gets a pair of fade-in chevron buttons mirroring
// the patterns rail's affordance. Visible only when there's more
// content to scroll toward in that direction.
export default function YearStrip({
  min,
  max,
  yearCounts,
  value,
  onChange,
  yearMarkers,
}: Props) {
  const markerByYear = useMemo(() => {
    const m = new Map<number, YearMarker>();
    if (yearMarkers) for (const k of yearMarkers) m.set(k.year, k);
    return m;
  }, [yearMarkers]);
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

  // Scroll-position tracking for chevron visibility, mirrored from
  // the patterns rail. Updates on scroll + on layout changes
  // (window resize, content reflow).
  const navRef = useRef<HTMLElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const updateScrollAffordances = useCallback(() => {
    const el = navRef.current;
    if (!el) return;
    const hasOverflow = el.scrollWidth > el.clientWidth + 1;
    const atLeft = el.scrollLeft <= 0;
    const atRight = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
    setCanScrollLeft(hasOverflow && !atLeft);
    setCanScrollRight(hasOverflow && !atRight);
  }, []);
  useEffect(() => {
    updateScrollAffordances();
    const el = navRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollAffordances, { passive: true });
    const ro = new ResizeObserver(updateScrollAffordances);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollAffordances);
      ro.disconnect();
    };
  }, [updateScrollAffordances]);
  const scrollByYears = useCallback((direction: -1 | 1) => {
    const el = navRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * 200, behavior: "smooth" });
  }, []);

  return (
    <div className="m-year-strip-wrap">
      {canScrollLeft && (
        <button
          type="button"
          className="m-year-strip-chevron m-year-strip-chevron--left"
          onClick={() => scrollByYears(-1)}
          aria-label="Scroll years left"
        >
          ‹
        </button>
      )}
      <nav className="m-year-strip" aria-label="Filter by year" ref={navRef}>
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
                  {markerByYear.has(y) && (
                    <span
                      className={`m-year-chip-marker m-year-chip-marker--${
                        markerByYear.get(y)!.intensity
                      }`}
                      aria-hidden="true"
                      title={markerByYear.get(y)!.label}
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      {canScrollRight && (
        <button
          type="button"
          className="m-year-strip-chevron m-year-strip-chevron--right"
          onClick={() => scrollByYears(1)}
          aria-label="Scroll years right"
        >
          ›
        </button>
      )}
    </div>
  );
}
