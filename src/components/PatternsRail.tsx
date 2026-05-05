import { useCallback, useEffect, useRef, useState } from "react";
import { PATTERNS, type PatternEntry } from "../data/patterns";

interface Props {
  /** Slug of the currently active story, or null for explore mode. */
  activeSlug: string | null;
  /** Toggle the given story. Clicking the active pill closes the story. */
  onActivate: (slug: string) => void;
  /** When true, this is the user's first session and the rail does its
   *  initial nudge animation (slide-in / pulse). After any interaction,
   *  the animation never plays again. */
  firstVisit: boolean;
  onDismissNudge: () => void;
  /** Render variant: desktop (fixed bottom over map) vs mobile (inline). */
  variant: "desktop" | "mobile";
}

// Inline SVG icons — simple line shapes, kept under 24px box. Outline
// style keeps both pattern and methodology pills visually consistent
// even though they get different fill treatments.
function Icon({ name }: { name: PatternEntry["icon"] }) {
  switch (name) {
    case "whale":
    case "humpback":
      return (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 12c2-3 5-4 8-4 4 0 7 2 9 5l-2 1c-1-2-3-3-5-3" />
          <path d="M14 13c-1 2-3 3-5 3-2 0-4-1-5-3" />
          <circle cx="17" cy="10" r=".7" fill="currentColor" />
        </svg>
      );
    case "ship":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 17h18l-2 4H5z" />
          <path d="M5 17V8h14v9" />
          <path d="M12 5v3" />
        </svg>
      );
    case "calendar":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      );
    case "spike":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 19l5-11 4 7 3-4 4 8" />
        </svg>
      );
    case "magnifier":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="6" />
          <path d="M20 20l-4-4" />
        </svg>
      );
    case "info":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8h.01M11 12h1v5h1" />
        </svg>
      );
    case "question":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9a2.5 2.5 0 015 0c0 1.5-2.5 2-2.5 4M12 17h.01" />
        </svg>
      );
    case "thermometer":
      // Thermometer with a filled bulb — reads as "heat / temperature"
      // at 14px. Two strokes: bulb circle + stem with cap.
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 14V4a2 2 0 00-4 0v10a4 4 0 104 0z" />
          <circle cx="12" cy="17.5" r="1.6" fill="currentColor" stroke="none" />
        </svg>
      );
    default:
      return null;
  }
}

