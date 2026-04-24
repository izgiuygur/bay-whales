import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { ShareableState } from "../lib/shareState";
import { buildShareUrl, summarize } from "../lib/shareState";

interface Props {
  /** Called when the popover opens; should return the current state. */
  getState: () => ShareableState;
  /** Currently-visible stranding count, used for the summary line. */
  recordCount: number;
}

export default function ShareButton({ getState, recordCount }: Props) {
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<ShareableState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [copyFallback, setCopyFallback] = useState(false);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Capture a fresh state snapshot every time the popover opens so the
  // URL reflects "right now", not when the app mounted.
  const openPopover = () => {
    setSnapshot(getState());
    setCopyFallback(false);
    setToast(null);
    setOpen(true);
  };

  const closePopover = () => {
    setOpen(false);
    // Return focus to the trigger for keyboard users.
    buttonRef.current?.focus();
  };

  // Auto-hide the toast after a few seconds.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  // Close on Escape, click-outside.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePopover();
    };
    const onClick = (e: MouseEvent) => {
      const pop = popoverRef.current;
      const btn = buttonRef.current;
      const target = e.target as Node;
      if (pop && pop.contains(target)) return;
      if (btn && btn.contains(target)) return;
      closePopover();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  // Select the URL text when the popover mounts so it's ready to copy.
  useLayoutEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [open]);

  const url = snapshot ? buildShareUrl(snapshot) : "";

  const handleCopy = async () => {
    if (!url) return;
    // Prefer the async Clipboard API. Fall back to manual selection
    // hint when unavailable (insecure contexts, old browsers).
    if (
      typeof navigator !== "undefined" &&
      navigator.clipboard &&
      window.isSecureContext
    ) {
      try {
        await navigator.clipboard.writeText(url);
        setToast("Link copied");
        // Close shortly after the toast shows.
        setTimeout(closePopover, 700);
        return;
      } catch {
        // Fall through to manual.
      }
    }
    setCopyFallback(true);
    inputRef.current?.focus();
    inputRef.current?.select();
  };

  return (
    <div className="share-wrapper">
      <button
        ref={buttonRef}
        type="button"
        className="share-button"
        onClick={() => (open ? closePopover() : openPopover())}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        Share view
      </button>

      {open && snapshot && (
        <div
          ref={popoverRef}
          className="share-popover"
          role="dialog"
          aria-label="Share this view"
        >
          <div className="share-popover-title">Share this view</div>

          <label className="share-url-label" htmlFor="share-url-input">
            Link
          </label>
          <input
            ref={inputRef}
            id="share-url-input"
            className="share-url-input"
            type="text"
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
          />

          <div className="share-summary">
            {summarize(snapshot, recordCount)}
          </div>

          <div className="share-actions">
            <button
              type="button"
              className="share-copy-btn"
              onClick={handleCopy}
            >
              Copy link
            </button>
          </div>

          {toast && (
            <div className="share-toast" role="status">
              {toast}
            </div>
          )}
          {copyFallback && (
            <div className="share-fallback" role="status">
              Copy with {navigatorCmdOrCtrl()}+C
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function navigatorCmdOrCtrl(): string {
  if (typeof navigator === "undefined") return "Ctrl";
  const platform = navigator.platform || "";
  return /Mac|iPhone|iPad|iPod/i.test(platform) ? "Cmd" : "Ctrl";
}
