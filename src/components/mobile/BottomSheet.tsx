import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

// A lightweight bottom-sheet with drag-to-dismiss / drag-to-expand.
// No external dependency: pointer events + a single transform.
//
// Semantics:
//   - `open` is fully controlled by the parent.
//   - `heights` defines optional snap points as fractions of the
//     viewport height (0 = closed, 1 = full). The first entry is the
//     initial snap when opened; the largest is the expand-to-full
//     target; values below the smallest dismiss the sheet.
//   - Tapping the backdrop, pressing Escape, or dragging far enough
//     below the smallest snap dismisses. Dragging past the top snap
//     jumps to the next snap up (e.g. 0.7 → 1.0).
//
// Accessibility:
//   - Focus is moved into the sheet when it opens, and returned to
//     the previously-focused element on close.
//   - Tab is trapped within the sheet while it's open.

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  /** Sorted ascending, each a viewport-height fraction in (0, 1]. */
  heights?: number[];
  /** aria-label for the dialog. */
  ariaLabel: string;
  /** Custom sticky header (e.g. title + close button). */
  header?: ReactNode;
  /** Sheet body. */
  children: ReactNode;
  /** Optional className applied to the sheet panel. */
  className?: string;
}

const DEFAULT_HEIGHTS = [0.7, 1.0];
const DISMISS_THRESHOLD = 0.12; // fraction of vh below the smallest snap

export default function BottomSheet({
  open,
  onClose,
  heights = DEFAULT_HEIGHTS,
  ariaLabel,
  header,
  children,
  className,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(open);
  const [snapIndex, setSnapIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0); // px dragged (positive = down)
  const draggingRef = useRef<{
    active: boolean;
    startY: number;
    startScrollTop: number;
    scroller: HTMLElement | null;
  }>({ active: false, startY: 0, startScrollTop: 0, scroller: null });

  // Keep the sheet mounted briefly after close so the exit animation can play.
  useEffect(() => {
    if (open) {
      setMounted(true);
      setSnapIndex(0);
      setDragOffset(0);
      return;
    }
    const t = setTimeout(() => setMounted(false), 220);
    return () => clearTimeout(t);
  }, [open]);

  // Focus management.
  useLayoutEffect(() => {
    if (!open) return;
    previouslyFocused.current =
      (document.activeElement as HTMLElement | null) ?? null;
    // Defer so the panel is painted before focusing.
    const id = requestAnimationFrame(() => {
      const first = sheetRef.current?.querySelector<HTMLElement>(
        "[data-autofocus], [autofocus], button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
      );
      first?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (open) return;
    // Restore focus on close (if the saved element is still mounted).
    if (
      previouslyFocused.current &&
      document.body.contains(previouslyFocused.current)
    ) {
      previouslyFocused.current.focus();
    }
  }, [open]);

  // Escape to close.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
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

  // Trap Tab focus within the sheet.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const root = sheetRef.current;
      if (!root) return;
      const focusable = Array.from(
        root.querySelectorAll<HTMLElement>(
          "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
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
  }, [open]);

  // Drag handlers — pointer-based so it works on both touch and mouse.
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Only start drag when grabbing the handle / header area, not when
    // grabbing the scrollable body — otherwise we steal scroll gestures.
    const target = e.target as HTMLElement;
    if (!target.closest("[data-drag-handle]")) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    draggingRef.current = {
      active: true,
      startY: e.clientY,
      startScrollTop: 0,
      scroller: null,
    };
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current.active) return;
      const dy = e.clientY - draggingRef.current.startY;
      setDragOffset(dy);
    },
    []
  );

  const onPointerEnd = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current.active) return;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Some browsers throw when the pointer has already been released.
      }
      const dy = e.clientY - draggingRef.current.startY;
      draggingRef.current.active = false;
      setDragOffset(0);

      const vh = window.innerHeight;
      const currentHeight = heights[snapIndex];
      // Translate drag delta into snap change.
      const dragFrac = dy / vh;
      if (dragFrac > DISMISS_THRESHOLD && snapIndex === 0) {
        onClose();
        return;
      }
      if (dragFrac > 0.08 && snapIndex > 0) {
        setSnapIndex(snapIndex - 1);
        return;
      }
      if (dragFrac < -0.08 && snapIndex < heights.length - 1) {
        setSnapIndex(snapIndex + 1);
        return;
      }
      // Otherwise keep current snap.
      void currentHeight;
    },
    [heights, snapIndex, onClose]
  );

  if (!mounted) return null;

  const activeHeight = heights[snapIndex];
  const vh = typeof window === "undefined" ? 800 : window.innerHeight;
  // When open, translate so the sheet sits `activeHeight * vh` tall.
  // When closing (open=false but still mounted), slide fully off-screen.
  const translateY = open
    ? Math.max(0, dragOffset)
    : vh; // off-screen

  return createPortal(
    <div
      className={`sheet-root ${open ? "sheet-open" : "sheet-closing"}`}
      aria-hidden={!open}
    >
      <button
        type="button"
        className="sheet-backdrop"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        className={`sheet-panel ${className ?? ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        style={{
          height: `${Math.round(activeHeight * 100)}vh`,
          transform: `translateY(${translateY}px)`,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        <div className="sheet-handle-wrap" data-drag-handle>
          <div className="sheet-handle" aria-hidden="true" />
        </div>
        {header && (
          <div className="sheet-header" data-drag-handle>
            {header}
          </div>
        )}
        <div className="sheet-body">{children}</div>
      </div>
    </div>,
    document.body
  );
}
