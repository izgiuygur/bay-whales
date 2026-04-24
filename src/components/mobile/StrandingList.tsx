import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import type { WhaleRecord, SpeciesKey } from "../../types/whale";
import { SPECIES_COLORS } from "../../types/whale";
import StrandingCard from "./StrandingCard";

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function speciesFlashColor(species: string): string {
  if (species in SPECIES_COLORS) {
    return hexToRgba(SPECIES_COLORS[species as SpeciesKey].pin, 0.15);
  }
  return "rgba(74, 74, 74, 0.12)";
}

export interface StrandingListHandle {
  /** Scroll to a card by source record id and flash it briefly. */
  scrollToAndFlash: (recordId: string) => void;
}

interface Props {
  records: WhaleRecord[];
  onOpen: (record: WhaleRecord) => void;
}

const StrandingList = forwardRef<StrandingListHandle, Props>(
  function StrandingList({ records, onOpen }, ref) {
    const listRef = useRef<HTMLUListElement>(null);
    const [flashId, setFlashId] = useState<string | null>(null);
    const flashTimerRef = useRef<number | null>(null);

    // Sort newest first; memoized so flashing doesn't reshuffle.
    const ordered = useMemo(
      () =>
        [...records].sort((a, b) => {
          if (a.dateObserved && b.dateObserved) {
            return b.dateObserved.localeCompare(a.dateObserved);
          }
          return 0;
        }),
      [records]
    );

    useImperativeHandle(ref, () => ({
      scrollToAndFlash(recordId: string) {
        const target = listRef.current?.querySelector<HTMLElement>(
          `[data-record-id="${CSS.escape(recordId)}"]`
        );
        if (!target) return;
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        if (flashTimerRef.current) {
          window.clearTimeout(flashTimerRef.current);
        }
        setFlashId(recordId);
        flashTimerRef.current = window.setTimeout(() => {
          setFlashId(null);
        }, 700);
      },
    }));

    return (
      <ul className="m-list" ref={listRef}>
        {ordered.map((r) => (
          <li key={r.id} data-record-id={r.id} className="m-list-item">
            <StrandingCard
              record={r}
              onOpen={onOpen}
              flashSpeciesColor={
                flashId === r.id ? speciesFlashColor(r.species) : null
              }
            />
          </li>
        ))}
      </ul>
    );
  }
);

export default StrandingList;
