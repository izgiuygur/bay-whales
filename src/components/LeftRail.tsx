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

interface Props {
  filters: Filters;
  onToggle: (key: FilterKey, value: string | number) => void;
  onClear: (key: FilterKey) => void;
  onClearAll: () => void;
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
}: {
  filters: Filters;
  onToggle: (key: FilterKey, value: string | number) => void;
  onClear: (key: FilterKey) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showRare, setShowRare] = useState(false);
  const activeSet = filters.species;

  return (
    <div className="filter-section">
      <button
        type="button"
        className="filter-section-header"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-label={`Species filter${activeSet.size > 0 ? `, ${activeSet.size} active` : ""}`}
      >
        <span className="filter-section-title">
          Species
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
        <div className="filter-options" role="group" aria-label="Species">
          {SPECIES_COMMON.map((sp) => (
            <label key={sp} className="filter-option">
              <input
                type="checkbox"
                checked={activeSet.has(sp)}
                onChange={() => onToggle("species", sp)}
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
            </label>
          ))}
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
          {showRare &&
            SPECIES_RARE.map((sp) => (
              <label key={sp} className="filter-option">
                <input
                  type="checkbox"
                  checked={activeSet.has(sp)}
                  onChange={() => onToggle("species", sp)}
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
              </label>
            ))}
          {activeSet.size > 0 && (
            <button
              type="button"
              className="filter-clear-btn"
              onClick={() => onClear("species")}
              aria-label="Clear Species filter"
            >
              Clear
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
  showBathymetry,
  onToggleBathymetry,
  showShippingLanes,
  onToggleShippingLanes,
  showPre2013Lanes,
  onTogglePre2013Lanes,
}: Props) {
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  const totalActive = Object.values(filters).reduce(
    (sum, s) => sum + s.size,
    0
  );

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
        title="Filters & layers"
        aria-label="Filters & layers"
      >
        <span className="rail-whale-icon" role="img" aria-label="whale">
          🐳
        </span>
        {totalActive > 0 && (
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
              Bay Whale Strandings maps whale strandings across the San
              Francisco Bay Area from 2005 onward. Explore the data by year,
              species, and reported findings.
            </p>

            {/* Filters heading */}
            <div className="rail-section-heading rail-section-heading--main">
              <span>Filters</span>
              {totalActive > 0 && (
                <button
                  type="button"
                  className="rail-clear-all active"
                  onClick={onClearAll}
                  aria-label={`Clear all filters (${totalActive} active)`}
                >
                  Clear all
                  <span className="rail-clear-all-count">{totalActive}</span>
                </button>
              )}
            </div>

            <div className="filter-group">
              <SpeciesFilterSection
                filters={filters}
                onToggle={onToggle}
                onClear={onClear}
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
            </div>

            {/* Animal details heading */}
            <div className="rail-section-heading rail-section-heading--sub">
              Animal details
            </div>

            <div className="filter-group">
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
            </div>

            {/* Data heading */}
            <div className="rail-section-heading rail-section-heading--sub">
              Data
            </div>

            <div className="filter-group">
              <FilterSection
                title="Affiliation"
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
              <p className="rail-source">
                Sources: NOAA Fisheries, Marine Mammal Center, California
                Academy of Sciences
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
