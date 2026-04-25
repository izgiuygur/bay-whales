import { useState } from "react";

interface Props {
  /** Currently-visible (filtered) stranding count. */
  shownCount: number;
  /** Unfiltered total — appears as "of N" when filters are active. */
  totalCount: number;
}

// Dismiss is in-memory only on purpose: the user wants the strip to
// come back on reload rather than stay hidden across visits.
export default function IntroStrip({ shownCount, totalCount }: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const filtered = shownCount !== totalCount;

  return (
    <section className="m-intro" aria-label="About this map">
      <p className="m-intro-text">
        {filtered ? (
          <>
            Showing <strong>{shownCount}</strong> of {totalCount} whale
            strandings reported across the San Francisco Bay Area since 2005.
          </>
        ) : (
          <>
            Tracking <strong>{totalCount}</strong> whale strandings reported
            across the San Francisco Bay Area since 2005.
          </>
        )}{" "}
        Data from NOAA Fisheries, The Marine Mammal Center, and the
        California Academy of Sciences.
      </p>
      <button
        type="button"
        className="m-intro-close"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss introduction"
      >
        &times;
      </button>
    </section>
  );
}
