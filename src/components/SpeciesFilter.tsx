import {
  FEATURED_SPECIES,
  SPECIES_COLORS,
  OTHER_SPECIES_COLOR,
} from "../types/whale";
import {
  detectQuickView,
  hiddenForQuickView,
  type QuickView,
} from "../lib/speciesQuickView";

// Neutral color for the "All species" pill — it represents "no
// filter", so it shouldn't be tied to any one species' brand color.
const ALL_SPECIES_COLOR = "#1a1a1a";

interface Props {
  /** Hidden-species set from filters.species. Empty = all visible. */
  hidden: Set<string>;
  /** Replace filters.species wholesale. */
  onSetHidden: (next: Set<string>) => void;
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

// Top-of-map species pill row.
//
// Quick-view (radio) model: exactly one pill is active when the
// current hidden set matches a known view; otherwise (custom drawer
// selection) no pill reads as active. Clicking a pill replaces the
// hidden set wholesale.
export default function SpeciesFilter({ hidden, onSetHidden }: Props) {
  const active = detectQuickView(hidden);

  return (
    <div
      className="species-filter"
      role="group"
      aria-label="Filter strandings by species"
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
    </div>
  );
}
