import {
  FEATURED_SPECIES,
  SPECIES_COLORS,
  OTHER_SPECIES_COLOR,
} from "../types/whale";
import { SPECIES_COMMON, SPECIES_RARE } from "../types/filters";

interface Props {
  // Set of species the user has hidden. Empty = all species visible.
  hidden: Set<string>;
  onToggleSpecies: (species: string) => void;
  onToggleGroup: (species: string[], makeHidden: boolean) => void;
  onReset: () => void;
}

// Species grouped under the "Other" pill: every species that isn't one
// of the three featured ones (all of SPECIES_COMMON + SPECIES_RARE minus
// Gray/Humpback/Fin).
const OTHER_SPECIES: string[] = [
  ...SPECIES_COMMON.filter((s) => !FEATURED_SPECIES.includes(s as never)),
  ...SPECIES_RARE,
];

interface PillSpec {
  key: string;
  label: string;
  color: string;
  dotColor: string;
  isActive: boolean;
  ariaLabel: string;
  onToggle: () => void;
}

export default function SpeciesFilter({
  hidden,
  onToggleSpecies,
  onToggleGroup,
  onReset,
}: Props) {
  const pills: PillSpec[] = FEATURED_SPECIES.map((species) => {
    const colors = SPECIES_COLORS[species];
    const isActive = !hidden.has(species);
    return {
      key: species,
      label: species,
      color: colors.active,
      dotColor: colors.pin,
      isActive,
      ariaLabel: isActive ? `Hide ${species}` : `Show ${species}`,
      onToggle: () => onToggleSpecies(species),
    };
  });

  // "Other" is active iff at least one non-featured species is visible.
  const anyOtherVisible = OTHER_SPECIES.some((s) => !hidden.has(s));
  pills.push({
    key: "__other__",
    label: "Other",
    color: OTHER_SPECIES_COLOR,
    dotColor: OTHER_SPECIES_COLOR,
    isActive: anyOtherVisible,
    ariaLabel: anyOtherVisible
      ? "Hide all other species"
      : "Show all other species",
    // Clicking when currently visible → hide all; when currently hidden → show all.
    onToggle: () => onToggleGroup(OTHER_SPECIES, anyOtherVisible),
  });

  const anyHidden = hidden.size > 0;

  return (
    <div
      className="species-filter"
      role="group"
      aria-label="Filter strandings by species"
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
          {/* Always render the dot so the pill width stays constant;
              hide it visually when the pill is active. */}
          <span
            className="species-pill-dot"
            style={{
              backgroundColor: p.dotColor,
              visibility: p.isActive ? "hidden" : "visible",
            }}
            aria-hidden="true"
          />
          {p.label}
        </button>
      ))}
      {/* Always rendered so the pill row's width never reflows when
          the reset link toggles on/off. `visibility: hidden` keeps
          the slot reserved without showing the label. */}
      <button
        type="button"
        className="species-pill-reset"
        onClick={onReset}
        aria-label="Show all species (reset species filter)"
        style={{ visibility: anyHidden ? "visible" : "hidden" }}
        tabIndex={anyHidden ? 0 : -1}
        aria-hidden={!anyHidden}
      >
        Reset species
      </button>
    </div>
  );
}
