import type { Filters } from "../types/filters";
import { SPECIES_COMMON, SPECIES_RARE, MONTHS } from "../types/filters";
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
  /** When set (typically by an active story), replaces the
   *  auto-generated species/chip section of the summary line with a
   *  single editorial label like "Rare species" or "Marin only". The
   *  year range and stranding count stay auto-generated. */
  summaryOverride?: string;
  /** Optional replacement for the year-range portion of the summary.
   *  Used when a story's "year scope" can't be expressed as a
   *  contiguous range — e.g. "9 marine heatwave years". */
  summaryYearLabel?: string;
}

// Short month label for the tag row ("Mar", "Apr", …).
const MONTH_SHORT: Record<number, string> = {
  1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr", 5: "May", 6: "Jun",
  7: "Jul", 8: "Aug", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dec",
};

// Format a set of month numbers as a compact human label.
//   [3,4,5]   → "Mar–May"
//   [3,4,5,6] → "Mar–Jun"
//   [3,7]     → "Mar, Jul"
//   [1..12]   → "" (nothing — every month means no filter)
function formatMonths(months: Set<number>): string {
  if (months.size === 0 || months.size === 12) return "";
  const sorted = Array.from(months).sort((a, b) => a - b);
  // Detect a single contiguous run.
  let contiguous = true;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) {
      contiguous = false;
      break;
    }
  }
  if (contiguous && sorted.length >= 2) {
    return `${MONTH_SHORT[sorted[0]]}–${MONTH_SHORT[sorted[sorted.length - 1]]}`;
  }
  if (sorted.length === 1) return MONTH_SHORT[sorted[0]];
  return sorted.map((m) => MONTH_SHORT[m]).join(", ");
}

// Format a string-set filter as up to N items, with a "+X more" tail
// when there are more. Keeps the summary line from blowing out wide.
function formatStringSet(set: Set<string>, max = 2): string {
  if (set.size === 0) return "";
  const items = Array.from(set);
  if (items.length <= max) return items.join(", ");
  return `${items.slice(0, max).join(", ")} +${items.length - max}`;
}

export default function RecordCount({
  count,
  yearMin,
  yearMax,
  selectedRange,
  filters,
  summaryOverride,
  summaryYearLabel,
}: Props) {
  // Story-supplied yearLabel takes precedence; otherwise derive from
  // the user's selectedRange. Default = full dataset range.
  const yearLabel =
    summaryYearLabel ??
    (selectedRange === null
      ? `${yearMin}–${yearMax}`
      : selectedRange.start === selectedRange.end
        ? String(selectedRange.start)
        : `${selectedRange.start}–${selectedRange.end}`);

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

  // Build a list of named drawer-filter chips. Each entry is the
  // human-readable summary for one active filter dimension; we only
  // include dimensions the user has narrowed.
  const tags: string[] = [];
  const months = formatMonths(filters.month);
  if (months) tags.push(months);
  const counties = formatStringSet(filters.county);
  if (counties) tags.push(counties);
  const findings = formatStringSet(filters.findings);
  if (findings) tags.push(findings);
  const age = formatStringSet(filters.ageClass);
  if (age) tags.push(age);
  const sex = formatStringSet(filters.sex);
  if (sex) tags.push(sex);
  const aff = formatStringSet(filters.affiliation);
  if (aff) tags.push(aff);
  const loc = formatStringSet(filters.locationConfidence);
  if (loc) tags.push(loc);

  // Keep MONTHS imported for type-safety even when the helper above
  // does the formatting itself — the lint rule wants every named
  // import to be used somewhere.
  void MONTHS;

  return (
    <div className="record-count">
      <div className="record-count-number">
        Showing <span className="record-count-value">{count}</span> stranding
        {count !== 1 ? "s" : ""}
      </div>
      <div className="record-count-filters">
        {summaryOverride ? (
          <>
            {yearLabel} &middot; {summaryOverride}
          </>
        ) : (
          <>
            {yearLabel} &middot; {speciesLabel}
            {tags.map((t) => (
              <span key={t}>
                {" "}&middot; {t}
              </span>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
