import { useCallback, useRef, useState } from "react";
import type { Filters, FilterKey } from "../types/filters";
import type { WhaleRecord } from "../types/whale";
import type { YearRange } from "../App";
import type { ShareableState } from "../lib/shareState";
import MobileHeader from "../components/mobile/MobileHeader";
import IntroStrip from "../components/mobile/IntroStrip";
import YearStrip from "../components/mobile/YearStrip";
import SpeciesStrip from "../components/mobile/SpeciesStrip";
import MiniMap from "../components/mobile/MiniMap";
import StrandingList, {
  type StrandingListHandle,
} from "../components/mobile/StrandingList";
import FilterSheet from "../components/mobile/FilterSheet";
import DetailSheet from "../components/mobile/DetailSheet";
import ExpandedMapModal from "../components/mobile/ExpandedMapModal";
import ShareButton from "../components/ShareButton";

interface Props {
  records: WhaleRecord[]; // filtered list
  totalRecords: number; // unfiltered total, for the intro copy
  years: { min: number; max: number };
  yearCounts: Record<number, number>;
  selectedRange: YearRange;
  onYearChange: (v: YearRange) => void;
  filters: Filters;
  onFilterToggle: (key: FilterKey, value: string | number) => void;
  onFilterClear: (key: FilterKey) => void;
  onFilterClearAll: () => void;
  onToggleSpeciesGroup: (group: string[], makeHidden: boolean) => void;
  showBathymetry: boolean;
  onToggleBathymetry: () => void;
  showShippingLanes: boolean;
  onToggleShippingLanes: () => void;
  showPre2013Lanes: boolean;
  onTogglePre2013Lanes: () => void;
  getShareState: () => ShareableState;
  initialPinId?: string | null;
}

export default function MobileLayout(props: Props) {
  const {
    records,
    totalRecords,
    years,
    yearCounts,
    selectedRange,
    onYearChange,
    filters,
    onFilterToggle,
    onFilterClear,
    onFilterClearAll,
    onToggleSpeciesGroup,
    showBathymetry,
    onToggleBathymetry,
    showShippingLanes,
    onToggleShippingLanes,
    showPre2013Lanes,
    onTogglePre2013Lanes,
    getShareState,
    initialPinId,
  } = props;

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expandedMapOpen, setExpandedMapOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState<WhaleRecord | null>(null);
  const listRef = useRef<StrandingListHandle>(null);

  // Open a record's detail card when passed in from the URL. One shot.
  const didApplyInitialPin = useRef(false);
  if (!didApplyInitialPin.current && initialPinId && records.length > 0) {
    const found = records.find((r) => r.id === initialPinId);
    if (found) {
      didApplyInitialPin.current = true;
      // Defer so the layout mounts first.
      setTimeout(() => setDetailRecord(found), 80);
    } else {
      didApplyInitialPin.current = true;
    }
  }

  const handleMiniPinTap = useCallback((recordId: string) => {
    listRef.current?.scrollToAndFlash(recordId);
  }, []);

  const handleToggleSpecies = useCallback(
    (species: string) => {
      onFilterToggle("species", species);
    },
    [onFilterToggle]
  );

  return (
    <div className="m-root">
      <MobileHeader
        filters={filters}
        onOpenFilters={() => setFiltersOpen(true)}
        shareButton={
          <ShareButton getState={getShareState} recordCount={records.length} />
        }
      />

      <IntroStrip shownCount={records.length} totalCount={totalRecords} />

      <YearStrip
        min={years.min}
        max={years.max}
        yearCounts={yearCounts}
        value={selectedRange}
        onChange={onYearChange}
      />

      <SpeciesStrip
        hidden={filters.species}
        onToggleSpecies={handleToggleSpecies}
        onToggleGroup={onToggleSpeciesGroup}
        onOpenFilters={() => setFiltersOpen(true)}
      />

      <MiniMap
        records={records}
        onPinTap={handleMiniPinTap}
        onExpand={() => setExpandedMapOpen(true)}
      />

      <StrandingList
        ref={listRef}
        records={records}
        onOpen={(r) => setDetailRecord(r)}
      />

      <footer className="m-footer">
        <div className="m-footer-sources">
          Data from{" "}
          <a
            href="https://www.fisheries.noaa.gov/"
            target="_blank"
            rel="noopener noreferrer"
          >
            NOAA Fisheries
          </a>
          ,{" "}
          <a
            href="https://www.marinemammalcenter.org/"
            target="_blank"
            rel="noopener noreferrer"
          >
            The Marine Mammal Center
          </a>
          , and{" "}
          <a
            href="https://www.calacademy.org/"
            target="_blank"
            rel="noopener noreferrer"
          >
            California Academy of Sciences
          </a>
          .
        </div>
        <div className="m-footer-credit">
          Designed and built by{" "}
          <a
            href="https://izgiuygur.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Izgi Uygur
          </a>
        </div>
      </footer>

      <FilterSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={filters}
        onToggle={onFilterToggle}
        onClear={onFilterClear}
        onClearAll={onFilterClearAll}
        showBathymetry={showBathymetry}
        onToggleBathymetry={onToggleBathymetry}
        showShippingLanes={showShippingLanes}
        onToggleShippingLanes={onToggleShippingLanes}
        showPre2013Lanes={showPre2013Lanes}
        onTogglePre2013Lanes={onTogglePre2013Lanes}
      />

      <DetailSheet
        record={detailRecord}
        onClose={() => setDetailRecord(null)}
      />

      <ExpandedMapModal
        open={expandedMapOpen}
        onClose={() => setExpandedMapOpen(false)}
        records={records}
        hiddenSpecies={filters.species}
        onToggleSpecies={handleToggleSpecies}
        onToggleGroup={onToggleSpeciesGroup}
        onPinTap={(r) => setDetailRecord(r)}
        showBathymetry={showBathymetry}
        onToggleBathymetry={onToggleBathymetry}
        showShippingLanes={showShippingLanes}
        onToggleShippingLanes={onToggleShippingLanes}
        showPre2013Lanes={showPre2013Lanes}
        onTogglePre2013Lanes={onTogglePre2013Lanes}
      />
    </div>
  );
}
