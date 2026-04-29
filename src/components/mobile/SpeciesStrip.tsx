import {
  FEATURED_SPECIES,
  SPECIES_COLORS,
  OTHER_SPECIES_COLOR,
} from "../../types/whale";
import { SPECIES_COMMON, SPECIES_RARE } from "../../types/filters";

interface Props {
  hidden: Set<string>;
  onToggleSpecies: (species: string) => void;
  onToggleGroup: (group: string[], makeHidden: boolean) => void;
  onOpenFilters: () => void;
}

const OTHER_SPECIES: string[] = [
  ...SPECIES_COMMON.filter((s) => !FEATURED_SPECIES.includes(s as never)),
  ...SPECIES_RARE,
];

// Mobile version of the desktop SpeciesFilter pill row. Uses the same
// geometry and color rules; only the container layout differs.
// Tapping the "Other" pill opens the FilterSheet so the user can
// expand individual long-tail species — matching the spec.
export default function SpeciesStrip({
  hidden,
  onToggleSpecies,
  onToggleGroup,
  onOpenFilters,
}: Props) {
  interface Pill {
    key: string;
    label: string;
    color: string;
    isActive: boolean;
    onToggle: () => void;
    ariaLabel: string;
  }
  const pills: Pill[] = FEATURED_SPECIES.map((species) => {
    const colors = SPECIES_COLORS[species];
    const isActive = !hidden.has(species);
    return {
      key: species,
      label: species,
      color: colors.active,
      isActive,
      onToggle: () => onToggleSpecies(species),
      ariaLabel: isActive ? `Hide ${species}` : `Show ${species}`,
    };
  });

  const anyOtherVisible = OTHER_SPECIES.some((s) => !hidden.has(s));
  pills.push({
    key: "__other__",
    label: "Other",
    color: OTHER_SPECIES_COLOR,
    isActive: anyOtherVisible,
    onToggle: () => onToggleGroup(OTHER_SPECIES, anyOtherVisible),
    ariaLabel: anyOtherVisible
      ? "Hide all other species"
      : "Show all other species",
  });

  return (
    <div
      className="m-species-strip"
      role="group"
      aria-label="Filter by species"
    >
      {pills.map((p) => (
        <button
          key={p.key}
          type="button"
          className={`species-pill ${p.isActive ? "active" : ""}`}
          style={{
            backgroundColor: p.isActive ? p.color : "#fff",
            borderColor: p.color,
            color: p.isActive ? "#fff" : "#333",
          }}
          onClick={p.onToggle}
          aria-pressed={p.isActive}
          aria-label={p.ariaLabel}
        >
          {p.label}
        </button>
      ))}
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
