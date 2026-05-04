import { useState, useRef, useEffect } from "react";
import type { Filters, FilterKey } from "../types/filters";
import {
  SPECIES_COMMON,
  SPECIES_RARE,
  SPECIES_SCIENTIFIC,
  MONTHS,
  COUNTIES,
  FINDINGS,
  AGE_CLASSES,
  SEXES,
  AFFILIATIONS,
  LOCATION_CONFIDENCES,
} from "../types/filters";
import { getSpeciesDotColor } from "../types/whale";

// Total number of distinct species the user can filter on
// (SPECIES_COMMON ∪ SPECIES_RARE). Used to show the count of
// currently-selected species as other filters do.
const TOTAL_SPECIES_COUNT = SPECIES_COMMON.length + SPECIES_RARE.length;

// Contribution of the species filter to the filter count.
// Mirrors the behavior of month / county / etc. filters: the badge
// reflects how many options are actively selected. For species we
// store HIDDEN entries, so "selected" = TOTAL - hidden. At the default
// (nothing hidden) the contribution is 0, so no badge shows.
function countSelectedSpecies(hidden: Set<string>): number {
  if (hidden.size === 0) return 0;
  return Math.max(0, TOTAL_SPECIES_COUNT - hidden.size);
}

interface Props {
  filters: Filters;
  onToggle: (key: FilterKey, value: string | number) => void;
  onClear: (key: FilterKey) => void;
  onClearAll: () => void;
  /** Replace filters.species wholesale (used by species quick-view rows). */
  onSetHiddenSpecies: (next: Set<string>) => void;
  /** When a story is active, filter controls inside the drawer are
   *  visually disabled and clicks blocked, but the drawer can still
   *  be opened/closed and static content (about, layers, credit)
   *  stays readable. */
  storyActive?: boolean;
  showBathymetry: boolean;
  onToggleBathymetry: () => void;
  showShippingLanes: boolean;
  onToggleShippingLanes: () => void;
  showPre2013Lanes: boolean;
  onTogglePre2013Lanes: () => void;
}

