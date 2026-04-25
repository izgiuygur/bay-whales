import type { ReactNode } from "react";
import { countSelectedSpecies } from "../../lib/filterCount";
import type { Filters } from "../../types/filters";

interface Props {
  filters: Filters;
  onOpenFilters: () => void;
  shareButton: ReactNode;
}

// Sticky top header with title, filter icon (+ active-count badge),
// and a Share button. Fixed 56px tall.
export default function MobileHeader({
  filters,
  onOpenFilters,
  shareButton,
}: Props) {
  const totalActive =
    Object.entries(filters).reduce(
      (sum, [key, s]) => (key === "species" ? sum : sum + s.size),
      0
    ) + countSelectedSpecies(filters.species);
  const anyFilterApplied = Object.values(filters).some((s) => s.size > 0);

  // Tapping the title resets the page to the bare home URL — same
  // gesture as clicking a site logo on most web apps. We use a full
  // navigation (not router) so any shared-link query params are
  // dropped and React state is cleanly re-initialized.
  const goHome = () => {
    window.location.href = "/";
  };

  return (
    <header className="m-header">
      <button
        type="button"
        className="m-header-title"
        onClick={goHome}
        aria-label="Bay Whale Strandings — reset to home"
      >
        Bay Whale Strandings
      </button>
      <div className="m-header-actions">
        <button
          type="button"
          className="m-header-filter-btn"
          onClick={onOpenFilters}
          aria-label={
            anyFilterApplied
              ? `Filters and layers, ${totalActive} active`
              : "Filters and layers"
          }
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          {anyFilterApplied && (
            <span className="m-header-filter-badge" aria-hidden="true">
              {totalActive}
            </span>
          )}
        </button>
        {shareButton}
      </div>
    </header>
  );
}
