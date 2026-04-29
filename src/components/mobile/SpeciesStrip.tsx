import {
  FEATURED_SPECIES,
  SPECIES_COLORS,
  OTHER_SPECIES_COLOR,
} from "../../types/whale";
import {
  detectQuickView,
  hiddenForQuickView,
  type QuickView,
} from "../../lib/speciesQuickView";

const ALL_SPECIES_COLOR = "#1a1a1a";

interface Props {
  hidden: Set<string>;
  /** Replace filters.species wholesale. */
  onSetHidden: (next: Set<string>) => void;
  onOpenFilters: () => void;
}

interface PillSpec {
  key: QuickView;
  label: string;
  color: string;
  ariaLabel: string;
}

const PILLS: PillSpec[] = [
  {
    key: "all",
    label: "All species",
    color: ALL_SPECIES_COLOR,
    ariaLabel: "Show all species",
  },
  ...FEATURED_SPECIES.map<PillSpec>((sp) => ({
    key: sp,
    label: sp,
    color: SPECIES_COLORS[sp].active,
    ariaLabel: `Show only ${sp}`,
  })),
  {
    key: "other",
    label: "Other",
    color: OTHER_SPECIES_COLOR,
    ariaLabel: "Show only other species",
  },
];

// Mobile version of the desktop SpeciesFilter pill row.
// Same quick-view radio model: clicking a pill replaces the hidden
// set with that view. The trailing "All species…" link opens the
// FilterSheet for advanced multi-select.
export default function SpeciesStrip({
  hidden,
  onSetHidden,
  onOpenFilters,
}: Props) {
  const active = detectQuickView(hidden);

  return (
    <div
      className="m-species-strip"
      role="group"
      aria-label="Filter by species"
    >
      {PILLS.map((p) => {
        const isActive = active === p.key;
        return (
          <button
            key={p.key}
            type="button"
            className={`species-pill ${isActive ? "active" : ""}`}
            style={{
              backgroundColor: isActive ? p.color : "#fff",
              borderColor: p.color,
              color: isActive ? "#fff" : "#333",
            }}
            onClick={() => onSetHidden(hiddenForQuickView(p.key))}
            aria-pressed={isActive}
            aria-label={p.ariaLabel}
          >
            {p.label}
          </button>
        );
      })}
      <button
        type="button"
        className="m-species-more"
        onClick={onOpenFilters}
        aria-label="Open all species and filters"
      >
        All species…
      </button>
    </div>
  );
}
