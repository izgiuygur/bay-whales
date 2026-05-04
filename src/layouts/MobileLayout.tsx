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
import PatternsRail from "../components/PatternsRail";
import PatternCaption from "../components/PatternCaption";
import type { PatternEntry } from "../data/patterns";

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
  onSetHiddenSpecies: (next: Set<string>) => void;
  showBathymetry: boolean;
  onToggleBathymetry: () => void;
  showShippingLanes: boolean;
  onToggleShippingLanes: () => void;
  showPre2013Lanes: boolean;
  onTogglePre2013Lanes: () => void;
  getShareState: () => ShareableState;
  initialPinId?: string | null;
  onAboutClick: () => void;
  // Patterns Rail integration
  activeStorySlug: string | null;
  activeStory: PatternEntry | null;
  onActivateStory: (slug: string) => void;
  onCloseStory: () => void;
  patternsNudge: boolean;
  onDismissPatternsNudge: () => void;
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
    onSetHiddenSpecies,
    showBathymetry,
    onToggleBathymetry,
    showShippingLanes,
    onToggleShippingLanes,
    showPre2013Lanes,
    onTogglePre2013Lanes,
    getShareState,
    initialPinId,
    onAboutClick,
    activeStorySlug,
    activeStory,
    onActivateStory,
    onCloseStory,
    patternsNudge,
    onDismissPatternsNudge,
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

  return (
    <div className={`m-root ${activeStory ? "m-root--story-mode" : ""}`}>
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
        onSetHidden={onSetHiddenSpecies}
        onOpenFilters={() => setFiltersOpen(true)}
      />

      <MiniMap
        records={records}
        onPinTap={handleMiniPinTap}
        onExpand={() => setExpandedMapOpen(true)}
        showPatternsAffordance={patternsNudge && !activeStorySlug}
      />

      {/* Patterns rail — sits between map and list, framed by both. */}
      <PatternsRail
        activeSlug={activeStorySlug}
        onActivate={onActivateStory}
        firstVisit={patternsNudge}
        onDismissNudge={onDismissPatternsNudge}
        variant="mobile"
      />

      {/* Below the rail, render exactly one of {caption, list} —
          when a story is open the caption takes the list's slot so
          there's a single coherent content area under the rail. */}
      {activeStory ? (
        <PatternCaption
          story={activeStory}
          onClose={onCloseStory}
          variant="mobile"
        />
      ) : (
        <StrandingList
          ref={listRef}
          records={records}
          onOpen={(r) => setDetailRecord(r)}
        />
      )}

      <footer className="m-footer">
        <div className="m-footer-sources">
          Data: West Coast Region Marine Mammal Stranding Network
          (WCR-MMSN), coordinated by NOAA Fisheries. Accessed April 7, 2026.{" "}
          <button
            type="button"
            className="m-footer-link"
            onClick={onAboutClick}
          >
            About the data
          </button>
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
        onSetHiddenSpecies={onSetHiddenSpecies}
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
        onSetHiddenSpecies={onSetHiddenSpecies}
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
