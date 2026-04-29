import { useState } from "react";
import BottomSheet from "./BottomSheet";
import type { Filters, FilterKey } from "../../types/filters";
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
} from "../../types/filters";
import { getSpeciesDotColor } from "../../types/whale";
import { countSelectedSpecies, TOTAL_SPECIES_COUNT } from "../../lib/filterCount";

interface Props {
  open: boolean;
  onClose: () => void;
  filters: Filters;
  onToggle: (key: FilterKey, value: string | number) => void;
  onClear: (key: FilterKey) => void;
  onClearAll: () => void;
  /** Replace filters.species wholesale (used by drawer "select only" rows). */
  onSetHiddenSpecies: (next: Set<string>) => void;
  showBathymetry: boolean;
  onToggleBathymetry: () => void;
  showShippingLanes: boolean;
  onToggleShippingLanes: () => void;
  showPre2013Lanes: boolean;
  onTogglePre2013Lanes: () => void;
}

// A collapsible section with mobile-sized tap targets. Identical
// interaction model as the desktop LeftRail's FilterSection, but
// styled for phone ergonomics.
function Section({
  title,
  filterKey,
  options,
  activeSet,
  onToggle,
  onClear,
  defaultExpanded = false,
}: {
  title: string;
  filterKey: FilterKey;
  options: { value: string | number; label: string }[];
  activeSet: Set<string | number>;
  onToggle: (key: FilterKey, value: string | number) => void;
  onClear: (key: FilterKey) => void;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const count = activeSet.size;
  return (
    <div className="m-filter-section">
      <button
        type="button"
        className="m-filter-section-header"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className="m-filter-section-title">
          {title}
          {count > 0 && <span className="filter-count">{count}</span>}
        </span>
        <span
          className={`filter-chevron ${expanded ? "open" : ""}`}
          aria-hidden="true"
        >
          &#8250;
        </span>
      </button>
      {expanded && (
        <div className="m-filter-options" role="group" aria-label={title}>
          {options.map((opt) => (
            <label key={String(opt.value)} className="m-filter-option">
              <input
                type="checkbox"
                checked={activeSet.has(opt.value)}
                onChange={() => onToggle(filterKey, opt.value)}
              />
              <span className="m-filter-option-label">{opt.label}</span>
            </label>
          ))}
          {count > 0 && (
            <button
              type="button"
              className="m-filter-clear-btn"
              onClick={() => onClear(filterKey)}
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Species has its own section since the set semantics are inverted
// (hidden vs. selected) and each row needs a color dot.
function SpeciesSection({
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
  const hidden = filters.species;
  const anyHidden = hidden.size > 0;
  const selected = countSelectedSpecies(hidden);
  // Default mode (= "All species" pill active) — render rows without
  // checkboxes; clicking a row enters multi-select mode.
  const defaultMode = !anyHidden;

  const renderLabel = (sp: string) => (
    <>
      <span
        className="filter-option-dot"
        style={{ backgroundColor: getSpeciesDotColor(sp) }}
        aria-hidden="true"
      />
      <span className="m-filter-option-label">
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
      return (
        <button
          key={sp}
          type="button"
          className="m-filter-option m-filter-option--plain"
          onClick={() => {
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
      <label key={sp} className="m-filter-option">
        <input
          type="checkbox"
          checked={!hidden.has(sp)}
          onChange={() => onToggle("species", sp)}
        />
        {renderLabel(sp)}
      </label>
    );
  };

  return (
    <div className="m-filter-section">
      <button
        type="button"
        className="m-filter-section-header"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-label={`Species filter${
          anyHidden ? `, ${selected} of ${TOTAL_SPECIES_COUNT} selected` : ""
        }`}
      >
        <span className="m-filter-section-title">
          Species
          {anyHidden && <span className="filter-count">{selected}</span>}
        </span>
        <span
          className={`filter-chevron ${expanded ? "open" : ""}`}
          aria-hidden="true"
        >
          &#8250;
        </span>
      </button>
      {expanded && (
        <div className="m-filter-options" role="group" aria-label="Species">
          {SPECIES_COMMON.map(renderRow)}
          <button
            type="button"
            className="filter-more-toggle"
            onClick={() => setShowRare((v) => !v)}
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
              className="m-filter-clear-btn"
              onClick={() => onClear("species")}
            >
              Show all
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function FilterSheet(props: Props) {
  const {
    open,
    onClose,
    filters,
    onToggle,
    onClear,
    onClearAll,
    onSetHiddenSpecies,
    showBathymetry,
    onToggleBathymetry,
    showShippingLanes,
    onToggleShippingLanes,
    showPre2013Lanes,
    onTogglePre2013Lanes,
  } = props;

  const anyFilterApplied = Object.values(filters).some((s) => s.size > 0);

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      heights={[0.86, 1.0]}
      ariaLabel="Filters and layers"
      header={
        <div className="m-filter-sheet-header">
          {anyFilterApplied ? (
            <button
              type="button"
              className="m-filter-clear-all"
              onClick={onClearAll}
            >
              Clear all
            </button>
          ) : (
            <span aria-hidden="true" />
          )}
          <span className="m-filter-sheet-title">Filters &amp; layers</span>
          <button
            type="button"
            className="m-sheet-close"
            onClick={onClose}
            aria-label="Close filters"
          >
            &times;
          </button>
        </div>
      }
    >
      <SpeciesSection
        filters={filters}
        onToggle={onToggle}
        onClear={onClear}
        onSetHidden={onSetHiddenSpecies}
      />
      <Section
        title="Month"
        filterKey="month"
        options={MONTHS.map((m) => ({ value: m.value, label: m.label }))}
        activeSet={filters.month}
        onToggle={onToggle}
        onClear={onClear}
      />
      <Section
        title="County"
        filterKey="county"
        options={COUNTIES.map((c) => ({ value: c, label: c }))}
        activeSet={filters.county}
        onToggle={onToggle}
        onClear={onClear}
      />
      <Section
        title="Reported findings"
        filterKey="findings"
        options={FINDINGS.map((f) => ({ value: f, label: f }))}
        activeSet={filters.findings}
        onToggle={onToggle}
        onClear={onClear}
      />
      <Section
        title="Age class"
        filterKey="ageClass"
        options={AGE_CLASSES.map((a) => ({ value: a, label: a }))}
        activeSet={filters.ageClass}
        onToggle={onToggle}
        onClear={onClear}
      />
      <Section
        title="Sex"
        filterKey="sex"
        options={SEXES.map((s) => ({ value: s, label: s }))}
        activeSet={filters.sex}
        onToggle={onToggle}
        onClear={onClear}
      />
      <Section
        title="Reporting organization"
        filterKey="affiliation"
        options={AFFILIATIONS.map((a) => ({ value: a, label: a }))}
        activeSet={filters.affiliation}
        onToggle={onToggle}
        onClear={onClear}
      />
      <Section
        title="Location confidence"
        filterKey="locationConfidence"
        options={LOCATION_CONFIDENCES.map((l) => ({
          value: l.value,
          label: l.label,
        }))}
        activeSet={filters.locationConfidence}
        onToggle={onToggle}
        onClear={onClear}
      />

      <div className="m-filter-divider" role="separator" />

      <div className="m-filter-layers">
        <div className="m-filter-layers-title">Map layers</div>
        <LayerRow
          label="Bathymetry"
          on={showBathymetry}
          onToggle={onToggleBathymetry}
        />
        <LayerRow
          label="Shipping lanes"
          on={showShippingLanes}
          onToggle={onToggleShippingLanes}
        />
        <LayerRow
          label="Shipping lanes (pre-2013)"
          on={showPre2013Lanes}
          onToggle={onTogglePre2013Lanes}
        />
      </div>
    </BottomSheet>
  );
}

function LayerRow({
  label,
  on,
  onToggle,
}: {
  label: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="m-layer-row">
      <span className="m-layer-label">{label}</span>
      <button
        type="button"
        className={`layer-switch ${on ? "on" : ""}`}
        onClick={onToggle}
        role="switch"
        aria-checked={on}
        aria-label={label}
      >
        <span className="layer-switch-thumb" aria-hidden="true" />
        <span className="layer-switch-text" aria-hidden="true">
          {on ? "ON" : "OFF"}
        </span>
      </button>
    </div>
  );
}