export default function PatternsRail({
  activeSlug,
  onActivate,
  firstVisit,
  onDismissNudge,
  variant,
}: Props) {
  // Slide-in animation runs on first visit only. We track whether the
  // initial mount has completed so we can flip from "slide-in" to a
  // settled state once the animation finishes.
  const [hasSettled, setHasSettled] = useState(!firstVisit);

  useEffect(() => {
    if (!firstVisit) return;
    // Match the CSS transition duration (700ms slide-in, then a brief
    // pulse window).
    const t = window.setTimeout(() => setHasSettled(true), 5000);
    return () => window.clearTimeout(t);
  }, [firstVisit]);

  // Any user interaction with the rail dismisses the nudge for good.
  const handleInteract = () => {
    if (firstVisit) onDismissNudge();
  };

  // Edge-hover auto-scroll. When the rail overflows and the cursor
  // hovers within ~60px of the left or right edge, smoothly scroll
  // pills into view. Stops on mouseleave, when the cursor moves
  // back into the safe middle, or when the scroll boundary is hit.
  const innerRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<number | null>(null);
  const stopAutoScroll = useCallback(() => {
    if (scrollIntervalRef.current !== null) {
      window.clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  }, []);
  const startAutoScroll = useCallback(
    (direction: -1 | 1) => {
      // If we're already scrolling in the same direction, no need to
      // restart the timer (avoids "stuttering" when the cursor jiggles
      // inside the edge zone).
      if (scrollIntervalRef.current !== null) return;
      scrollIntervalRef.current = window.setInterval(() => {
        const el = innerRef.current;
        if (!el) return stopAutoScroll();
        const before = el.scrollLeft;
        // ~2px/frame at 60fps = ~125px/sec. Slow and gentle.
        el.scrollLeft = before + direction * 2;
        // If we couldn't scroll any further, stop.
        if (el.scrollLeft === before) stopAutoScroll();
      }, 16);
    },
    [stopAutoScroll]
  );
  const handleRailMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Edge-hover scroll runs in BOTH default and story modes —
      // browsing other patterns without exiting the current story is
      // a viewing action, not a state-modifying one. (Same logic that
      // keeps map pan/zoom interactive during stories.)
      const el = innerRef.current;
      if (!el) return;
      // No overflow → nothing to scroll, bail.
      if (el.scrollWidth <= el.clientWidth) return stopAutoScroll();
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const edgeSize = 60;
      const atLeft = el.scrollLeft <= 0;
      const atRight = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
      if (x < edgeSize && !atLeft) startAutoScroll(-1);
      else if (x > rect.width - edgeSize && !atRight) startAutoScroll(1);
      else stopAutoScroll();
    },
    [startAutoScroll, stopAutoScroll]
  );

  // Track whether each side of the rail has more content to scroll
  // toward. Drives chevron-button visibility and the conditional
  // edge-fade gradient. Updated on scroll, on resize, and when the
  // pattern list changes (rare, but `PATTERNS` could be edited).
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const updateScrollAffordances = useCallback(() => {
    const el = innerRef.current;
    if (!el) return;
    const hasOverflow = el.scrollWidth > el.clientWidth + 1;
    const atLeft = el.scrollLeft <= 0;
    const atRight = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
    setCanScrollLeft(hasOverflow && !atLeft);
    setCanScrollRight(hasOverflow && !atRight);
  }, []);
  useEffect(() => {
    updateScrollAffordances();
    const el = innerRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollAffordances, { passive: true });
    const ro = new ResizeObserver(updateScrollAffordances);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollAffordances);
      ro.disconnect();
    };
  }, [updateScrollAffordances]);

  // Chevron click → smooth-scroll by ~2.5 pill widths in that
  // direction. The browser respects prefers-reduced-motion natively
  // when smooth scroll is requested, so no extra carve-out needed.
  const scrollByPills = useCallback((direction: -1 | 1) => {
    const el = innerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * 320, behavior: "smooth" });
  }, []);

  // When a story becomes active (or the user switches stories), smooth-
  // scroll the active pill so it sits centered in the rail viewport.
  // Closing a story leaves the carousel where it is — letting the
  // user see roughly the same set of pills they just had focused.
  useEffect(() => {
    if (!activeSlug) return;
    const el = innerRef.current;
    if (!el) return;
    const target = el.querySelector<HTMLElement>(
      `[data-slug="${CSS.escape(activeSlug)}"]`
    );
    if (!target) return;
    target.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [activeSlug]);
  // Always clean up the interval on unmount.
  useEffect(() => () => stopAutoScroll(), [stopAutoScroll]);

  if (PATTERNS.length === 0) return null;

  const railClasses = [
    "patterns-rail",
    `patterns-rail--${variant}`,
    firstVisit && !hasSettled ? "patterns-rail--nudge" : "",
    activeSlug ? "patterns-rail--story-active" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={railClasses}
      role="group"
      aria-label="Curated patterns and stories"
      onMouseEnter={handleInteract}
      onTouchStart={handleInteract}
    >
      {/* Kicker doubles as a "scroll to start" affordance when no
          story is active. Disabled (purely decorative) while a story
          is active — the carousel is locked in story mode and the
          active pill is the focal point. */}
      <button
        type="button"
        className="patterns-rail-kicker"
        disabled={!!activeSlug}
        onClick={() => {
          const el = innerRef.current;
          if (!el) return;
          el.scrollTo({ left: 0, behavior: "smooth" });
        }}
        aria-label="Scroll patterns rail to start"
      >
        Patterns
      </button>
      <div className="patterns-rail-scroll-wrap">
        {/* Chevron — left. Renders on both desktop and mobile so the
            user has a tap target for scrolling, only when there's
            content to scroll left toward. */}
        {canScrollLeft && (
          <button
            type="button"
            className="patterns-rail-chevron patterns-rail-chevron--left"
            onClick={() => scrollByPills(-1)}
            aria-label="Scroll patterns rail left"
          >
            ‹
          </button>
        )}
        <div
          className="patterns-rail-inner"
          ref={innerRef}
          onMouseMove={handleRailMouseMove}
          onMouseLeave={stopAutoScroll}
          // Drive the edge-fade mask via CSS variables — width of
          // each fade is 0 when at that boundary, 24px otherwise.
          style={
            {
              "--fade-left": canScrollLeft ? "24px" : "0px",
              "--fade-right": canScrollRight ? "24px" : "0px",
            } as React.CSSProperties
          }
        >
          {PATTERNS.map((p) => {
          const isActive = activeSlug === p.slug;
          const ariaLabelPrefix =
            p.type === "pattern" ? "Pattern" : "Methodology note";
          return (
            <button
              key={p.slug}
              type="button"
              data-slug={p.slug}
              className={[
                "pattern-pill",
                `pattern-pill--${p.type}`,
                isActive ? "is-active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => {
                handleInteract();
                onActivate(p.slug);
                // The activeSlug effect below scrolls the newly-
                // active pill to center automatically — no per-click
                // scroll needed.
              }}
              aria-pressed={isActive}
              aria-label={`${ariaLabelPrefix}: ${p.headline}`}
              title={p.subhead}
            >
              <span className="pattern-pill-icon" aria-hidden="true">
                <Icon name={p.icon} />
              </span>
              <span className="pattern-pill-label">{p.headline}</span>
              {/* Inactive pill: arrow appears only on hover (CSS-driven).
                  Active pill: × is always shown so the close affordance
                  is unambiguous. */}
              <span className="pattern-pill-arrow" aria-hidden="true">
                {isActive ? "×" : "→"}
              </span>
            </button>
          );
        })}
        </div>
        {/* Chevron — right. Renders on both desktop and mobile when
            there's more content to the right. */}
        {canScrollRight && (
          <button
            type="button"
            className="patterns-rail-chevron patterns-rail-chevron--right"
            onClick={() => scrollByPills(1)}
            aria-label="Scroll patterns rail right"
          >
            ›
          </button>
        )}
      </div>
    </div>
  );
}