function FilterSection({
  title,
  filterKey,
  options,
  activeSet,
  onToggle,
  onClear,
}: {
  title: string;
  filterKey: FilterKey;
  options: { value: string | number; label: string }[];
  activeSet: Set<any>;
  onToggle: (key: FilterKey, value: string | number) => void;
  onClear: (key: FilterKey) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="filter-section">
      <button
        type="button"
        className="filter-section-header"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-label={`${title} filter${activeSet.size > 0 ? `, ${activeSet.size} active` : ""}`}
      >
        <span className="filter-section-title">
          {title}
          {activeSet.size > 0 && (
            <span className="filter-count">{activeSet.size}</span>
          )}
        </span>
        <span
          className={`filter-chevron ${expanded ? "open" : ""}`}
          aria-hidden="true"
        >
          &#8250;
        </span>
      </button>
      {expanded && (
        <div className="filter-options" role="group" aria-label={title}>
          {options.map((opt) => (
            <label key={String(opt.value)} className="filter-option">
              <input
                type="checkbox"
                checked={activeSet.has(opt.value)}
                onChange={() => onToggle(filterKey, opt.value)}
              />
              <span className="filter-option-label">{opt.label}</span>
            </label>
          ))}
          {activeSet.size > 0 && (
            <button
              type="button"
              className="filter-clear-btn"
              onClick={() => onClear(filterKey)}
              aria-label={`Clear ${title} filter`}
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SpeciesFilterSection({
  filters,
  onToggle,
  onClear,
  onSetHidden,
}: {
  filters: Filters;
  onToggle: (key: FilterKey, value: string | number) => void;
  onClear: (key: FilterKey) => void;
  onSetHidden: (next: Set<string>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showRare, setShowRare] = useState(false);
  // filters.species holds the set of HIDDEN species.
  // A checkbox is checked when the species is NOT hidden.
  const hiddenSet = filters.species;
  // Number of species currently shown on the map (i.e., selected in
  // this filter section). Shown as the section badge once any species
  // is hidden — matches the convention used by month/county/etc.
  const selectedCount = countSelectedSpecies(hiddenSet);
  const anyHidden = hiddenSet.size > 0;
  // Default mode (= "All species" quick view active): no checkboxes.
  // Rows are plain buttons; clicking a row enters multi-select mode by
  // selecting only that species.
  const defaultMode = !anyHidden;

  // Plain row label (species name + scientific). Reused in both modes.
  const renderLabel = (sp: string) => (
    <>
      <span
        className="filter-option-dot"
        style={{ backgroundColor: getSpeciesDotColor(sp) }}
        aria-hidden="true"
      />
      <span className="filter-option-label">
        {sp}
        {SPECIES_SCIENTIFIC[sp] && (
          <span className="filter-option-scientific">
            {" "}
            (<i>{SPECIES_SCIENTIFIC[sp]}</i>)
          </span>
        )}
      </span>
    </>
  );

  const renderRow = (sp: string) => {
    if (defaultMode) {
      // No checkbox — clicking enters multi-select with only `sp` selected.
      return (
        <button
          key={sp}
          type="button"
          className="filter-option filter-option--plain"
          onClick={() => {
            // Hide everything except this one.
            const next = new Set<string>();
            for (const other of [...SPECIES_COMMON, ...SPECIES_RARE]) {
              if (other !== sp) next.add(other);
            }
            onSetHidden(next);
          }}
          aria-label={`Show only ${sp}`}
        >
          {renderLabel(sp)}
        </button>
      );
    }
    return (
      <label key={sp} className="filter-option">
        <input
          type="checkbox"
          checked={!hiddenSet.has(sp)}
          onChange={() => onToggle("species", sp)}
        />
        {renderLabel(sp)}
      </label>
    );
  };

  return (
    <div className="filter-section">
      <button
        type="button"
        className="filter-section-header"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-label={`Species filter${anyHidden ? `, ${selectedCount} of ${TOTAL_SPECIES_COUNT} selected` : ""}`}
      >
        <span className="filter-section-title">
          Species
          {anyHidden && (
            <span className="filter-count">{selectedCount}</span>
          )}
        </span>
        <span
          className={`filter-chevron ${expanded ? "open" : ""}`}
          aria-hidden="true"
        >
          &#8250;
        </span>
      </button>
      {expanded && (
        <div className="filter-options" role="group" aria-label="Species">
          {SPECIES_COMMON.map(renderRow)}
          <button
            type="button"
            className="filter-more-toggle"
            onClick={() => setShowRare(!showRare)}
            aria-expanded={showRare}
          >
            {showRare ? "Hide" : "More species"}
            <span
              className={`filter-chevron-sm ${showRare ? "open" : ""}`}
              aria-hidden="true"
            >
              &#8250;
            </span>
          </button>
          {showRare && SPECIES_RARE.map(renderRow)}
          {anyHidden && (
            <button
              type="button"
              className="filter-clear-btn"
              onClick={() => onClear("species")}
              aria-label="Clear Species filter (show all species)"
            >
              Show all
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function LeftRail({
  filters,
  onToggle,
  onClear,
  onClearAll,
  onSetHiddenSpecies,
  storyActive,
  showBathymetry,
  onToggleBathymetry,
  showShippingLanes,
  onToggleShippingLanes,
  showPre2013Lanes,
  onTogglePre2013Lanes,
}: Props) {
  // Persist drawer open/collapsed state across visits.
  // First visit (no stored value) defaults to OPEN so new users see the
  // filters and layers rather than a single whale button.
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const stored = window.localStorage.getItem("bay-whales.drawer-open");
      return stored === null ? true : stored === "true";
    } catch {
      return true;
    }
  });
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("bay-whales.drawer-open", String(open));
    } catch {
      // Storage can fail (private mode, quota) — persistence is best-effort.
    }
  }, [open]);

  // For non-species filters, the Set already holds the selected
  // options, so Set.size is the "count of active choices". For
  // species (exclusion set), translate to the count of currently
  // SELECTED species so the total reflects the same semantics as
  // the drawer Species section badge.
  const totalActive =
    Object.entries(filters).reduce(
      (sum, [key, s]) => (key === "species" ? sum : sum + s.size),
      0
    ) + countSelectedSpecies(filters.species);
  // Whether any filter is applied at all — used to decide whether to
  // show the badges. Distinct from `totalActive` so we still render
  // the badge (with "0") in the edge case where every species is
  // hidden (selected count = 0 but the filter IS active).
  const anyFilterApplied = Object.values(filters).some((s) => s.size > 0);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        drawerRef.current &&
        !drawerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const monthOptions = MONTHS.map((m) => ({
    value: m.value,
    label: m.label,
  }));
  const countyOptions = COUNTIES.map((c) => ({ value: c, label: c }));
  const findingsOptions = FINDINGS.map((f) => ({ value: f, label: f }));
  const ageOptions = AGE_CLASSES.map((a) => ({ value: a, label: a }));
  const sexOptions = SEXES.map((s) => ({ value: s, label: s }));
  const affiliationOptions = AFFILIATIONS.map((a) => ({
    value: a,
    label: a,
  }));
  const locationOptions = LOCATION_CONFIDENCES.map((l) => ({
    value: l.value,
    label: l.label,
  }));

  return (
    <div className="left-rail-wrapper" ref={drawerRef}>
      <button
        type="button"
        className={`rail-collapsed ${open ? "hidden" : ""}`}
        onClick={() => setOpen(true)}
        data-tooltip="Filters & layers"
        aria-label="Filters & layers"
      >
        <img
          className="rail-whale-icon"
          src="/whale-icon.png"
          alt=""
        />
        {anyFilterApplied && (
          <span className="rail-collapsed-badge" aria-hidden="true">
            {totalActive}
          </span>
        )}
      </button>

      {open && (
        <aside className="left-rail open">
          <div className="rail-header">
            <button
              className="rail-close"
              onClick={() => setOpen(false)}
              aria-label="Close filters"
              type="button"
            >
              &lsaquo;
            </button>
          </div>

          <div className="rail-scroll">
            <p className="rail-about">
              An interactive record of every reported whale stranding in
              the San Francisco Bay Area since 2005. Filter by year,
              species, county, and more.
            </p>

            {/* Filters heading */}
            <div className="rail-section-heading rail-section-heading--main">
              <span>Filters</span>
              {anyFilterApplied && (
                <button
                  type="button"
                  className="rail-clear-all active"
                  onClick={onClearAll}
                  aria-label={`Clear all filters (${totalActive} active)`}
                  title={
                    storyActive ? "Close story to change filters" : undefined
                  }
                >
                  Clear all
                  <span className="rail-clear-all-count">{totalActive}</span>
                </button>
              )}
            </div>

            <div
              className="filter-group"
              title={
                storyActive ? "Close story to change filters" : undefined
              }
            >
              <SpeciesFilterSection
                filters={filters}
                onToggle={onToggle}
                onClear={onClear}
                onSetHidden={onSetHiddenSpecies}
              />
              <FilterSection
                title="Month"
                filterKey="month"
                options={monthOptions}
                activeSet={filters.month}
                onToggle={onToggle}
                onClear={onClear}
              />
              <FilterSection
                title="County"
                filterKey="county"
                options={countyOptions}
                activeSet={filters.county}
                onToggle={onToggle}
                onClear={onClear}
              />
              <FilterSection
                title="Reported findings"
                filterKey="findings"
                options={findingsOptions}
                activeSet={filters.findings}
                onToggle={onToggle}
                onClear={onClear}
              />
              <FilterSection
                title="Age class"
                filterKey="ageClass"
                options={ageOptions}
                activeSet={filters.ageClass}
                onToggle={onToggle}
                onClear={onClear}
              />
              <FilterSection
                title="Sex"
                filterKey="sex"
                options={sexOptions}
                activeSet={filters.sex}
                onToggle={onToggle}
                onClear={onClear}
              />
              <FilterSection
                title="Reporting organization"
                filterKey="affiliation"
                options={affiliationOptions}
                activeSet={filters.affiliation}
                onToggle={onToggle}
                onClear={onClear}
              />
              <FilterSection
                title="Location confidence"
                filterKey="locationConfidence"
                options={locationOptions}
                activeSet={filters.locationConfidence}
                onToggle={onToggle}
                onClear={onClear}
              />
            </div>

            {/* Layers heading */}
            <div className="rail-section-heading rail-section-heading--main rail-section-heading--layers">
              Map layers
            </div>

            <div className="layer-group" role="group" aria-label="Map layers">
              <div className="layer-row">
                <span className="layer-label" id="layer-bathymetry-label">
                  Bathymetry
                </span>
                <button
                  type="button"
                  className={`layer-switch ${showBathymetry ? "on" : ""}`}
                  onClick={onToggleBathymetry}
                  role="switch"
                  aria-checked={showBathymetry}
                  aria-labelledby="layer-bathymetry-label"
                >
                  <span className="layer-switch-thumb" aria-hidden="true" />
                  <span className="layer-switch-text" aria-hidden="true">
                    {showBathymetry ? "ON" : "OFF"}
                  </span>
                </button>
              </div>
              <div className="layer-row">
                <span className="layer-label" id="layer-shipping-label">
                  Shipping lanes
                </span>
                <button
                  type="button"
                  className={`layer-switch ${showShippingLanes ? "on" : ""}`}
                  onClick={onToggleShippingLanes}
                  role="switch"
                  aria-checked={showShippingLanes}
                  aria-labelledby="layer-shipping-label"
                >
                  <span className="layer-switch-thumb" aria-hidden="true" />
                  <span className="layer-switch-text" aria-hidden="true">
                    {showShippingLanes ? "ON" : "OFF"}
                  </span>
                </button>
              </div>
              <div className="layer-row">
                <span className="layer-label" id="layer-pre2013-label">
                  Shipping lanes (pre-2013)
                </span>
                <button
                  type="button"
                  className={`layer-switch ${showPre2013Lanes ? "on" : ""}`}
                  onClick={onTogglePre2013Lanes}
                  role="switch"
                  aria-checked={showPre2013Lanes}
                  aria-labelledby="layer-pre2013-label"
                >
                  <span className="layer-switch-thumb" aria-hidden="true" />
                  <span className="layer-switch-text" aria-hidden="true">
                    {showPre2013Lanes ? "ON" : "OFF"}
                  </span>
                </button>
              </div>
            </div>

            <div className="rail-bottom">
              <p className="rail-note">
                <span className="rail-note-label">Note:</span> Locations show
                where animals were found or reported, not necessarily where
                mortality occurred. Reported findings are not definitive causes
                of death.
              </p>
              <p className="rail-credit">
                Designed and built by{" "}
                <a
                  href="https://izgiuygur.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rail-credit-link"
                >
                  Izgi Uygur
                </a>
              </p>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
