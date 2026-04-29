import { useCallback, useEffect, useRef, useState } from "react";

// Choreography (ms from mount):
//   0 → HOLD_END     held hero, overlay fully opaque, live UI 0%
//   HOLD_END → END   crossfade — overlay 1→0, live UI 0→1
//   STAGGER_AT       pin stagger begins (slightly into the crossfade)
//   END              hero unmounts, sessionStorage flag persisted
//
// The hero text and the live UI text are intentionally NOT linked by
// any morph — they're two independent states crossfaded between. The
// hero text fades out where it sits; the live UI fades in where it
// lives. No position transforms, no scale, no FLIP measurement.
const HOLD_END = 3000;
const FADE_MS = 600;
const STAGGER_AT = HOLD_END + 200; // 3200ms
const COMPLETE = HOLD_END + FADE_MS; // 3600ms

// Skip cuts everything to the resolved state in this much time.
// Still a crossfade, just compressed.
const SKIP_MS = 200;

interface Props {
  /** Total (unfiltered) stranding count, shown as the giant number. */
  totalCount: number;
  /** Smallest year present in the data, used in the anchoring sentence. */
  startYear: number;
  /** Called when the resolved state is reached. */
  onComplete: () => void;
}

export default function HeroIntro({
  totalCount,
  startYear,
  onComplete,
}: Props) {
  const [resolving, setResolving] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const completeRef = useRef(false);

  // Schedule the choreography. Each timer is independently cancellable
  // so a skip can preempt the natural sequence.
  useEffect(() => {
    const timers: number[] = [];

    document.body.classList.add("bws-hero-active");

    timers.push(
      window.setTimeout(() => {
        setResolving(true);
        // Drives the symmetric live-UI fade-in via CSS.
        document.body.classList.add("bws-resolving");
      }, HOLD_END)
    );
    timers.push(
      window.setTimeout(() => {
        document.body.classList.add("bws-staggering");
      }, STAGGER_AT)
    );
    timers.push(
      window.setTimeout(() => {
        if (completeRef.current) return;
        completeRef.current = true;
        document.body.classList.remove("bws-hero-active");
        document.body.classList.remove("bws-resolving");
        document.body.classList.remove("bws-staggering");
        onComplete();
      }, COMPLETE)
    );

    return () => {
      for (const t of timers) clearTimeout(t);
      document.body.classList.remove("bws-hero-active");
      document.body.classList.remove("bws-resolving");
      document.body.classList.remove("bws-staggering");
      document.body.classList.remove("bws-skipping");
    };
  }, [onComplete]);

  // Skip handler — only fires from the explicit "Skip intro" button.
  // We deliberately don't listen for click/keydown/wheel/touchstart/
  // resize on the document, because those fired too eagerly (trackpad
  // inertia, devtools opening, accidental clicks) and produced
  // unpredictable hero durations.
  const handleSkip = useCallback(() => {
    if (completeRef.current) return;
    setSkipping(true);
    setResolving(true);
    document.body.classList.add("bws-skipping");
    document.body.classList.add("bws-resolving");
    window.setTimeout(() => {
      if (completeRef.current) return;
      completeRef.current = true;
      document.body.classList.remove("bws-hero-active");
      document.body.classList.remove("bws-resolving");
      document.body.classList.remove("bws-staggering");
      document.body.classList.remove("bws-skipping");
      onComplete();
    }, SKIP_MS);
  }, [onComplete]);

  void FADE_MS;

  const className = [
    "bws-hero",
    resolving ? "bws-hero-resolving" : "",
    skipping ? "bws-hero-skipping" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className} aria-hidden="true">
      <div className="bws-hero-stage">
        <div className="bws-hero-line">
          <span className="bws-hero-line--num">{totalCount}</span> WHALE
          STRANDINGS
        </div>
        <div className="bws-hero-line bws-hero-line--sub">
          In the Bay Area since {startYear}
        </div>
      </div>
      <button
        type="button"
        className="bws-hero-skip"
        onClick={handleSkip}
      >
        Skip intro
      </button>
    </div>
  );
}
