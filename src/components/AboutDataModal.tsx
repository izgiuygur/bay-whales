import { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface Props {
  open: boolean;
  onClose: () => void;
}

// Shared "About the data" modal — opens from the site footer link and
// from the contextual "Records have important limitations" note.
//
// Behavior:
//   - Solid white panel on a dimmed backdrop (readable over the map).
//   - Click outside, Escape, or the × button closes it.
//   - Focus is trapped inside while open and returned to the trigger
//     on close.
//   - Body scroll is locked while open.
//   - Panel scrolls vertically if content exceeds the viewport.
export default function AboutDataModal({ open, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Move focus into the modal on open; restore on close.
  useLayoutEffect(() => {
    if (!open) return;
    previouslyFocused.current =
      (document.activeElement as HTMLElement | null) ?? null;
    // Defer one frame so the panel is mounted + painted before focus.
    const id = requestAnimationFrame(() => {
      closeBtnRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (open) return;
    const prev = previouslyFocused.current;
    if (prev && document.body.contains(prev)) prev.focus();
  }, [open]);

  // Escape to close + focus trap.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const root = panelRef.current;
      if (!root) return;
      const focusable = Array.from(
        root.querySelectorAll<HTMLElement>(
          "button, [href], input, [tabindex]:not([tabindex='-1'])"
        )
      ).filter((el) => !el.hasAttribute("disabled"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="about-modal-root"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-data-title"
    >
      <button
        type="button"
        className="about-modal-backdrop"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
      />
      <div className="about-modal-panel" ref={panelRef}>
        <button
          type="button"
          ref={closeBtnRef}
          className="about-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          &times;
        </button>
        <div className="about-modal-body">
          <h2 id="about-data-title" className="about-modal-title">
            About the data
          </h2>
          <p className="about-modal-p">
            Records come from the West Coast Region Marine Mammal Stranding
            Network (WCR-MMSN), coordinated by NOAA Fisheries. Data accessed
            April 7, 2026. 2026 recorded strandings are not included in the
            dataset.
          </p>

          <h3 className="about-modal-h3">How current is this data?</h3>
          <p className="about-modal-p">
            WCR-MMSN records typically lag real-time stranding reports by
            several months to a year. The most recent records included are
            from 2025. For up-to-date 2026 stranding counts, see The Marine
            Mammal Center's whale stranding press materials at{" "}
            <a
              href="https://www.marinemammalcenter.org/news/press-room"
              target="_blank"
              rel="noopener noreferrer"
              className="about-modal-link"
            >
              marinemammalcenter.org
            </a>
            .
          </p>

          <h3 className="about-modal-h3">Contributing organizations</h3>
          <p className="about-modal-p">
            Records on this map were contributed by the following WCR-MMSN
            member organizations:
          </p>
          <ul className="about-modal-list">
            <li>California Academy of Sciences</li>
            <li>The Marine Mammal Center</li>
            <li>NOAA Fisheries, West Coast Region (Long Beach)</li>
            <li>Long Marine Laboratory</li>
            <li>Members of the public reporting through the network</li>
          </ul>

          <h3 className="about-modal-h3">A note on interpretation</h3>
          <p className="about-modal-p">
            Stranding location is not necessarily where the animal died —
            carcasses can drift on winds and currents. Apparent hotspots may
            reflect heavily-visited beaches rather than higher mortality.
            Cause of death is rarely established from stranding records
            alone, and absence of records in an area does not mean
            strandings do not occur there. The WCR-MMSN cautions against
            drawing conclusions from stranding data without consulting the
            network.
          </p>

          <h3 className="about-modal-h3">Citation</h3>
          <p className="about-modal-p">
            National Marine Fisheries Service, U.S. Department of Commerce.
            (2026). <i>Marine Mammal Health and Stranding Response
            Database</i> [Data file]. West Coast Region Marine Mammal
            Stranding Network. Accessed April 7, 2026.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
