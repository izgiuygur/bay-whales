import type { Filters } from "../types/filters";
import type { YearRange } from "../App";

interface Props {
  count: number;
  yearMin: number;
  yearMax: number;
  selectedRange: YearRange;
  activeSpecies: Set<string>;
  filters: Filters;
}

export default function RecordCount({
  count,
  yearMin,
  yearMax,
  selectedRange,
  activeSpecies,
  filters,
}: Props) {
  const yearLabel =
    selectedRange === null
      ? `${yearMin}\u2013${yearMax}`
      : selectedRange.start === selectedRange.end
        ? String(selectedRange.start)
        : `${selectedRange.start}\u2013${selectedRange.end}`;

  // Combine species from pills and drawer
  const allSpecies = new Set([...activeSpecies, ...filters.species]);
  const speciesLabel =
    allSpecies.size === 0
      ? "All species"
      : Array.from(allSpecies).join(", ");

  // Count active drawer filters (excluding species since it's shown in speciesLabel)
  const drawerFilterCount =
    filters.month.size +
    filters.county.size +
    filters.findings.size +
    filters.ageClass.size +
    filters.sex.size +
    filters.affiliation.size +
    filters.locationConfidence.size;

  const filterSuffix =
    drawerFilterCount > 0
      ? ` · ${drawerFilterCount} filter${drawerFilterCount !== 1 ? "s" : ""} applied`
      : "";

  return (
    <div className="record-count">
      <div className="record-count-number">
        Showing <span className="record-count-value">{count}</span> record
        {count !== 1 ? "s" : ""}
      </div>
      <div className="record-count-filters">
        {yearLabel} &middot; {speciesLabel}{filterSuffix}
      </div>
    </div>
  );
}
