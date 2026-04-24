import type { Filters } from "../types/filters";
import { SPECIES_COMMON, SPECIES_RARE } from "../types/filters";
import { FEATURED_SPECIES } from "../types/whale";
import type { YearRange } from "../App";

const OTHER_SPECIES_SET: Set<string> = new Set([
  ...SPECIES_COMMON.filter((s) => !FEATURED_SPECIES.includes(s as never)),
  ...SPECIES_RARE,
]);

interface Props {
  count: number;
  yearMin: number;
  yearMax: number;
  selectedRange: YearRange;
  filters: Filters;
}

export default function RecordCount({
  count,
  yearMin,
  yearMax,
  selectedRange,
  filters,
}: Props) {
  const yearLabel =
    selectedRange === null
      ? `${yearMin}\u2013${yearMax}`
      : selectedRange.start === selectedRange.end
        ? String(selectedRange.start)
        : `${selectedRange.start}\u2013${selectedRange.end}`;

  // filters.species = HIDDEN species. Derive the label from which pill
  // groups are still visible (active pills), not from the hidden set.
  const hidden = filters.species;
  const activePillLabels: string[] = [];
  for (const sp of FEATURED_SPECIES) {
    if (!hidden.has(sp)) activePillLabels.push(sp);
  }
  const anyOtherVisible = Array.from(OTHER_SPECIES_SET).some(
    (s) => !hidden.has(s)
  );
  if (anyOtherVisible) activePillLabels.push("Other species");

  const speciesLabel =
    hidden.size === 0
      ? "All species"
      : activePillLabels.length === 0
        ? "No species"
        : activePillLabels.join(", ");

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
        Showing <span className="record-count-value">{count}</span> stranding
        {count !== 1 ? "s" : ""}
      </div>
      <div className="record-count-filters">
        {yearLabel} &middot; {speciesLabel}{filterSuffix}
      </div>
    </div>
  );
}
