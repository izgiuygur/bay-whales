interface Props {
  /** Currently-visible (filtered) stranding count. */
  shownCount: number;
  /** Unfiltered total — appears as "of N" when filters are active. */
  totalCount: number;
}

// Always-visible summary at the top of the mobile view. Updates with
// the current filter / story state so the user can see "what am I
// looking at" without having to interact with anything. Intentionally
// not dismissable — losing this strip mid-story would leave the user
// unable to tell whether the count they're seeing is filtered or not.
export default function IntroStrip({ shownCount, totalCount }: Props) {
  const filtered = shownCount !== totalCount;

  return (
    <section className="m-intro" aria-label="Stranding count">
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
    </section>
  );
}
