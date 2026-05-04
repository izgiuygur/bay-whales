import { useEffect, useRef } from "react";
import type { PatternEntry } from "../data/patterns";

interface Props {
  story: PatternEntry;
  onClose: () => void;
  variant: "desktop" | "mobile";
}

// Editorial caption shown while a story is active. Anchors above the
// patterns rail; sized so it never covers more than ~30% of the map.
//
// Focus management: when the panel opens, focus moves to the close
// button so screen readers announce the title and so keyboard users
// can dismiss with Enter. On close, focus returns to whatever was
// focused before — handled by the parent because it owns the rail.
export default function PatternCaption({ story, onClose, variant }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, [story.slug]);

  // Escape closes the story.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <aside
      className={`pattern-caption pattern-caption--${variant}`}
      role="region"
      aria-label="Story caption"
      aria-live="polite"
    >
      <button
        ref={closeRef}
        type="button"
        className="pattern-caption-close"
        onClick={onClose}
        aria-label="Close story"
      >
        ×
      </button>
      <div className="pattern-caption-eyebrow">
        {story.type === "pattern" ? "Pattern" : "Methodology"}
      </div>
      <h2 className="pattern-caption-title">{story.headline}</h2>
      <p className="pattern-caption-body">{story.caption}</p>
      {story.link && (
        <a
          href={story.link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="pattern-caption-link"
        >
          {story.link.label} <span aria-hidden="true">↗</span>
        </a>
      )}
    </aside>
  );
}
