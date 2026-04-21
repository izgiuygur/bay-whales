import type { Filters } from "../types/filters";
import type { YearRange } from "../App";

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

  // Species filter state (pills and drawer share the same underlying set).
  const speciesLabel =
    filters.species.size === 0
      ? "All species"
      : Array.from(filters.species).join(", ");

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
