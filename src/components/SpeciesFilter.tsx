import { FEATURED_SPECIES, SPECIES_COLORS } from "../types/whale";
import type { SpeciesKey } from "../types/whale";

interface Props {
  active: Set<string>;
  onToggle: (species: SpeciesKey) => void;
  onClearAll: () => void;
}

export default function SpeciesFilter({ active, onToggle, onClearAll }: Props) {
  const allActive = active.size === 0;

  return (
    <div
      className="species-filter"
      role="group"
      aria-label="Filter strandings by species"
    >
      {FEATURED_SPECIES.map((species) => {
        const isActive = active.has(species);
        const colors = SPECIES_COLORS[species];
        return (
          <button
            key={species}
            type="button"
            className={`species-pill ${isActive ? "active" : ""}`}
            style={{
              backgroundColor: isActive ? colors.active : "#fff",
              borderColor: isActive ? colors.active : colors.passive,
              color: isActive ? "#fff" : "#333",
            }}
            onClick={() => onToggle(species)}
            aria-pressed={isActive}
            aria-label={`Filter to ${species}`}
          >
            {species}
          </button>
        );
      })}
      <button
        type="button"
        className={`species-pill species-pill-all ${allActive ? "active" : ""}`}
        onClick={onClearAll}
        aria-pressed={allActive}
        aria-label="Show all species"
      >
        All species
      </button>
    </div>
  );
}
