import type { WhaleRecord } from "../types/whale";

interface Props {
  record: WhaleRecord;
  position: { x: number; y: number };
  bgColor: string;
  fgColor?: string;
}

export default function MapTooltip({ record, position, bgColor, fgColor = "#333" }: Props) {
  const formatted = record.dateObserved
    ? new Date(record.dateObserved).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "Unknown date";

  return (
    <div
      className="map-tooltip"
      style={
        {
          left: position.x,
          top: position.y,
          background: bgColor,
          color: fgColor,
          "--tooltip-bg": bgColor,
        } as React.CSSProperties
      }
    >
      <span className="map-tooltip-species">{record.species}</span>
      <span className="map-tooltip-sep"> · </span>
      <span className="map-tooltip-date">{formatted}</span>
    </div>
  );
}
